// Data-model types ported from README "Data Model" + source/data.jsx.
import { Tone } from '@/theme/tokens';

export type Swatch = string[];

export type ForeignerTagKey =
  // The original five — these have boolean columns and drive the Explore filter.
  | 'soloOk' | 'englishMenu' | 'priceTransparent' | 'cardOk' | 'englishSpoken'
  // Category-specific verification tags (vote counts live in `votes` jsonb only).
  | 'vegFriendly' | 'halalFriendly' | 'laptopOk' | 'englishInfo' | 'worthIt'
  | 'photoOk' | 'notCrowded' | 'taxFree' | 'beginnerOk' | 'bookingNeeded' | 'goodFacilities';

export type ForeignerTag = {
  key: ForeignerTagKey;
  emoji: string;
  label: string;
  hint: string;
  tone: Tone;
};

export type Place = {
  slug: string;
  lat: number;
  lng: number;
  name: string;
  nameKo: string;
  // Real Visit Seoul category hierarchy: category = L1 (e.g. "Cuisine"),
  // categoryL2/L3 = finer levels where they exist (e.g. "Foreign Restaurant" /
  // "Chinese"). Not every place has L2/L3.
  category: string;
  categoryL2?: string | null;
  categoryL3?: string | null;
  neighborhood: string;
  city: string;
  address: string;
  hours: string;
  priceRange: string;
  rating?: number;
  reviews?: number;
  description: string;
  soloOk: boolean;
  englishMenu: boolean;
  priceTransparent: boolean;
  cardOk: boolean;
  englishSpoken: boolean;
  votes: Partial<Record<ForeignerTagKey, { yes: number; no: number }>>;
  warnTip?: string;
  // K-content connection is the app's own curated layer (not sourced from any
  // public API) — optional because bulk-imported places won't have one yet.
  kContentTitle?: string;
  kContentType?: string;
  kContentNote?: string;
  swatch: Swatch;
  photoUrl?: string; // real photo (e.g. from TourAPI); falls back to swatch gradient when absent
  // Objective "Good to know" facts, sourced from Visit Seoul (distinct from the
  // community-voted Foreigner Fit tags above).
  subway?: string;
  freeEntry?: boolean;
  englishSite?: boolean;
  wheelchair?: boolean;
  // Community satisfaction — powers the "Recommended" rail.
  likeCount?: number;
  dislikeCount?: number;
  // Editorial "verified by TRIP" tags — mechanically derived from objective
  // Visit Seoul fields or a well-established category-level fact (never a
  // per-place guess), kept separate from the crowd-voted `votes` above so it
  // can never be confused with or overwrite a real traveler vote. Solves the
  // cold-start problem for the Foreigner-Fit checklist without fabricating
  // per-place claims.
  verifiedTags?: ForeignerTagKey[];
  // Deep link to this place's own Naver Map page (resolved once via the Naver
  // Local Search API, then stored permanently — see migration-024). Tapping
  // through is how travelers see real, live reviews: neither Google nor Naver
  // allow storing review content itself, only the place ID / link.
  naverMapUrl?: string;
};

export type GuideItem = {
  name: string;
  nameKo?: string;
  emoji?: string;
  swatch?: Swatch;
  price: string;
  where?: string;
  note: string;
  tag?: string;
  caution?: string;
};

export type Street = { name: string; nameKo: string; note: string };

export type Theme = {
  slug: string;
  kind: 'walk' | 'guide';
  category: string;
  title: string;
  subtitle: string;
  badge?: string;
  description: string;
  swatch: Swatch;
  photoUrl?: string; // real cover photo; falls back to the swatch gradient
  // walk-only
  kContent?: string;
  kType?: string;
  stops?: number;
  hours?: string;
  placeSlugs?: string[];
  // guide-only
  meta?: { icon: string; label: string }[];
  tips?: string[];
  itemsTitle?: string;
  items?: GuideItem[];
  streetsTitle?: string;
  streets?: Street[];
  // Deep guides: multiple titled item groups (bestsellers by category, a sale
  // calendar, hacks…) so one theme can hold a real handbook, not 6 picks.
  sections?: { title: string; subtitle?: string; items: GuideItem[] }[];
  updated?: string; // freshness stamp shown on the card, e.g. 'Jul 2026'
  // "Lounge" content blocks: richer, purpose-built layouts (a fare/time
  // comparison table, a numbered how-to, a rail of real in-app places) that a
  // generic items list can't express well. Rendered in order after sections.
  blocks?: ThemeBlock[];
};

