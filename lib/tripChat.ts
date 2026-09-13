// The chat half of trip editing: language in, real edits out.
//
// The `trip-chat` Edge Function does the language understanding and returns
// operations with a plain-English *criterion*, never a place. This module
// resolves those criteria against the real catalog using the same machinery
// the manual "Change" button uses (lib/tripEdit.swapCandidates for the slot
// and geography rules, lib/screener for the free-text match), so the chat
// can't produce a trip the manual UI couldn't have produced by hand.
import { Place } from '@/data/types';
import { VibeKey } from './dayPlan';
import { TripPlan, regenerateDay } from './tripPlan';
import { addCandidates, addStop, removeStop, replaceStop, swapCandidates } from './tripEdit';
import { screen } from './screener';

export type TripChatOp = {
  op: 'replace' | 'remove' | 'add' | 'regenerate_day' | 'set_vibe' | 'none';
  dayIndex: number;
  slug: string;
  criterion: string;
  vibe: VibeKey | '';
};

export type TripChatReply = { reply: string; operations: TripChatOp[] };
export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/**
 * What the model sees. Deliberately compact and slug-first: the model's only
 * job is to point at a stop, so it needs the slug verbatim, the role (to
 * resolve "lunch"), and just enough description to judge "too heavy" or
 * "another temple again".
 */
export function tripSummary(trip: TripPlan): string {
  return trip.days
    .map((d) => {
      const stops = d.plan.stops
        .map((s) => `  - [${s.role}] ${s.place.name} (${s.place.categoryL2 || s.place.category}, ${s.place.neighborhood}) slug=${s.place.slug}`)
        .join('\n');
      return `Day ${d.dayIndex + 1} (dayIndex=${d.dayIndex}), ${d.zone.label}, ${d.plan.totalKm.toFixed(1)}km walking\n${stops}`;
    })
    .join('\n\n');
}

export async function sendTripChat(
  message: string,
  trip: TripPlan,
  history: ChatTurn[],
): Promise<TripChatReply> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const res = await fetch(`${base}/functions/v1/trip-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, tripSummary: tripSummary(trip), history }),
  });
  const json = (await res.json().catch(() => ({}))) as Partial<TripChatReply> & { error?: string };
  if (!res.ok || json.error) throw new Error(json.error ?? `trip-chat ${res.status}`);
  return { reply: json.reply ?? '', operations: Array.isArray(json.operations) ? json.operations : [] };
}

/**
 * Pick the real place that best answers a criterion for one specific slot.
 *
 * The candidate list comes from swapCandidates, so slot kind, walking
 * distance and no-duplicates are already guaranteed, the criterion only
 * re-ranks within that safe set. Ranking outside it would let "somewhere
 * cheaper" send day 2's lunch to Gangnam.
 */
function resolveCriterion(trip: TripPlan, dayIndex: number, slug: string, criterion: string, places: Place[]): Place | null {
  const candidates = swapCandidates(trip, dayIndex, slug, places, 40);
  if (!candidates.length) return null;
  if (!criterion.trim()) return candidates[0];

  const hits = screen(criterion, candidates, 40);
  if (hits.length) return hits[0].place;
  // The criterion matched nothing describable in the catalog (descriptions are
  // uneven, especially on imported rows). Falling back to the best-ranked
  // candidate is still an honest answer to "give me something else here".
  return candidates[0];
}

/** Everything regenerating a day needs that isn't the trip itself. */
export type PlanContext = {
  interests: string[];
  saved: Set<string>;
  reactions: Record<string, 'like' | 'dislike'>;
  rainy?: boolean;
  vibe?: VibeKey;
  arriveHour?: number;
  departHour?: number;
  pace?: import('./tripIntake').Pace;
  avoid?: string[];
};

export type ApplyResult = {
  trip: TripPlan;
  /**
   * A vibe change the caller must apply itself. Vibe is an input to the
   * generator, not a property of an existing plan, changing it has to rebuild
   * the whole trip from the screen's own state, which also (correctly) discards
   * manual edits made against the old vibe.
   */
  vibe: VibeKey | null;
  /** True if the trip actually changed, so the caller knows whether to re-render/save. */
  changed: boolean;
};

export function applyTripChatOps(
  trip: TripPlan,
  ops: TripChatOp[],
  places: Place[],
  ctx: PlanContext,
): ApplyResult {
  let next = trip;
  let changed = false;
  let vibe: VibeKey | null = null;

  for (const o of ops) {
    if (o.op === 'none') continue;

    if (o.op === 'set_vibe') {
      if (o.vibe) vibe = o.vibe;
      continue;
    }

    if (o.op === 'regenerate_day') {
      if (!next.days.some((d) => d.dayIndex === o.dayIndex)) continue;
      const rebuilt = regenerateDay(next, o.dayIndex, places, ctx);
      if (rebuilt !== next) {
        next = rebuilt;
        changed = true;
      }
      continue;
    }

    if (o.op === 'add') {
      const day = next.days.find((d) => d.dayIndex === o.dayIndex);
      if (!day || day.plan.stops.length === 0 || day.plan.stops.length >= 7) continue; // no anchor / already full
      const cands = addCandidates(next, o.dayIndex, places, 40);
      if (!cands.length) continue;
      const pick = o.criterion.trim() ? screen(o.criterion, cands, 40)[0]?.place ?? cands[0] : cands[0];
      next = addStop(next, o.dayIndex, pick);
      changed = true;
      continue;
    }

    // Guard against a hallucinated slug, the op is dropped, not guessed at.
    const day = next.days.find((d) => d.dayIndex === o.dayIndex);
    if (!day || !day.plan.stops.some((s) => s.place.slug === o.slug)) continue;

    if (o.op === 'remove') {
      if (day.plan.stops.length <= 2) continue; // don't gut a day down to nothing
      next = removeStop(next, o.dayIndex, o.slug);
      changed = true;
    } else if (o.op === 'replace') {
      const pick = resolveCriterion(next, o.dayIndex, o.slug, o.criterion, places);
      if (!pick) continue;
      next = replaceStop(next, o.dayIndex, o.slug, pick);
      changed = true;
    }
  }

  return { trip: next, vibe, changed };
}
