// Supabase Edge Function: submit-feedback
// Receives one piece of in-app feedback and writes it to public.feedback.
//
// Deploy:
//   supabase functions deploy submit-feedback --no-verify-jwt --project-ref <REF>
//
// Why a function rather than a direct insert: browsing BADA needs no account,
// so feedback must not either — requiring a sign-in to report wrong opening
// hours would lose most of the reports worth having. But an anonymous INSERT
// policy is an open write endpoint, and RLS governs who may write, never how
// often. So `feedback` has no insert policy at all; this is the only way in,
// it rate-limits by IP first, and it writes with the service role.
//
// If the caller happens to be signed in, their Authorization header carries a
// user token — we resolve it to a user id so the sender can see their own
// submissions later. A bad or absent token is not an error; it just means the
// row is anonymous.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY =
  Deno.env.get('INTERNAL_CALLER_TOKEN') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const KINDS = new Set(['wrong', 'confusing', 'wish', 'broken']);

// Per-IP cap. In-memory, so it resets when the instance goes cold and counts
// per instance — a speed bump against a script, not a wall. Generous enough
// that nobody reporting several stale opening times in a row ever meets it.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 10;
const HITS = new Map<string, number[]>();
function rateLimited(req: Request): boolean {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  if (HITS.size > 5000) HITS.clear();
  HITS.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

// Resolve a caller's user id, if they are signed in. Anonymous is fine.
async function callerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  // The app sends the anon key when signed out; that is not a user token.
  if (!token || token === Deno.env.get('SUPABASE_ANON_KEY')) return null;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data } = await sb.auth.getUser(token);
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS });
  }
  if (rateLimited(req)) {
    return new Response(
      JSON.stringify({ error: "Thanks — that's a few in a row. Try again in a little while." }),
      { status: 429, headers: CORS },
    );
  }

  let payload: { kind?: string; body?: string; placeSlug?: string; context?: unknown };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS });
  }

  const kind = String(payload.kind ?? '');
  const body = String(payload.body ?? '').trim().slice(0, 4000);
  if (!KINDS.has(kind)) {
    return new Response(JSON.stringify({ error: 'Unknown kind' }), { status: 400, headers: CORS });
  }
  if (!body) {
    return new Response(JSON.stringify({ error: 'Tell us what happened' }), { status: 400, headers: CORS });
  }

  const placeSlug = payload.placeSlug ? String(payload.placeSlug).slice(0, 200) : null;
  // Whitelist what the client may stamp on a row, so this cannot become an
  // arbitrary key/value store written by anyone on the internet.
  const ctxIn = (payload.context ?? {}) as Record<string, unknown>;
  const context = {
    appVersion: String(ctxIn.appVersion ?? '').slice(0, 40),
    platform: String(ctxIn.platform ?? '').slice(0, 20),
    osVersion: String(ctxIn.osVersion ?? '').slice(0, 40),
    device: String(ctxIn.device ?? '').slice(0, 60),
  };

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const userId = await callerUserId(req);
    const { error } = await sb
      .from('feedback')
      .insert({ user_id: userId, kind, body, place_slug: placeSlug, context });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  } catch (e) {
    console.error('submit-feedback failed', e);
    return new Response(
      JSON.stringify({ error: "Couldn't send that just now. Try again in a moment." }),
      { status: 502, headers: CORS },
    );
  }
});
