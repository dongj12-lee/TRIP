// Supabase Edge Function: place-fit
//
// One-off backfill helper, not called by the app at runtime. Judges the three
// Foreigner-Fit facts that genuinely vary place-to-place and can't be inferred
// from category alone — soloOk, englishMenu, englishSpoken — from each place's
// own catalog description. (cardOk and priceTransparent are handled separately
// by mechanical category rules in the backfill script itself: Korea's near-
// universal card acceptance and legally-required price posting are general
// facts, not per-place judgment calls.)
//
// Every one of these three columns was sitting at `false` for all 4,002
// places — not "unknown", literally false — which meant the Explore filters
// for them always returned zero results. This only ever promotes a field to
// `true`, on real evidence in the description; it defaults to false (i.e.
// leaves it alone) whenever the description doesn't say enough, exactly the
// "leave it blank if you can't tell" instruction this was built to follow.
//
// Reuses the OPENAI_API_KEY secret already set for trip-intake/trip-chat/
// place-blurb — same provider, same account, no new credential.
//
// Deploy (per project):
//   supabase functions deploy place-fit --no-verify-jwt --project-ref <REF>
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const MODEL = 'gpt-5.6-luna';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};

const MAX_ITEMS = 25;

type InPlace = { slug: string; name: string; category: string; categoryL2: string; description: string };

const SYSTEM = `You are fact-checking three specific claims about places in BADA, a Seoul travel app for foreign visitors, from each place's own catalog description.

For each place, decide true/false for:
- soloOk: comfortable to visit or dine alone. Only mark true for restaurants/cafes if the format is clearly single-diner-friendly (counter seating, single-portion menu, casual/fast format). Mark false (not true) for formats that traditionally need a group, most importantly Korean BBQ/grill-your-own-meat restaurants, hot pot, and anything the description implies is sized or priced per group. For non-dining places (sights, experiences), true unless the description implies a group-only activity.
- englishMenu: the description explicitly says or clearly implies an English menu, English signage of the menu, or the venue is described as set up for English-speaking visitors specifically. Food/drink places only — always false for anything that isn't a restaurant, cafe, or bar.
- englishSpoken: the description explicitly says or implies staff can communicate in English (e.g. "English-speaking guides", "international visitors welcome" with supporting detail, an official tourism-board write-up in fluent English aimed at foreign visitors with concrete visitor-facing detail).

Rules:
- Only mark true when the description actually supports it. A generic, thin, or purely historical/geographic description with no visitor-facing detail means false on all three — do not guess from the place's name or category alone.
- Being wrong in the false direction is fine (the app just won't advertise the perk). Being wrong in the true direction sends a real traveler in with the wrong expectation, so default to false whenever you're not confident.
- Return exactly one item per slug you were given, in any order.`;

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
            soloOk: { type: 'boolean' },
            englishMenu: { type: 'boolean' },
            englishSpoken: { type: 'boolean' },
          },
          required: ['slug', 'soloOk', 'englishMenu', 'englishSpoken'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  };
}

// ─── Internal-only guard ────────────────────────────────────────────────
// Deployed with --no-verify-jwt, which means Supabase does not check the
// caller at all — and the function name, the project URL and the anon key are
// all extractable from the shipped IPA (`unzip` the .ipa, `strings` the JS
// bundle), so "nobody knows the endpoint" was never true. Making the repo
// private would not change that either.
//
// This endpoint is only ever called server-side, and that caller already
// sends the service-role key as its bearer — the function simply wasn't
// looking at it. Now it does. Compared in constant time so the check cannot
// be probed a character at a time.
// Supabase injects SUPABASE_SERVICE_ROLE_KEY, but as the *new* short API key
// format (41 chars), while the two callers that need in — the pg_net trigger
// in migration-003 and the backfill scripts — both hold the legacy 219-char
// service-role JWT. Comparing against the injected value alone rejected every
// legitimate caller. Accept either, so this keeps working whichever key format
// a caller carries.
const ACCEPTED = [
  Deno.env.get('INTERNAL_CALLER_TOKEN') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
].filter((v) => v.length > 20);

function isInternalCaller(req: Request): boolean {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  return ACCEPTED.some((key) => {
    if (key.length !== token.length) return false;
    let diff = 0;
    for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ token.charCodeAt(i);
    return diff === 0;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!API_KEY) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), { status: 500, headers: CORS });
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS });
    if (!isInternalCaller(req)) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 401, headers: CORS });
    }

    const body = await req.json();
    const places = Array.isArray(body.places) ? (body.places as InPlace[]) : [];
    if (!places.length) return new Response(JSON.stringify({ error: 'missing places' }), { status: 400, headers: CORS });
    if (places.length > MAX_ITEMS) {
      return new Response(JSON.stringify({ error: `max ${MAX_ITEMS} places per request, got ${places.length}` }), { status: 400, headers: CORS });
    }

    const slugs = places.map((p) => p.slug);
    const userContent = places
      .map(
        (p, i) =>
          `${i + 1}. slug: ${p.slug}\n   name: ${p.name}\n   category: ${p.category}${p.categoryL2 ? ` (${p.categoryL2})` : ''}\n   description: ${p.description.slice(0, 1200)}`,
      )
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
        response_format: { type: 'json_schema', json_schema: { name: 'place_fit', strict: true, schema: schema(slugs) } },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: `OpenAI ${res.status}`, detail: detail.slice(0, 500) }), { status: 502, headers: CORS });
    }

    const json = await res.json();
    const choice = json.choices?.[0]?.message ?? {};
    let parsed: { items?: { slug: string; soloOk: boolean; englishMenu: boolean; englishSpoken: boolean }[] };
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
