// Public data API — mirrors window.TRIP_DATA from source/data.jsx.
import { PLACES, THEMES, TIERS } from './seed';
import { CREATORS, POSTS } from './content';
import { Itinerary, Place, Post, Tier } from './types';

export * from './types';
export * from './seed';
export * from './content';

export const placeBySlug: Record<string, Place> = Object.fromEntries(
  PLACES.map((p) => [p.slug, p]),
);
export const themeBySlug = Object.fromEntries(THEMES.map((t) => [t.slug, t]));
export const postBySlug = Object.fromEntries(POSTS.map((p) => [p.slug, p]));
export const creatorById = Object.fromEntries(CREATORS.map((c) => [c.id, c]));

export const tierFor = (pts: number): Tier =>
  [...TIERS].reverse().find((t) => pts >= t.min) || TIERS[0];

// Build a shareable Route post from the live itinerary + the user's message.
export function buildRoutePost(itinerary: Itinerary, message: string, country?: string | null): Post {
  return {
    slug: 'my-shared-itinerary',
    type: 'route',
    title: `${itinerary.title} — feedback welcome 🙏`,
    body:
      message && message.trim()
        ? message.trim()
        : 'Just finalized my itinerary. Anything I should cut, add, or reorder? Brutal feedback welcome!',
    neighborhood: itinerary.dates,
    author: { name: 'You', country: country || '🧳' },
    when: 'Just now',
    votes: 0,
    comments: 0,
    fromItinerary: true,
    routeDays: itinerary.days.map((d) => ({
      day: d.label,
      theme: d.theme,
      stops: d.stops.filter((x) => x.name).map((s) => ({ slug: s.slug || undefined, name: s.name, note: s.note, time: s.time })),
    })),
    commentList: [],
  };
}