// A side-by-side comparison (e.g. AREX vs limousine bus vs taxi; KTX vs
// flight vs express bus for a given route) — columns are option names, each
// row is one comparison dimension (Time, Price, Best for…).
export type CompareBlock = {
  type: 'compare';
  title: string;
  subtitle?: string;
  columns: string[];
  rows: { label: string; values: string[] }[];
  note?: string; // one caveat/tip below the table
};

// A numbered walkthrough (how to use a delivery app, how a jjimjilbang
// visit flows start to finish, how to queue for a music-show taping).
export type StepsBlock = {
  type: 'steps';
  title: string;
  subtitle?: string;
  steps: { title: string; note: string; emoji?: string }[];
};

// A rail linking into real in-app Place rows (by slug) — for
// neighborhood/spot themes so the "lounge" surfaces live app content
// instead of only static copy.
export type PlacesBlock = {
  type: 'places';
  title: string;
  subtitle?: string;
  placeSlugs: string[];
};

export type ThemeBlock = CompareBlock | StepsBlock | PlacesBlock;

export type Author = { name: string; country: string };

export type RouteStop = { slug?: string; name?: string; note: string; time: string };
export type RouteDay = { day: string; theme: string; stops: RouteStop[] };
export type Comment = {
  id?: string;
  authorId?: string;
  name: string;
  country: string;
  body: string;
  when: string;
  parentId?: string | null; // one level of threaded replies
  likeCount?: number;
  likedByMe?: boolean;
};

export type PostType = 'post' | 'route' | 'question';

export type Post = {
  id?: string; // Supabase row id, present once backed by the DB (see data/remote.ts)
  authorId?: string; // profile id of the author, for report/block (DB-backed posts only)
  slug: string;
  type: PostType;
  title: string;
  body: string;
  neighborhood: string;
  placeSlug?: string;
  author: Author;
  when: string;
  votes: number;
  comments: number;
  routeDays?: RouteDay[];
  imageUrl?: string; // optional photo attached to the post (Storage, migration-018)
  commentList: Comment[];
  fromItinerary?: boolean;
  // Tally of one-click route-feedback prompts, keyed by prompt id (route posts).
  feedbackCounts?: Record<string, number>;
};

// A request to join a buddy plan. Contact (the group chat) is gated on the
// host accepting — see migration-012.
export type BuddyInterest = {
  userId?: string;
  name: string;
  country: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
};

export type BuddyMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderCountry: string;
  body: string;
  when: string;
};

export type Buddy = {
  id: string;
  authorId?: string;
  activity: string;
  emoji: string;
  author: Author;
  neighborhood: string;
  placeSlug?: string;
  when: string;
  groupSize: number;
  note: string;
  interested: number;
  interestedList: BuddyInterest[];
};

export type ItineraryStop = {
  time: string;
  part: string;
  name: string;
  note: string;
  slug: string | null;
  swatch: Swatch;
  // Filled when a real DB place is added (enables route-health distance checks
  // + thumbnails); absent for free-text/custom stops like "KTX to Busan".
  lat?: number;
  lng?: number;
  category?: string;
  photoUrl?: string;
};
export type ItineraryDay = { label: string; date: string; theme: string; stops: ItineraryStop[] };
export type Itinerary = {
  title: string;
  dates: string;
  travelers: string;
  status?: string;
  days: ItineraryDay[];
};

export type Tier = { key: string; label: string; emoji: string; min: number; blurb: string };

export type Creator = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  swatch: Swatch;
  home: string;
  verified: boolean;
  tier: string;
  expertise: string;
  followers: string;
  bio: string;
  posts: { type: PostType; title: string; votes: number; comments: number; when: string }[];
};

export type Region = { key: string; emoji: string; label: string; hint: string };
export type Interest = { key: string; emoji: string; label: string };
export type Country = { flag: string; name: string };

export type Profile = {
  country: string | null;
  interests: string[];
  // Real identity, hydrated from the Supabase `profiles` row on sign-in.
  // Absent in the local/offline demo, where sensible defaults are shown.
  displayName?: string;
  handle?: string;
  points?: number;
  avatarUrl?: string;
};
