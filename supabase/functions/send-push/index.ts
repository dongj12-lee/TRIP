// Supabase Edge Function: send-push
// Receives { token, title, body, data } (from the DB triggers in
// migration-003-push.sql via pg_net) and forwards it to Expo's push service.
//
// Deploy:
//   supabase functions deploy send-push --no-verify-jwt
// (--no-verify-jwt because it's called server-to-server from pg_net with the
//  service-role bearer; the function trusts that internal caller.)
//
// Test manually:
//   curl -X POST https://YOUR-REF.functions.supabase.co/send-push \
//     -H "Content-Type: application/json" \
//     -d '{"token":"ExponentPushToken[xxx]","title":"Hi","body":"Test"}'

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

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
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!isInternalCaller(req)) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  let payload: { token?: string; title?: string; body?: string; data?: unknown };
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { token, title, body, data } = payload;
  if (!token || !token.startsWith('ExponentPushToken')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Expo push token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const message = {
    to: token,
    sound: 'default',
    title: title ?? 'TRIP',
    body: body ?? '',
    data: data ?? {},
  };

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  const result = await res.json();
  return new Response(JSON.stringify(result), {
    status: res.ok ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
});
