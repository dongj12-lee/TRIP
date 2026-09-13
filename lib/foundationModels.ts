// On-device Plan-my-day refinement via Apple's Foundation Models framework
// (iOS 26+, Apple Intelligence-eligible devices only), see lib/foundationModels.ios.ts
// for the real implementation. This file is the fallback Metro resolves for
// every OTHER platform (Android, and any native target without an .ios.ts
// override), same convention as components/WebMap.tsx/.web.tsx: a place a
// user's on-device model couldn't confidently pick from, we simply keep the
// heuristic pick from lib/dayPlan.ts untouched.
export type RefineCandidate = { slug: string; name: string; category: string; rating?: number; note?: string };
export type RefineContext = { vibe: string; interests: string[]; rainy?: boolean };

export function isFoundationModelsAvailable(): boolean {
  return false;
}

export async function refinePick(_candidates: RefineCandidate[], _context: RefineContext): Promise<string | null> {
  return null;
}
