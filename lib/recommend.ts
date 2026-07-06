import { Place, Post } from '@/data/types';

// "Recommended" = places other travelers actually endorsed, ranked by:
//   • likes (minus dislikes) — the community satisfaction signal, and
//   • how often the place shows up in shared travel routes.
// Before that signal exists (cold start), a light prior keeps the rail sensible
// — photo'd, foreigner-friendly attractions/culture float up — and real
// community data overrides it as it accrues.
export function recommendedPlaces(places: Place[], posts: Post[], n = 12): Place[] {
  // How many shared routes include each place.
  const routeFreq = new Map<string, number>();
  for (const post of posts) {
    if (post.type !== 'route' || !post.routeDays) continue;
    const seen = new Set<string>();
    for (const day of post.routeDays) {
      for (const stop of day.stops) {
        if (stop.slug && !seen.has(stop.slug)) {
          seen.add(stop.slug);
          routeFreq.set(stop.slug, (routeFreq.get(stop.slug) ?? 0) + 1);
        }
      }
    }
  }

  const prior = (p: Place) =>
    (p.category === 'History' || p.category === 'Culture' || p.category === 'Nature' ? 1 : 0) +
    (p.freeEntry ? 0.5 : 0) +
    (p.englishSite ? 0.3 : 0) +
    (p.photoUrl ? 0.2 : 0);

  return places
    .map((p) => ({
      p,
      // Community signal dominates; prior only breaks ties before it exists.
      score: (p.likeCount ?? 0) * 3 + (routeFreq.get(p.slug) ?? 0) * 4 - (p.dislikeCount ?? 0) * 2 + prior(p),
    }))
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .slice(0, n)
    .map((s) => s.p);
}
