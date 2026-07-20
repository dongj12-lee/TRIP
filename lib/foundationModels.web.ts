// Web has no Foundation Models framework at all — same no-op stub as the
// default (lib/foundationModels.ts). Kept as an explicit file (rather than
// relying on the bare .ts fallback alone) so a native-only package can never
// even be considered for the web bundle, belt-and-suspenders. Types are
// duplicated rather than re-exported from './foundationModels' — on web,
// that bare specifier resolves back to THIS file, not the default.
export type RefineCandidate = { slug: string; name: string; category: string; rating?: number; note?: string };
export type RefineContext = { vibe: string; interests: string[]; rainy?: boolean };

export function isFoundationModelsAvailable(): boolean {
  return false;
}

export async function refinePick(): Promise<string | null> {
  return null;
}
