import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ITINERARY, buildRoutePost } from '@/data';
import { Itinerary, Post, Profile } from '@/data/types';
import { isSupabaseConfigured } from './supabase';
import { useAuth } from './auth';
import { useRemoteContent } from './remoteData';
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
  completeOnboarding: (profile: Profile) => void;
  toggleSave: (slug: string) => void;
  toggleVote: (post: Post) => void;
  toggleJoin: (buddyId: string) => void;
  toggleFollow: (id: string) => void;
  setItinerary: (next: Itinerary | ((prev: Itinerary) => Itinerary)) => void;
  shareTrip: (message: string) => Promise<void>;
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
  const { addLocalPost } = useRemoteContent();

  const [hydrated, setHydrated] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [profile, setProfile] = useState<Profile>({ country: null, interests: [] });
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [votes, setVotes] = useState<Set<string>>(new Set());
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set(['c1']));
  const [itinerary, setItineraryState] = useState<Itinerary>(DEFAULT_ITINERARY);
  const [sharedPost, setSharedPost] = useState<Post | null>(null);

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
    };
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(data)).catch(() => {});
  }, [hydrated, onboarded, profile, saved, votes, joined, following, itinerary, sharedPost]);

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
      completeOnboarding: (p) => {
        setProfile(p);
        setOnboarded(true);
      },
      toggleSave: (slug) => {
        setSaved((prev) => {
          const willSave = !prev.has(slug);
          if (canWrite) remote.setSaved(slug, willSave).catch((e) => console.warn('setSaved failed', e));
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
      toggleJoin: (buddyId) => {
        setJoined((prev) => {
          const willJoin = !prev.has(buddyId);
          if (canWrite) {
            remote
              .setJoined(buddyId, willJoin, { authorName: 'You', authorCountry: profile.country })
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
              authorName: 'You',
              authorCountry: profile.country,
            });
            setSharedPost(created);
            addLocalPost(created);
            return;
          } catch (e) {
            console.warn('shareTrip remote failed, falling back to local', e);
          }
        }
        setSharedPost(built);
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
      },
    }),
    [hydrated, onboarded, profile, saved, votes, joined, following, itinerary, sharedPost, canWrite, user, addLocalPost],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
