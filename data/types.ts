// Data-model types ported from README "Data Model" + source/data.jsx.
import { Tone } from '@/theme/tokens';

export type Swatch = string[];

export type ForeignerTagKey =
  | 'soloOk' | 'englishMenu' | 'priceTransparent' | 'cardOk' | 'englishSpoken';

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
  category: string;
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
  votes: Partial<Record<ForeignerTagKey, number>>;
  warnTip?: string;
  // K-content connection is the app's own curated layer (not sourced from any
  // public API) — optional because bulk-imported places won't have one yet.
  kContentTitle?: string;
  kContentType?: string;
  kContentNote?: string;
  swatch: Swatch;
  photoUrl?: string; // real photo (e.g. from TourAPI); falls back to swatch gradient when absent
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
};

export type Author = { name: string; country: string };

export type RouteStop = { slug?: string; name?: string; note: string; time: string };
export type RouteDay = { day: string; theme: string; stops: RouteStop[] };
export type Comment = { id?: string; authorId?: string; name: string; country: string; body: string; when: string };

export type PostType = 'tip' | 'route' | 'question' | 'review';

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
  commentList: Comment[];
  fromItinerary?: boolean;
  // Tally of one-click route-feedback prompts, keyed by prompt id (route posts).
  feedbackCounts?: Record<string, number>;
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
  interestedList: { name: string; country: string; message: string }[];
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
