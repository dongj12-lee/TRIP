// Supabase Edge Function: trip-chat
//
// The chat box at the bottom of the trip planner. The user types "day 2 lunch
// looks too heavy, something lighter" and this turns it into structured edit
// operations the app applies with lib/tripEdit.ts.
//
// The division of labour is the whole design:
//   - The MODEL only does language understanding. It reads a compact summary
//     of the current trip and returns which stop to touch and a plain-English
//     criterion for the replacement.
//   - The APP picks the actual place. It has the 4,000-place catalog, the
//     prominence tiers, the geography constraints and the same-slot rules —
//     none of which fit in a prompt, and all of which the model would happily
//     hallucinate around. The model never names a replacement place.
//
// So a wrong model answer degrades to "swapped for a slightly off-target but
// real, nearby, correctly-tiered place", never to "sent the user to a
// restaurant that doesn't exist".
//
// The API key stays server-side — the same reason naver-search exists. Do NOT
// ship an OpenAI key in the app bundle.
//
// Deploy (per project):
//   supabase functions deploy trip-chat --no-verify-jwt --project-ref <REF>
//   supabase secrets set OPENAI_API_KEY=<key> --project-ref <REF>
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
// Cost-tier model: this is constrained extraction (point at a stop, phrase a
// criterion), not open reasoning, and the app's own resolution bounds how much
// the model's judgement can matter. Raise to gpt-5.6-terra if op selection
// turns out to be noisy in practice.
const MODEL = 'gpt-5.6-luna';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};

// One flat operation shape rather than a discriminated union: strict JSON
// schema handles `anyOf` poorly, and the client ignores the fields that don't
// apply to a given `op`. Unset numbers are -1, unset strings are "".
const OPERATION_SCHEMA = {
  type: 'object',
  properties: {
    op: {
      type: 'string',
      enum: ['replace', 'remove', 'add', 'regenerate_day', 'set_vibe', 'none'],
      description:
        'replace = swap one stop for something matching `criterion`. remove = delete one stop. add = insert a NEW stop matching `criterion` into a day (no slug). regenerate_day = rebuild a whole day. set_vibe = change the trip vibe and rebuild. none = nothing to change, just reply.',
    },
    dayIndex: {
      type: 'integer',
      description: '0-based day the operation applies to. -1 if not applicable.',
    },
    slug: {
      type: 'string',
      description:
        'The exact slug of the stop being replaced or removed, copied from the trip summary. Empty string for `add` and when not applicable. NEVER invent a slug.',
    },
    criterion: {
      type: 'string',
      description:
        'For `replace` and `add`: a short plain-English description of what the traveller wants, e.g. "a light noodle place", "an indoor museum", "a dessert café". The app resolves this against its own place catalog. Empty string otherwise.',
    },
    vibe: {
      type: 'string',
      enum: ['classic', 'foodie', 'kcontent', 'shopping', 'nature', ''],
      description: 'For `set_vibe` only. Empty string otherwise.',
    },
  },
  required: ['op', 'dayIndex', 'slug', 'criterion', 'vibe'],
  additionalProperties: false,
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description:
        'One or two friendly sentences to show the traveller, describing what you changed. No markdown, no lists.',
    },
    operations: {
      type: 'array',
      description: 'The edits to apply, in order. Empty if the user only asked a question.',
      items: OPERATION_SCHEMA,
    },
  },
  required: ['reply', 'operations'],
  additionalProperties: false,
};

const SYSTEM = `You are the itinerary assistant inside BADA, a Seoul travel app. A traveller is looking at a generated multi-day trip and wants to adjust it.

You do NOT choose places. The app holds the full place catalog and all the routing rules; you only interpret what the traveller wants and express it as operations.

Rules:
- Only ever use slugs that appear verbatim in the trip summary. Never invent one.
- For a replacement, put the traveller's intent in \`criterion\` as a short phrase ("somewhere quieter", "spicy Korean food", "indoor, it's raining"). Do not name a specific restaurant or attraction.
- If the request is vague about which stop ("lunch is too heavy") but the summary makes it unambiguous, resolve it yourself. If genuinely ambiguous, return no operations and ask one short clarifying question in \`reply\`.
- Use \`add\` when they want an EXTRA stop without removing one ("add a dessert place to day 1", "squeeze in a museum on day 2"). Put the kind of place in \`criterion\`, leave \`slug\` empty, and set \`dayIndex\`. Use \`replace\` (not add+remove) when they want to swap one stop for another.
- Prefer the smallest operation that satisfies the request. Use \`regenerate_day\` only when they want a whole day redone ("day 2 is boring, redo it"), not when one stop is the problem. Use \`set_vibe\` only when they describe the whole trip's character ("make the whole thing more about food") — it rebuilds every day and discards their earlier tweaks, so never reach for it to fix one stop.
- If they ask a question about the trip rather than requesting a change, return no operations and answer in \`reply\`.
- \`reply\` speaks to the traveller directly, past tense for changes you made ("Swapped day 2's lunch for something lighter."). Keep it to one or two sentences.`;

// ─── Per-IP rate limit ──────────────────────────────────────────────────
// This one is reachable from the app without a login (guests plan trips too),
// so it cannot be locked to a caller — but every request spends real money at
// OpenAI, and the endpoint is discoverable from the shipped binary. Input
// sizes are already capped below; this caps how often.
//
// In-memory, so it resets when the instance goes cold and is enforced per
// instance rather than globally. That makes it a speed bump, not a wall: the
// hard ceiling has to be a spend limit on the OpenAI account itself.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const HITS = new Map<string, number[]>();
function rateLimited(req: Request): boolean {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  if (HITS.size > 5000) HITS.clear(); // bound memory on a long-lived instance
  HITS.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (rateLimited(req)) {
    return new Response(JSON.stringify({ error: 'Too many requests, give it a minute.' }), { status: 429, headers: CORS });
  }
  try {
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), { status: 500, headers: CORS });
    }
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS });
    }

    const body = await req.json();
    const tripSummary: string = String(body.tripSummary ?? '').slice(0, 8000);
    // Prior turns so follow-ups like "the other one then" work.
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const message: string = String(body.message ?? '').trim().slice(0, 1000);
    if (!message) return new Response(JSON.stringify({ error: 'missing message' }), { status: 400, headers: CORS });

    const messages = [
      { role: 'system', content: SYSTEM },
      ...history
        .filter((m: unknown) => m && typeof m === 'object')
        // deno-lint-ignore no-explicit-any
        .map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content ?? '').slice(0, 1000),
        }))
        // deno-lint-ignore no-explicit-any
        .filter((m: any) => m.content.length > 0),
      {
        role: 'user',
        content: `Here is the traveller's current trip:\n\n${tripSummary}\n\nTheir message: ${message}`,
      },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        // strict:true guarantees the shape, which is what lets the client
        // trust `operations` without defensive parsing per field. It requires
        // additionalProperties:false and every property listed in `required`
        // on every object — hence the flat op shape with "" / -1 sentinels
        // instead of a discriminated union.
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'trip_edit', strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: `OpenAI ${res.status}`, detail: detail.slice(0, 500) }), {
        status: 502,
        headers: CORS,
      });
    }

    const json = await res.json();
    const choice = json.choices?.[0]?.message ?? {};
    if (choice.refusal) {
      return new Response(
        JSON.stringify({ reply: "Sorry, I can't help with that one. Try asking about your itinerary.", operations: [] }),
        { headers: CORS },
      );
    }
    const text = choice.content ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: 'model returned non-JSON' }), { status: 502, headers: CORS });
    }
    return new Response(JSON.stringify(parsed), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 502, headers: CORS });
  }
});
