// "Suggest a stop" engine for the trip planner. Pure algorithmic scoring —
// instant, free, deterministic. Designed so a future LLM layer can sit on top
// later (e.g. turning the `reason` strings into a natural-language blurb, or
// re-ranking these candidates) without changing how suggestions are sourced.
//
// Three signals, combined:
//  1. Interest match (reuses lib/personalize.ts — same signal as "For you")
//  2. Proximity to the day's other stops (haversine, real coordinates)
//  3. Collaborative signal: places that co-occur with the day's stops in
//     OTHER travelers' shared Route posts. This is naturally sparse pre-launch
//     (few real shared routes exist yet) and silently contributes nothing
//     until there's real data — no fake signal, no special-casing needed.
import { ItineraryDay } from '@/data/types';
import { Place, Post } from '@/data/types';
import { scorePlace } from './personalize';
import { haversineKm } from './routeHealth';

export type CoOccurrenceMap = Map<string, Map<string, number>>;

// slug -> (slug -> count) built from every shared Route post's stop lists.
// Two places "co-occur" once per route that includes both, regardless of order.
export function buildCoOccurrence(posts: Post[]): CoOccurrenceMap {
  const map: CoOccurrenceMap = new Map();
  for (const post of posts) {
    if (!post.routeDays) continue;
    for (const day of post.routeDays) {
      const slugs = [...new Set(day.stops.map((s) => s.slug).filter((s): s is string => !!s))];
      for (const a of slugs) {
        for (const b of slugs) {
          if (a === b) continue;
          if (!map.has(a)) map.set(a, new Map());
          const inner = map.get(a)!;
          inner.set(b, (inner.get(b) ?? 0) + 1);
        }
      }
    }
  }
  return map;
}

export type Suggestion = { place: Place; reason: string; score: number };

export function suggestPlacesForDay(params: {
  day: ItineraryDay;
  places: Place[];
  interests: string[];
  coOccurrence: CoOccurrenceMap;
  limit?: number;
}): Suggestion[] {
  const { day, places, interests, coOccurrence, limit = 10 } = params;
  const existingSlugs = new Set(day.stops.map((s) => s.slug).filter((s): s is string => !!s));
  const anchors = day.stops.filter((s) => s.lat != null && s.lng != null) as (typeof day.stops[number] & { lat: number; lng: number })[];

  const scored = places
    .filter((p) => !existingSlugs.has(p.slug))
    .map((p) => {
      let score = scorePlace(p, interests);
      let reason = '';

      if (anchors.length) {
        const minKm = Math.min(...anchors.map((a) => haversineKm(a, { lat: p.lat, lng: p.lng })));
        if (minKm < 1) {
          score += 2.5;
          reason = 'A short walk from your other stops';
        } else if (minKm < 3) {
          score += 1.2;
          reason = `~${minKm.toFixed(1)}km from your route today`;
        }
      }

      let coScore = 0;
      for (const slug of existingSlugs) {
        coScore += coOccurrence.get(slug)?.get(p.slug) ?? 0;
      }
      if (coScore > 0) {
        score += Math.min(coScore, 3);
        if (!reason) reason = 'Travelers with a similar route add this too';
      }

      if (!reason && score > 0) reason = 'Matches your interests';
      return { place: p, score, reason };
    })
    .filter((x) => x.score > 0 && x.reason)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
