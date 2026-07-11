import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ITINERARY, buildRoutePost } from '@/data';
import { ForeignerTagKey, Itinerary, Post, Profile } from '@/data/types';
import { isSupabaseConfigured } from './supabase';
import { useAuth } from './auth';
import { useRemoteContent } from './remoteData';
import { stampsForPlace } from './stamps';
import * as remote from '@/data/remote';

// Local persistence (AsyncStorage) doubles as: (a) the entire data store when
// Supabase isn't configured yet, and (b) an instant-load cache/optimistic
// layer once it is — real writes also go to Supabase (see toggle* below).
const STORE_KEY = 'trip_app_state_v1';

type PersistShape = {
  onboarded: boolean;
  profile: Profile;
  saved: string[];
  votes: string[];
  joined: string[];
  following: string[];
  itinerary: Itinerary;
  sharedPost: Post | null;
  stamps: string[];
};

type StoreValue = {
  hydrated: boolean;
  onboarded: boolean;
  profile: Profile;
  saved: Set<string>;
  votes: Set<string>;
  joined: Set<string>;
  following: Set<string>;
  itinerary: Itinerary;
  sharedPost: Post | null;
  stamps: Set<string>;
  completeOnboarding: (profile: Profile) => void;
  toggleSave: (slug: string) => void;
  toggleVote: (post: Post) => void;
  toggleJoin: (buddyId: string, message?: string) => void;
  toggleFollow: (id: string) => void;
  setItinerary: (next: Itinerary | ((prev: Itinerary) => Itinerary)) => void;
  shareTrip: (message: string) => Promise<void>;
  updateProfile: (fields: Partial<Profile>) => Promise<void>;
  myPostCount: number;
  placeReactions: Record<string, 'like' | 'dislike'>;
  togglePlaceReaction: (slug: string, reaction: 'like' | 'dislike') => void;
  tagVotes: Record<string, 'yes' | 'no'>;
  toggleTagVote: (slug: string, tagKey: ForeignerTagKey, vote: 'yes' | 'no') => void;
  resetAll: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const toggleInSet = (prev: Set<string>, key: string) => {
  const n = new Set(prev);
  n.has(key) ? n.delete(key) : n.add(key);
  return n;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { addLocalPost, placeBySlug } = useRemoteContent();

  const [hydrated, setHydrated] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [profile, setProfile] = useState<Profile>({ country: null, interests: [] });
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [votes, setVotes] = useState<Set<string>>(new Set());
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set(['c1']));
  const [itinerary, setItineraryState] = useState<Itinerary>(DEFAULT_ITINERARY);
  const [sharedPost, setSharedPost] = useState<Post | null>(null);
  const [myPostCount, setMyPostCount] = useState(0);
  const [placeReactions, setPlaceReactions] = useState<Record<string, 'like' | 'dislike'>>({});
  const [tagVotes, setTagVotes] = useState<Record<string, 'yes' | 'no'>>({});
  const [stamps, setStamps] = useState<Set<string>>(new Set());

  // Grow-only stamp collection: award a place's district/experience stamps.
  const awardPlaceStamps = (slug: string) => {
    const place = placeBySlug[slug];
    if (!place) return;
    const keys = stampsForPlace(place);
    if (keys.length) setStamps((prev) => (keys.every((k) => prev.has(k)) ? prev : new Set([...prev, ...keys])));
  };

  // hydrate from local cache first (instant paint, and the whole story when offline)
  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY)
      .then((raw) => {
        if (raw) {
          const s: Partial<PersistShape> = JSON.parse(raw);
          if (s.onboarded) setOnboarded(true);
          if (s.profile) setProfile(s.profile);
          if (s.saved) setSaved(new Set(s.saved));
          if (s.votes) setVotes(new Set(s.votes));
          if (s.joined) setJoined(new Set(s.joined));
          if (s.following) setFollowing(new Set(s.following));
          if (s.itinerary) setItineraryState(s.itinerary);
          if (s.sharedPost) setSharedPost(s.sharedPost);
          if (s.stamps) setStamps(new Set(s.stamps));
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // once signed in, pull the server-side truth for this user and overlay it
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    remote
      .fetchUserRelations(user.id)
      .then((rel) => {
        setSaved(new Set(rel.saved));
        setVotes(new Set(rel.voted));
        setJoined(new Set(rel.joined));
        setFollowing(new Set(rel.following.length ? rel.following : ['c1']));
      })
      .catch((e) => console.warn('fetchUserRelations failed', e));
    remote
      .fetchItinerary(user.id)
      .then((data) => {
        if (data) setItineraryState(data as Itinerary);
      })
      .catch((e) => console.warn('fetchItinerary failed', e));
    // Real identity — replaces the hardcoded "You / 340 PTS" mock.
    remote
      .fetchProfile(user.id)
      .then((p) => {
        if (p) setProfile((prev) => ({ ...prev, ...p }));
      })
      .catch((e) => console.warn('fetchProfile failed', e));
    remote
      .fetchMyPostCount(user.id)
      .then(setMyPostCount)
      .catch((e) => console.warn('fetchMyPostCount failed', e));
    remote
      .fetchPlaceReactions(user.id)
      .then(setPlaceReactions)
      .catch((e) => console.warn('fetchPlaceReactions failed', e));
    remote
      .fetchMyPlaceTagVotes(user.id)
      .then(setTagVotes)
      .catch((e) => console.warn('fetchMyPlaceTagVotes failed', e));
  }, [user?.id]);

  // persist to local cache on every change
  const first = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (first.current) first.current = false;
    const data: PersistShape = {
      onboarded,
      profile,
      saved: [...saved],
      votes: [...votes],
      joined: [...joined],
      following: [...following],
      itinerary,
      sharedPost,
      stamps: [...stamps],
    };
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(data)).catch(() => {});
  }, [hydrated, onboarded, profile, saved, votes, joined, following, itinerary, sharedPost, stamps]);

  // Backfill stamps from places already saved/liked (e.g. before the passport
  // existed, or after the server relations load). Runs once place data + the
  // saved/liked sets are available; grow-only so it never removes anything.
  useEffect(() => {
    if (!hydrated || Object.keys(placeBySlug).length === 0) return;
    const keys: string[] = [];
    saved.forEach((slug) => { const p = placeBySlug[slug]; if (p) keys.push(...stampsForPlace(p)); });
    Object.entries(placeReactions).forEach(([slug, r]) => { if (r === 'like') { const p = placeBySlug[slug]; if (p) keys.push(...stampsForPlace(p)); } });
    if (keys.length) setStamps((prev) => (keys.every((k) => prev.has(k)) ? prev : new Set([...prev, ...keys])));
  }, [hydrated, placeBySlug, saved, placeReactions]);

  // debounced-ish remote itinerary sync (fires on every edit; fine at MVP scale)
  useEffect(() => {
    if (!isSupabaseConfigured || !user || !hydrated) return;
    remote.saveItinerary(user.id, itinerary).catch((e) => console.warn('saveItinerary failed', e));
  }, [itinerary, user?.id, hydrated]);

  const canWrite = isSupabaseConfigured && !!user;

  const value = useMemo<StoreValue>(
    () => ({
      hydrated,
      onboarded,
      profile,
      saved,
      votes,
      joined,
      following,
      itinerary,
      sharedPost,
      stamps,
      completeOnboarding: (p) => {
        setProfile(p);
        setOnboarded(true);
      },
      toggleSave: (slug) => {
        setSaved((prev) => {
          const willSave = !prev.has(slug);
          if (canWrite) remote.setSaved(slug, willSave).catch((e) => console.warn('setSaved failed', e));
          if (willSave) awardPlaceStamps(slug); // stamps are grow-only; keep on unsave
          return toggleInSet(prev, slug);
        });
      },
      toggleVote: (post) => {
        const key = post.id ?? post.slug;
        setVotes((prev) => {
          const willVote = !prev.has(key);
          if (canWrite && post.id) remote.setVoted(post.id, willVote).catch((e) => console.warn('setVoted failed', e));
          return toggleInSet(prev, key);
        });
      },
      toggleJoin: (buddyId, message) => {
        setJoined((prev) => {
          const willJoin = !prev.has(buddyId);
          if (canWrite) {
            remote
              .setJoined(buddyId, willJoin, { message, authorName: profile.displayName || 'Traveler', authorCountry: profile.country })
              .catch((e) => console.warn('setJoined failed', e));
          }
          return toggleInSet(prev, buddyId);
        });
      },
      toggleFollow: (id) => {
        setFollowing((prev) => {
          const willFollow = !prev.has(id);
          if (canWrite) remote.setFollowed(id, willFollow).catch((e) => console.warn('setFollowed failed', e));
          return toggleInSet(prev, id);
        });
      },
      setItinerary: (next) =>
        setItineraryState((prev) => (typeof next === 'function' ? (next as any)(prev) : next)),
      shareTrip: async (message) => {
        const built = buildRoutePost(itinerary, message, profile.country);
        if (canWrite && user) {
          try {
            const created = await remote.createPost({
              type: 'route',
              title: built.title,
              body: built.body,
              neighborhood: built.neighborhood,
              routeDays: built.routeDays,
              authorName: profile.displayName || 'You',
              authorCountry: profile.country,
            });
            setSharedPost(created);
            addLocalPost(created);
            setMyPostCount((n) => n + 1);
            return;
          } catch (e) {
            console.warn('shareTrip remote failed, falling back to local', e);
          }
        }
        setSharedPost(built);
      },
      updateProfile: async (fields) => {
        setProfile((prev) => ({ ...prev, ...fields }));
        if (canWrite) await remote.updateProfile(fields).catch((e) => console.warn('updateProfile failed', e));
      },
      myPostCount,
      placeReactions,
      togglePlaceReaction: (slug, reaction) => {
        setPlaceReactions((prev) => {
          const next = { ...prev };
          const cleared = prev[slug] === reaction; // tapping the active one clears it
          if (cleared) delete next[slug];
          else next[slug] = reaction;
          if (!cleared && reaction === 'like') awardPlaceStamps(slug);
          if (canWrite) remote.setPlaceReaction(slug, cleared ? null : reaction).catch((e) => console.warn('setPlaceReaction failed', e));
          return next;
        });
      },
      tagVotes,
      toggleTagVote: (slug, tagKey, vote) => {
        const key = `${slug}:${tagKey}`;
        setTagVotes((prev) => {
          const next = { ...prev };
          const cleared = prev[key] === vote; // tapping the active choice clears it
          if (cleared) delete next[key];
          else next[key] = vote;
          if (canWrite) remote.setPlaceTagVote(slug, tagKey, cleared ? null : vote).catch((e) => console.warn('setPlaceTagVote failed', e));
          return next;
        });
      },
      resetAll: () => {
        setOnboarded(false);
        setProfile({ country: null, interests: [] });
        setSaved(new Set());
        setVotes(new Set());
        setJoined(new Set());
        setFollowing(new Set(['c1']));
        setItineraryState(DEFAULT_ITINERARY);
        setSharedPost(null);
        setMyPostCount(0);
        setPlaceReactions({});
        setTagVotes({});
        setStamps(new Set());
      },
    }),
    [hydrated, onboarded, profile, saved, votes, joined, following, itinerary, sharedPost, stamps, myPostCount, placeReactions, tagVotes, canWrite, user, addLocalPost, placeBySlug],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
