// Sending one piece of in-app feedback.
//
// Goes through the `submit-feedback` Edge Function rather than inserting
// directly: `feedback` has no insert policy at all, because browsing needs no
// account and neither should reporting a wrong opening time — and an anonymous
// insert policy would be an open write endpoint. The function rate-limits by
// IP and writes with the service role.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { supabase } from './supabase';

export type FeedbackKind = 'wrong' | 'confusing' | 'wish' | 'broken';

export const FEEDBACK_KINDS: { key: FeedbackKind; label: string; hint: string }[] = [
  { key: 'wrong', label: 'Something’s wrong', hint: 'A price, opening hours, a name, a closed place' },
  { key: 'confusing', label: 'Hard to use', hint: 'Something took longer to figure out than it should' },
  { key: 'wish', label: 'I wish it did…', hint: 'Something missing you went looking for' },
  { key: 'broken', label: 'Something broke', hint: 'It crashed, froze, or refused to load' },
];

// Version, OS and device, attached silently. The form never asks: people do
// not know their build number, and asking for it only costs completions — but
// "only on iOS 18" is exactly what makes a bug report actionable.
function deviceContext() {
  return {
    appVersion: Constants.expoConfig?.version ?? '',
    platform: Platform.OS,
    osVersion: String(Device.osVersion ?? ''),
    device: String(Device.modelName ?? ''),
  };
}

export async function sendFeedback(input: {
  kind: FeedbackKind;
  body: string;
  placeSlug?: string;
}): Promise<void> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  if (!base) throw new Error('Feedback is unavailable in this build.');

  // Pass the session token when there is one, so the sender can find their own
  // submissions later. Signed out is fine — the row is simply anonymous.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${base}/functions/v1/submit-feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      kind: input.kind,
      body: input.body,
      placeSlug: input.placeSlug,
      context: deviceContext(),
    }),
  });

  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok || json.error) {
    throw new Error(json.error ?? "Couldn't send that just now. Try again in a moment.");
  }
}
