// Pulls one relevant, already-written Theme tip into a planned day, so the trip
// planner doubles as a place to *reference* the Themes tab in context — a
// palace day surfaces an etiquette tip, a food day surfaces an eating-out tip,
// every day still gets a genuinely useful getting-around/money fallback. The
// tip text is never invented here; it's lifted verbatim from the theme, which
// links onward to the full guide.
import { Theme } from '@/data/types';
import { TripDay } from './tripPlan';

export type DayTip = { tip: string; themeSlug: string; themeTitle: string };

export function tipForDay(day: TripDay, themes: Theme[]): DayTip | null {
  if (!themes.length || !day.plan.stops.length) return null;
  const cats = new Set(day.plan.stops.map((s) => s.place.category));
  const vibe = day.plan.vibe;

  // Priority list of theme slugs by what the day is actually about, then a tail
  // of evergreen guides useful on any Seoul day.
  const order: string[] = [];
  if (vibe === 'classic' || cats.has('History')) order.push('palaces-hanbok', 'korean-etiquette');
  if (vibe === 'foodie' || cats.has('Cuisine')) order.push('eating-out', 'street-food-bucket-list');
  if (vibe === 'shopping' || cats.has('Shopping')) order.push('olive-young-must-buys', 'money-in-korea');
  if (vibe === 'kcontent') order.push('filming-locations');
  if (vibe === 'nature' || cats.has('Nature')) order.push('what-to-pack');
  order.push('getting-around-seoul', 'money-in-korea', 'korean-etiquette');

  for (const slug of order) {
    const t = themes.find((th) => th.slug === slug);
    if (t?.tips?.length) {
      // Vary the tip by day so a multi-day trip doesn't repeat one line.
      const tip = t.tips[day.dayIndex % t.tips.length];
      return { tip, themeSlug: t.slug, themeTitle: t.title };
    }
  }
  return null;
}
