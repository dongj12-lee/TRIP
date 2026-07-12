// Natural-language "screener" search. A traveler types how they feel —
// "quiet cafe with an english menu", "must-see palace", "vegetarian dinner
// near a subway" — and this ranks places by matching that intent against the
// data we actually have: the rich Visit Seoul descriptions, the Good-to-know
// facts (subway / free entry / english site / wheelchair), the traveler intent
// buckets, and (once crowd-sourced) the Foreigner-Fit tags.
//
// Pure scoring — free, instant, offline, deterministic — the same philosophy as
// the day-plan generator, and structured so an LLM re-rank could sit on top
// later without changing how signals are sourced. Falls back to plain text
// matching when the query carries no recognizable signal, so exact lookups
// ("gyeongbokgung") still work.
import { Place } from '@/data/types';
import { INTENTS, IntentKey, intentByKey } from '@/data/intents';

export type ScreenerHit = { place: Place; score: number; reasons: string[] };

// ── intent detection ──────────────────────────────────────────────────────
const INTENT_KW: Record<IntentKey, string[]> = {
  eat: ['eat', 'food', 'restaurant', 'dinner', 'lunch', 'meal', 'dining', 'bbq', 'noodle', 'meat', 'hungry', 'brunch'],
  cafe: ['cafe', 'café', 'coffee', 'dessert', 'tea', 'brunch spot', 'bakery'],
  sights: ['sight', 'palace', 'temple', 'historic', 'history', 'landmark', 'heritage', 'monument', 'hanok', 'old town', 'see'],
  arts: ['museum', 'gallery', 'art', 'exhibition', 'exhibit', 'library'],
  nature: ['nature', 'park', 'hike', 'hiking', 'mountain', 'river', 'walk', 'stream', 'outdoor', 'garden', 'forest'],
  shopping: ['shop', 'shopping', 'mall', 'store', 'boutique', 'buy', 'souvenir', 'fashion'],
  markets: ['market', 'traditional market', 'street food', 'stall'],
  nightlife: ['bar', 'club', 'drink', 'nightlife', 'pub', 'cocktail', 'beer', 'soju', 'night out'],
  fun: ['experience', 'class', 'workshop', 'activity', 'show', 'performance', 'theme park', 'fun', 'try'],
};

// ── attribute signals: query trigger words → (structured test | desc words) ──
type Attr = {
  id: string;
  reason: string; // shown on the card when this attribute matches
  triggers: string[]; // query words that activate this attribute
  test?: (p: Place) => boolean; // structured signal (facts / fit tags)
  desc?: string[]; // description keywords (works even with no crowd data)
};

const fitYes = (p: Place, key: string) => {
  const v = (p.votes as Record<string, { yes: number; no: number }> | undefined)?.[key];
  return (!!v && v.yes > v.no) || (p as any)[key] === true;
};

const ATTRS: Attr[] = [
  { id: 'english', reason: 'English-friendly', triggers: ['english', 'english menu', 'english speaking', 'foreigner'],
    test: (p) => p.englishSite === true || fitYes(p, 'englishMenu') || fitYes(p, 'englishSpoken') || fitYes(p, 'englishInfo'),
    desc: ['english'] },
  { id: 'quiet', reason: 'Quiet & calm', triggers: ['quiet', 'not crowded', 'peaceful', 'calm', 'chill', 'relax', 'relaxing', 'hidden', 'cozy'],
    test: (p) => fitYes(p, 'notCrowded'), desc: ['quiet', 'peaceful', 'tranquil', 'serene', 'calm', 'hidden', 'secluded', 'cozy'] },
  { id: 'worth', reason: 'Worth the trip', triggers: ['worth', 'must see', 'must-see', 'must visit', 'famous', 'iconic', 'best', 'top', 'popular', 'renowned'],
    test: (p) => fitYes(p, 'worthIt') || (p.rating ?? 0) >= 4.4, desc: ['famous', 'iconic', 'renowned', 'must-see', 'landmark', 'popular', 'representative'] },
  { id: 'photo', reason: 'Great for photos', triggers: ['photo', 'photos', 'instagram', 'insta', 'pretty', 'aesthetic', 'view', 'views', 'scenic', 'sunset', 'night view', 'picturesque'],
    test: (p) => fitYes(p, 'photoOk'), desc: ['view', 'scenic', 'photo', 'sunset', 'night view', 'panoram', 'picturesque', 'beautiful scenery'] },
  { id: 'solo', reason: 'Solo-friendly', triggers: ['solo', 'alone', 'by myself', 'single', 'one person'],
    test: (p) => fitYes(p, 'soloOk') },
  { id: 'cheap', reason: 'Budget-friendly', triggers: ['cheap', 'budget', 'affordable', 'inexpensive', 'value'],
    test: (p) => fitYes(p, 'priceTransparent') || /₩(?!₩)/.test(p.priceRange ?? ''), desc: ['affordable', 'cheap', 'budget', 'reasonable price'] },
  { id: 'free', reason: 'Free entry', triggers: ['free', 'free entry', 'no fee', 'no entrance fee'],
    test: (p) => p.freeEntry === true, desc: ['free admission', 'free entry', 'no charge'] },
  { id: 'veg', reason: 'Veg-friendly', triggers: ['vegetarian', 'vegan', 'veggie', 'plant based', 'plant-based'],
    test: (p) => fitYes(p, 'vegFriendly'), desc: ['vegetarian', 'vegan'] },
  { id: 'halal', reason: 'Halal / no pork', triggers: ['halal', 'muslim', 'no pork'],
    test: (p) => fitYes(p, 'halalFriendly'), desc: ['halal'] },
  { id: 'laptop', reason: 'Good to work', triggers: ['laptop', 'work', 'wifi', 'study', 'remote work'],
    test: (p) => fitYes(p, 'laptopOk'), desc: ['wifi', 'work'] },
  { id: 'subway', reason: 'Near a subway', triggers: ['subway', 'metro', 'station', 'near subway', 'accessible', 'easy to reach', 'convenient location'],
    test: (p) => !!p.subway },
  { id: 'accessible', reason: 'Accessible', triggers: ['wheelchair', 'accessible', 'barrier free', 'barrier-free', 'stroller'],
    test: (p) => p.wheelchair === true },
  { id: 'family', reason: 'Family-friendly', triggers: ['kid', 'kids', 'family', 'child', 'children', 'toddler'],
    test: (p) => fitYes(p, 'goodFacilities'), desc: ['family', 'children', 'kid'] },
  { id: 'traditional', reason: 'Traditional vibe', triggers: ['traditional', 'authentic', 'cultural', 'old', 'heritage'],
    desc: ['traditional', 'hanok', 'heritage', 'authentic', 'joseon', 'ancient', 'historic'] },
  { id: 'trendy', reason: 'Trendy', triggers: ['trendy', 'modern', 'hip', 'stylish', 'cool', 'contemporary'],
    desc: ['trendy', 'modern', 'contemporary', 'stylish', 'hip', 'young'] },
  { id: 'romantic', reason: 'Date-worthy', triggers: ['date', 'romantic', 'couple', 'anniversary'],
    desc: ['romantic', 'view', 'sunset', 'night view', 'couple', 'intimate'] },
  { id: 'nightview', reason: 'Night view', triggers: ['night view', 'city view', 'skyline', 'rooftop'],
    desc: ['night view', 'skyline', 'rooftop', 'city view', 'observatory'] },
];

