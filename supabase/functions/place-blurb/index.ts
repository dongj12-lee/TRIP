// Supabase Edge Function: place-blurb
//
// One-off backfill helper, not called by the app at runtime. Writes
// places.blurb_ai (migration-027): a short, human-readable one-line summary
// for the place card in the trip planner, where the previous approach —
// lifting the opening sentence(s) of the raw catalog description — read
// unevenly (some sources open with a flat definition, "X is a market in
// Jung-gu", not a reason to actually go).
//
// Batches N places per request (bodies stay well under context limits and
// this cuts round trips ~20x versus one call per place) and returns exactly
// one blurb per slug it was given, so the caller (scripts/backfill-place-
// blurb.ts) can match results back up without guessing at order.
//
// Reuses the OPENAI_API_KEY secret already set for trip-intake/trip-chat —
// same provider, same account, no new credential.
//
// Deploy (per project):
//   supabase functions deploy place-blurb --no-verify-jwt --project-ref <REF>
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const MODEL = 'gpt-5.6-luna';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};

const MAX_ITEMS = 25;

type InPlace = { slug: string; name: string; category: string; description: string };

const SYSTEM = `You write one-line summaries for place cards in BADA, a Seoul travel app for foreign visitors.

For each place, write ONE sentence (aim 80-130 characters) giving the single most useful, concrete reason to go: a signature dish, what makes it distinct from similar places, or its real historical/cultural hook.

Rules:
- Pull from the given description. Never invent a fact that isn't in it.
- Prefer a specific, checkable detail (a dish name, a date, a number) over vague praise.
- Never open by restating the place's name ("X is a...") — the name is already shown next to this line.
- No marketing language: never "must-visit", "hidden gem", "perfect for", "don't miss".
- If the description is too thin to support a real detail, write a plain, honest one-liner from what's there rather than padding it.
- Return exactly one item per slug you were given, in any order, each blurb non-empty.`;

function schema(slugs: string[]) {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        minItems: slugs.length,
        maxItems: slugs.length,
        items: {
          type: 'object',
          properties: {
            slug: { type: 'string', enum: slugs },
            blurb: { type: 'string', description: 'One sentence, ~80-130 characters.' },
          },
          required: ['slug', 'blurb'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!API_KEY) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), { status: 500, headers: CORS });
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS });

    const body = await req.json();
    const places = Array.isArray(body.places) ? (body.places as InPlace[]) : [];
    if (!places.length) return new Response(JSON.stringify({ error: 'missing places' }), { status: 400, headers: CORS });
    if (places.length > MAX_ITEMS) {
      return new Response(JSON.stringify({ error: `max ${MAX_ITEMS} places per request, got ${places.length}` }), { status: 400, headers: CORS });
    }

    const slugs = places.map((p) => p.slug);
    const userContent = places
      .map((p, i) => `${i + 1}. slug: ${p.slug}\n   name: ${p.name}\n   category: ${p.category}\n   description: ${p.description.slice(0, 1200)}`)
      .join('\n\n');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'place_blurbs', strict: true, schema: schema(slugs) } },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: `OpenAI ${res.status}`, detail: detail.slice(0, 500) }), { status: 502, headers: CORS });
    }

    const json = await res.json();
    const choice = json.choices?.[0]?.message ?? {};
    let parsed: { items?: { slug: string; blurb: string }[] };
    try {
      parsed = JSON.parse(choice.content ?? '');
    } catch {
      return new Response(JSON.stringify({ error: 'model returned non-JSON' }), { status: 502, headers: CORS });
    }
    return new Response(JSON.stringify({ items: parsed.items ?? [] }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 502, headers: CORS });
  }
});
