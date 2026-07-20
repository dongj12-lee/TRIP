// Real Apple Foundation Models implementation (iOS 26+, Apple Intelligence
// devices only — @react-native-ai/apple's isAvailable() returns false on
// anything older/ineligible, which we treat identically to "not on iOS" at
// the call site). Native module, so this file only ever loads on iOS —
// Metro resolves the .ios suffix before this bare-name import is reached on
// any other platform (see lib/foundationModels.ts / .web.ts).
//
// IMPORTANT: @react-native-ai/apple's own modules call
// TurboModuleRegistry.getEnforcing(...) at import time, which THROWS
// synchronously if the native module isn't linked — true both in Expo Go
// (which can never load it at all) and in a dev-client build that hasn't
// been rebuilt yet after this dependency was added. A static top-level
// `import { apple } from '@react-native-ai/apple'` would therefore crash
// the whole app on load, not just gracefully no-op — this file is reachable
// from DayPlanSheet.tsx, which is part of the main bundle. So the package is
// loaded lazily via require(), inside try/catch, only when actually called.
//
// PCC (Private Cloud Compute) involvement, if any, is entirely automatic and
// invisible at this API surface — Apple's SystemLanguageModel decides
// on-device vs PCC internally; there is no parameter here to request or
// detect it (confirmed against Apple's docs, not assumed).
import { generateObject } from 'ai';
import { z } from 'zod';

export type RefineCandidate = { slug: string; name: string; category: string; rating?: number; note?: string };
export type RefineContext = { vibe: string; interests: string[]; rainy?: boolean };

function loadAppleProvider(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-ai/apple').apple;
  } catch {
    return null; // package not linked yet (Expo Go, or a dev client built before this dependency was added)
  }
}

export function isFoundationModelsAvailable(): boolean {
  const apple = loadAppleProvider();
  if (!apple) return false;
  try {
    return apple.isAvailable();
  } catch {
    return false;
  }
}

// Picks among a SHORT list of already-heuristically-strong candidates for one
// ambiguous day-plan slot — never an open-ended search over the whole
// catalog. Returns null (never throws) on unavailability, an invalid model
// response, or any error, so a refinement failure always just leaves
// lib/dayPlan.ts's heuristic pick untouched.
export async function refinePick(candidates: RefineCandidate[], context: RefineContext): Promise<string | null> {
  if (candidates.length < 2) return null;
  const apple = loadAppleProvider();
  if (!apple) return null;
  try {
    if (!apple.isAvailable()) return null;
    const slugs = candidates.map((c) => c.slug) as [string, ...string[]];
    const schema = z.object({ pickSlug: z.enum(slugs) });
    const list = candidates
      .map((c) => `- ${c.slug}: ${c.name} (${c.category}${c.rating != null ? `, ${c.rating}★` : ''}${c.note ? `, ${c.note}` : ''})`)
      .join('\n');
    const prompt =
      `A traveler in Seoul wants a "${context.vibe}" day` +
      `${context.interests.length ? `, interested in ${context.interests.join(', ')}` : ''}` +
      `${context.rainy ? ', on a rainy day' : ''}. ` +
      `Pick the single best stop for this part of the day from:\n${list}`;
    const { object } = await generateObject({ model: apple(), schema, prompt });
    return object.pickSlug;
  } catch {
    return null;
  }
}
