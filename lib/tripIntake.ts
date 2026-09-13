// The client half of the natural-language trip setup. The traveller describes
// their ideal trip; the `trip-intake` Edge Function maps it onto the planner's
// fixed vocabulary (see supabase/functions/trip-intake). The result is a
// `TripSteer` that feeds straight into generateTripPlan, so language shapes the
// whole itinerary, not just after-the-fact edits.
import { VibeKey } from './dayPlan';

export type Pace = 'relaxed' | 'balanced' | 'packed';
// Categories the planner can down-weight when the traveller says "skip X".
export type AvoidTag = 'history' | 'shopping' | 'markets' | 'nature' | 'nightlife' | 'cafes' | 'museums' | 'kcontent';

export type TripSteer = {
  vibe: VibeKey | null;
  interests: string[]; // INTEREST keys (data/seed.ts)
  pace: Pace | null;
  avoid: AvoidTag[];
  summary: string; // short echo shown back to the traveller
};

const VIBE_KEYS = new Set<VibeKey>(['classic', 'foodie', 'kcontent', 'shopping', 'nature']);
const PACES = new Set<Pace>(['relaxed', 'balanced', 'packed']);
const AVOIDS = new Set<AvoidTag>(['history', 'shopping', 'markets', 'nature', 'nightlife', 'cafes', 'museums', 'kcontent']);

/**
 * Ask the model to turn a free-text trip description into a TripSteer.
 * Throws on transport/model failure; the caller keeps the manual controls as a
 * fallback so a failed intake never blocks planning.
 */
export async function fetchTripSteer(message: string, interests: string[] = []): Promise<TripSteer> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const res = await fetch(`${base}/functions/v1/trip-intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, interests }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok || json.error) throw new Error(json.error ?? `trip-intake ${res.status}`);

  // Defensive: trust the schema, but never let an unexpected value reach the
  // generator's typed inputs.
  const vibe = typeof json.vibe === 'string' && VIBE_KEYS.has(json.vibe as VibeKey) ? (json.vibe as VibeKey) : null;
  const pace = typeof json.pace === 'string' && PACES.has(json.pace as Pace) ? (json.pace as Pace) : null;
  const interestsOut = Array.isArray(json.interests) ? json.interests.map(String).filter(Boolean) : [];
  const avoid = Array.isArray(json.avoid) ? (json.avoid.map(String).filter((a) => AVOIDS.has(a as AvoidTag)) as AvoidTag[]) : [];
  const summary = typeof json.summary === 'string' && json.summary.trim() ? json.summary.trim() : "Balanced trip across Seoul's highlights";

  return { vibe, interests: interestsOut, pace, avoid, summary };
}