// Words that carry no filtering signal (dropped from free-text matching).
const STOP = new Set(['i', 'a', 'an', 'the', 'to', 'go', 'want', 'like', 'somewhere', 'some', 'place', 'places', 'spot',
  'spots', 'for', 'with', 'and', 'or', 'of', 'in', 'at', 'near', 'me', 'my', 'we', 'us', 'find', 'looking', 'where',
  'can', 'good', 'nice', 'really', 'very', 'that', 'this', 'is', 'are', 'be', 'get', 'have', 'would', 'love', 'seoul',
  'please', 'show', 'give', 'recommend', 'recommendation', 'today', 'tonight', 'visit', 'going']);

export type ParsedQuery = {
  intent: IntentKey | null;
  attrs: Attr[];
  terms: string[]; // residual free-text words
  hasSignals: boolean; // intent or an attribute was recognized (vs plain text)
};

export function parseQuery(raw: string): ParsedQuery {
  const q = ` ${raw.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, ' ').replace(/\s+/g, ' ')} `;

  // intent: first bucket whose keyword appears (longer keywords first)
  let intent: IntentKey | null = null;
  outer: for (const [key, kws] of Object.entries(INTENT_KW)) {
    for (const kw of kws) if (q.includes(` ${kw} `) || q.includes(` ${kw}s `)) { intent = key as IntentKey; break outer; }
  }

  const attrs: Attr[] = [];
  const claimed = new Set<string>();
  for (const a of ATTRS) {
    for (const t of a.triggers) {
      if (q.includes(` ${t} `) || (t.length > 4 && q.includes(t))) { attrs.push(a); t.split(' ').forEach((w) => claimed.add(w)); break; }
    }
  }

  // Residual meaningful words → free-text. Intent nouns (palace, museum, park…)
  // are kept so they still boost a place whose name/description literally
  // contains them, e.g. "palace" ranks the actual palaces within Sights.
  const terms = q.trim().split(' ').filter((w) => w.length >= 3 && !STOP.has(w) && !claimed.has(w));

  return { intent, attrs, terms: [...new Set(terms)], hasSignals: !!intent || attrs.length > 0 };
}

export function screen(raw: string, places: Place[], limit = 60): ScreenerHit[] {
  const { intent, attrs, terms } = parseQuery(raw);
  const ai = intent ? intentByKey[intent] : null;

  const hits: ScreenerHit[] = [];
  for (const p of places) {
    let score = 0;
    const reasons: string[] = [];
    const desc = (p.description ?? '').toLowerCase();
    const name = (p.name ?? '').toLowerCase();

    if (ai) {
      if (ai.match(p)) { score += 3; reasons.push(`${ai.emoji} ${ai.label}`); }
      else if (intent) continue; // an explicit intent excludes off-type places
    }

    for (const a of attrs) {
      if (a.test?.(p)) { score += 2.6; reasons.push(a.reason); }
      else if (a.desc?.some((w) => desc.includes(w))) { score += 1.4; reasons.push(a.reason); }
    }

    for (const t of terms) {
      if (name.includes(t)) score += 2.4;
      else if (desc.includes(t)) score += 0.9;
    }

    // If there were free-text terms but none matched, this isn't a hit.
    if (terms.length && !terms.some((t) => name.includes(t) || desc.includes(t)) && attrs.length === 0 && !ai) continue;

    if (score <= 0) continue;

    // quality tiebreakers (tiny, so signal always dominates)
    score += Math.min(p.likeCount ?? 0, 5) * 0.12;
    if (p.photoUrl) score += 0.25;
    if ((p.rating ?? 0) >= 4.5) score += 0.3;

    hits.push({ place: p, score, reasons: [...new Set(reasons)].slice(0, 3) });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Example prompts shown under an empty search bar to teach the feature.
export const SCREENER_EXAMPLES = [
  'quiet café with an english menu',
  'must-see palace worth visiting',
  'vegetarian dinner near a subway',
  'traditional spot for photos',
];
