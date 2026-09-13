// One line that tells you why a stop is on your itinerary.
//
// Prefers `blurbAi` (migration-027), a one-line summary written once by
// scripts/backfill-place-blurb.ts and stored on the row — no LLM call at
// render time, this list has to appear instantly and offline for every stop
// at once. Falls back to live-extracting the opening sentence(s) of the raw
// catalog description for any place the backfill hasn't reached yet: the
// catalog descriptions are real prose (median ~450 chars) and, usefully,
// almost always open with a self-contained summary sentence, "Nanta Theater
// is Korea's first exclusive venue for Nanta performances…".
//
// Coverage is uneven by import source (measured 2026-07-23): the Visit Seoul
// `seed` rows are 100% covered, the Korean TourAPI rows only 47%. So there is
// always a fallback, and it must never be an empty line that makes one row
// look broken next to its neighbours.
import { Place } from '@/data/types';

// Enough to be a real sentence, short enough that two lines of 12px text hold
// it without the card growing.
const MAX = 132;
const MIN_USEFUL = 40;

function tidy(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Cut at a word boundary so the ellipsis never lands mid-word. */
function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).replace(/[,;:.\s]+$/, '')}…`;
}

/**
 * A short, human-readable line about a place, the opening of its description
 * where one exists, otherwise the most concrete fact we hold (its station).
 * Returns null only when we genuinely know nothing worth showing, so callers
 * can skip the row rather than render an empty line.
 */
export function placeBlurb(p: Place, max = MAX): string | null {
  if (p.blurbAi) return clip(tidy(p.blurbAi), max);
  const desc = tidy(p.description ?? '');
  if (desc.length >= MIN_USEFUL) {
    // Take whole sentences while they fit; a single long opener gets clipped.
    const sentences = desc.split(/(?<=[.!?])\s+/);
    let out = '';
    for (const s of sentences) {
      if (out && (out.length + 1 + s.length) > max) break;
      out = out ? `${out} ${s}` : s;
      if (out.length >= max * 0.55) break; // one good sentence is enough
    }
    return clip(out || desc, max);
  }
  // No usable description. The station is the next most useful thing a
  // traveller can act on, and it beats a blank line.
  if (p.subway) return `${p.subway}`;
  return null;
}
