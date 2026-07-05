import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured } from './supabase';
import * as remote from '@/data/remote';
import { PLACES as SEED_PLACES, THEMES as SEED_THEMES } from '@/data/seed';
import { POSTS as SEED_POSTS, BUDDIES as SEED_BUDDIES } from '@/data/content';
import { Buddy, Place, Post, Theme } from '@/data/types';

type RemoteContentValue = {
  live: boolean; // true once real Supabase data has loaded (vs. seed fallback)
  loading: boolean;
  places: Place[];
  themes: Theme[];
  posts: Post[];
  buddies: Buddy[];
  placeBySlug: Record<string, Place>;
  themeBySlug: Record<string, Theme>;
  refreshPosts: () => Promise<void>;
  refreshBuddies: () => Promise<void>;
  refreshAll: () => Promise<void>;
  addLocalPost: (p: Post) => void;
  addLocalBuddy: (b: Buddy) => void;
};

const RemoteContentContext = createContext<RemoteContentValue | null>(null);

export function RemoteContentProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [places, setPlaces] = useState<Place[]>(SEED_PLACES);
  const [themes, setThemes] = useState<Theme[]>(SEED_THEMES);
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [buddies, setBuddies] = useState<Buddy[]>(SEED_BUDDIES);

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const [p, t, po, b] = await Promise.all([
        remote.fetchPlaces(),
        remote.fetchThemes(),
        remote.fetchPosts(),
        remote.fetchBuddies(),
      ]);
      // Only switch over once the DB has actually been seeded — otherwise keep
      // showing local demo content instead of an empty app.
      if (p.length) setPlaces(p);
      if (t.length) setThemes(t);
      if (po.length) setPosts(po);
      if (b.length) setBuddies(b);
      setLive(p.length > 0);
    } catch (e) {
      console.warn('Remote content load failed, using local seed data:', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshPosts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const po = await remote.fetchPosts();
      setPosts(po);
    } catch (e) {
      console.warn('refreshPosts failed', e);
    }
  }, []);

  const refreshBuddies = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const b = await remote.fetchBuddies();
      setBuddies(b);
    } catch (e) {
      console.warn('refreshBuddies failed', e);
    }
  }, []);

  const refreshAll = useCallback(() => loadAll(), [loadAll]);

  const addLocalPost = useCallback((p: Post) => setPosts((prev) => [p, ...prev]), []);
  const addLocalBuddy = useCallback((b: Buddy) => setBuddies((prev) => [b, ...prev]), []);

  const placeBySlug = useMemo(() => Object.fromEntries(places.map((p) => [p.slug, p])), [places]);
  const themeBySlug = useMemo(() => Object.fromEntries(themes.map((t) => [t.slug, t])), [themes]);

  const value = useMemo<RemoteContentValue>(
    () => ({
      live,
      loading,
      places,
      themes,
      posts,
      buddies,
      placeBySlug,
      themeBySlug,
      refreshPosts,
      refreshBuddies,
      refreshAll,
      addLocalPost,
      addLocalBuddy,
    }),
    [live, loading, places, themes, posts, buddies, placeBySlug, themeBySlug, refreshPosts, refreshBuddies, refreshAll, addLocalPost, addLocalBuddy],
  );

  return <RemoteContentContext.Provider value={value}>{children}</RemoteContentContext.Provider>;
}

export function useRemoteContent() {
  const ctx = useContext(RemoteContentContext);
  if (!ctx) throw new Error('useRemoteContent must be used within RemoteContentProvider');
  return ctx;
}
