// Turns the interests picked during onboarding (profile.interests) into a
// relevance score for places and themes, so the app can surface a personalized
// "For you" selection. Until now onboarding interests were collected but never
// used anywhere, this is what closes that loop.
import { Place, Theme } from '@/data/types';

// Each interest key (from INTERESTS in data/seed) maps to matcher predicates.
// A place/theme "matches" an interest if any of its predicates hit.
type Matchers = {
  // substrings tested (case-insensitive) against a place's category
  placeCategory?: string[];
  // K-content type values (seed places carry kContentType: Drama/KPop/Variety…)
  kType?: string[];
  // substrings tested against a theme's category / kContent
  themeCategory?: string[];
};

const INTEREST_MATCHERS: Record<string, Matchers> = {
  kdrama: { kType: ['drama'], themeCategory: ['k-content', 'k-drama'] },
  kpop: { kType: ['kpop', 'k-pop'], themeCategory: ['k-content', 'k-pop'] },
  kmovie: { kType: ['movie', 'drama'], themeCategory: ['k-content'] },
  kvariety: { kType: ['variety'], themeCategory: ['k-content', 'variety'] },
  kfood: { placeCategory: ['restaurant', 'noodle', 'naeng', 'market', 'street food', 'food'], themeCategory: ['street food', 'food'] },
  kbeauty: { placeCategory: ['shopping'], themeCategory: ['shopping'] },
  history: { placeCategory: ['attraction', 'culture', 'palace', 'hanok', 'historic'], themeCategory: ['culture'] },
  nature: { placeCategory: ['attraction', 'activity', 'nature', 'park'], themeCategory: [] },
  nightlife: { placeCategory: ['pub', 'hof', 'bar', 'jjimjil'], themeCategory: ['culture'] },
  shopping: { placeCategory: ['shopping', 'market'], themeCategory: ['shopping'] },
  cafe: { placeCategory: ['cafe', 'café'], themeCategory: [] },
  gaming: { placeCategory: ['activity'], themeCategory: [] },
};

function placeMatchesInterest(place: Place, interest: string): boolean {
  const m = INTEREST_MATCHERS[interest];
  if (!m) return false;
  const cat = place.category?.toLowerCase() ?? '';
  if (m.placeCategory?.some((s) => cat.includes(s))) return true;
  if (m.kType && place.kContentType) {
    const kt = place.kContentType.toLowerCase();
    if (m.kType.some((s) => kt.includes(s))) return true;
  }
  return false;
}

function themeMatchesInterest(theme: Theme, interest: string): boolean {
  const m = INTEREST_MATCHERS[interest];
  if (!m?.themeCategory?.length) return false;
  const hay = `${theme.category} ${theme.kContent ?? ''} ${theme.kType ?? ''}`.toLowerCase();
  return m.themeCategory.some((s) => hay.includes(s));
}

export function scorePlace(place: Place, interests: string[]): number {
  // +1 per matching interest; a small bonus for having a K-content connection
  // (the app's signature hook) so curated seed places surface above bulk imports.
  let score = interests.reduce((s, i) => s + (placeMatchesInterest(place, i) ? 1 : 0), 0);
  if (score > 0 && place.kContentTitle) score += 0.5;
  return score;
}

// Returns places ranked by relevance to the user's interests. Falls back to
// K-content-connected places when the user picked no interests (skipped onboarding).
export function personalizedPlaces(places: Place[], interests: string[], limit = 10): Place[] {
  if (!interests.length) {
    return places.filter((p) => p.kContentTitle).slice(0, limit);
  }
  return places
    .map((p) => ({ p, score: scorePlace(p, interests) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

// Learns which place categories a user tends to like/dislike from their real
// 👍/👎 reactions (place detail screen), so the day-plan scorer can favor
// categories they've shown they enjoy even for places they've never
// individually reacted to, not just remembering the exact places reacted to.
export function categoryAffinity(reactions: Record<string, 'like' | 'dislike'>, places: Place[]): Map<string, number> {
  const bySlug = new Map(places.map((p) => [p.slug, p]));
  const net = new Map<string, number>();
  const count = new Map<string, number>();
  for (const [slug, r] of Object.entries(reactions)) {
    const p = bySlug.get(slug);
    if (!p) continue;
    const delta = r === 'like' ? 1 : -1;
    net.set(p.category, (net.get(p.category) ?? 0) + delta);
    count.set(p.category, (count.get(p.category) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const [cat, sum] of net) {
    // Average signed reaction, scaled and clamped, a couple of reactions
    // nudge scoring without one category or one stray dislike dominating it.
    out.set(cat, Math.max(-1.5, Math.min(1.5, (sum / (count.get(cat) ?? 1)) * 1.5)));
  }
  return out;
}

export function personalizedThemes(themes: Theme[], interests: string[], limit = 6): Theme[] {
  if (!interests.length) return themes.slice(0, limit);
  const ranked = themes
    .map((t) => ({ t, score: interests.reduce((s, i) => s + (themeMatchesInterest(t, i) ? 1 : 0), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
  return ranked.length ? ranked.slice(0, limit) : themes.slice(0, limit);
}
