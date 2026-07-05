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

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
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
