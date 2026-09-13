// Supabase Edge Function: trip-intake
//
// The front half of trip planning: a traveller describes the trip they want in
// their own words ("foodie couple, love cafés and night markets, not big on
// palaces, relaxed pace") and this turns it into the structured *steer* the
// heuristic generator already understands, a vibe, an interest set, a pace and
// an avoid list.
//
// Same division of labour as trip-chat: the MODEL only interprets language into
// a fixed vocabulary; the APP owns the 4,000-place catalog and does the actual
// planning. The model never names a place. A wrong steer just produces a
// slightly off-taste but real, coherent trip the traveller can then nudge.
//
// Deploy (per project):
//   supabase functions deploy trip-intake --no-verify-jwt --project-ref <REF>
//   (reuses the OPENAI_API_KEY secret already set for trip-chat)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const MODEL = 'gpt-5.6-luna';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};

// The app's fixed vocabularies. These MUST match the client:
//   VibeKey        (lib/dayPlan.ts)
//   interest keys  (INTERESTS in data/seed.ts)
//   pace / avoid   (lib/tripIntake.ts)
const VIBES = ['classic', 'foodie', 'kcontent', 'shopping', 'nature', ''];
const INTERESTS = ['kdrama', 'kpop', 'kmovie', 'kvariety', 'kfood', 'kbeauty', 'history', 'nature', 'nightlife', 'shopping', 'cafe', 'gaming'];
const PACE = ['relaxed', 'balanced', 'packed', ''];
const AVOID = ['history', 'shopping', 'markets', 'nature', 'nightlife', 'cafes', 'museums', 'kcontent'];

const SCHEMA = {
  type: 'object',
  properties: {
    vibe: {
      type: 'string',
      enum: VIBES,
      description:
        "The single best-fit overall vibe for the trip. classic=palaces/history, foodie=food & markets, kcontent=K-pop/drama/film, shopping=malls & fashion, nature=parks/views. Empty string if the description gives no clear lead.",
    },
    interests: {
      type: 'array',
      items: { type: 'string', enum: INTERESTS },
      description:
        'Every interest the description clearly signals, from the fixed list. e.g. "cafés and street food" -> ["cafe","kfood"]. Empty array if none are clear.',
    },
    pace: {
      type: 'string',
      enum: PACE,
      description:
        'relaxed = few stops, lots of downtime; balanced = a normal full day; packed = see as much as possible. Empty string if not mentioned (the app treats that as balanced).',
    },
    avoid: {
      type: 'array',
      items: { type: 'string', enum: AVOID },
      description:
        'Things the traveller explicitly wants LESS of or to skip. e.g. "not into shopping" -> ["shopping"]. Only include an explicit dislike, never guess. Empty array if none.',
    },
    summary: {
      type: 'string',
      description:
        'A very short, friendly tag line of what you understood, shown back to the traveller. e.g. "Foodie trip, relaxed pace, light on shopping". No more than ~8 words. Never empty.',
    },
  },
  required: ['vibe', 'interests', 'pace', 'avoid', 'summary'],
  additionalProperties: false,
};

const SYSTEM = `You are the trip-setup assistant inside BADA, a Seoul travel app for foreign visitors. The traveller describes, in their own words, the kind of Seoul trip they want. Turn it into a structured steer the app's planner understands.

You do NOT plan the trip or name places. You only map the description onto the app's fixed vocabulary of vibe, interests, pace and avoid.

Rules:
- Use ONLY the allowed values. Never invent interest keys, vibes or avoid tags.
- Pick the single best-fit \`vibe\`. If they mention several things, choose the dominant one and let \`interests\` capture the rest.
- \`interests\` is inclusive: list everything clearly signalled. \`avoid\` is exclusive and literal: only list things they say they dislike or want to skip.
- Do not put the same theme in both interests and avoid.
- Infer \`pace\` only from words about speed/energy ("chill", "cram it all in", "not too rushed"). If unstated, return "".
- \`summary\` is a short human-readable echo of what you understood, written to the traveller.
- If the message is empty or unrelated to trip taste, return empty vibe, empty arrays, pace "", and a summary like "Balanced trip across Seoul's highlights".`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!API_KEY) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), { status: 500, headers: CORS });
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS });

    const body = await req.json();
    const message: string = String(body.message ?? '').trim().slice(0, 800);
    // deno-lint-ignore no-explicit-any
    const already = Array.isArray(body.interests) ? (body.interests as any[]).map(String).slice(0, 12) : [];
    if (!message) return new Response(JSON.stringify({ error: 'missing message' }), { status: 400, headers: CORS });

    const messages = [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content:
          (already.length ? `The traveller earlier picked these interests: ${already.join(', ')}.\n\n` : '') +
          `Their description: ${message}`,
      },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages,
        response_format: { type: 'json_schema', json_schema: { name: 'trip_steer', strict: true, schema: SCHEMA } },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: `OpenAI ${res.status}`, detail: detail.slice(0, 500) }), { status: 502, headers: CORS });
    }

    const json = await res.json();
    const choice = json.choices?.[0]?.message ?? {};
    if (choice.refusal) {
      return new Response(JSON.stringify({ vibe: '', interests: [], pace: '', avoid: [], summary: "Balanced trip across Seoul's highlights" }), { headers: CORS });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(choice.content ?? '');
    } catch {
      return new Response(JSON.stringify({ error: 'model returned non-JSON' }), { status: 502, headers: CORS });
    }
    return new Response(JSON.stringify(parsed), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 502, headers: CORS });
  }
});
