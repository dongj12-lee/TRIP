import React, { useState } from 'react';
import { View, ScrollView, FlatList, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { POST_TYPES } from '@/data';
import { T, H } from '@/components/base';
import { PostCard } from '@/components/cards';
import { Avatar } from '@/components/Avatar';
import { QuickComposeSheet } from '@/components/QuickComposeSheet';
import { SkeletonList, SkeletonPostCard } from '@/components/Skeleton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { haptic } from '@/lib/haptics';

export default function FeedScreen() {
  const { c, tone } = useTheme();
  const insets = useSafeAreaInsets();
  const { sharedPost, profile } = useStore();
  const { posts, refreshPosts, loading } = useRemoteContent();
  const [type, setType] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPosts();
    setRefreshing(false);
  };

  // sharedPost is added into `posts` via addLocalPost once it's actually created
  // (see lib/store.tsx shareTrip); only prepend it here for the local/offline
  // fallback case where it isn't part of the loaded list yet.
  const all = sharedPost && !posts.some((p) => p.slug === sharedPost.slug) ? [sharedPost, ...posts] : posts;
  const list = all.filter((p) => !type || p.type === type);

  const chips: [string, string][] = [
    ['all', 'All'],
    ...Object.entries(POST_TYPES)
      .filter(([k]) => k !== 'review')
      .map(([k, v]) => [k, `${v.emoji} ${v.label}`] as [string, string]),
  ];

  const openCompose = () => { haptic.tick(); setComposeOpen(true); };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 12 }}>
          <H style={{ fontSize: 32, lineHeight: 36 }}>Feed</H>
          <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>
            Tips, routes & thoughts from fellow travelers
          </T>
        </View>
        <SkeletonList card={SkeletonPostCard} n={4} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 12 }}>
        <H style={{ fontSize: 32, lineHeight: 36 }}>Feed</H>
        <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>
          Tips, routes & thoughts from fellow travelers
        </T>
      </View>

      <OfflineBanner />

      {/* Inline composer prompt — one tap to share a thought */}
      <View style={{ paddingHorizontal: 18, paddingBottom: 10 }}>
        <Pressable
          onPress={openCompose}
          accessibilityRole="button"
          accessibilityLabel="Write a post"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 11,
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 11, paddingRight: 14,
          }}
        >
          <Avatar name={profile.displayName || 'You'} uri={profile.avatarUrl} size={34} />
          <T style={{ flex: 1, fontSize: 14.5, color: c.muted }}>What's on your mind?</T>
          <View style={{ backgroundColor: c.accent, width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontSize: 17, color: '#fff', fontWeight: '700', marginTop: -1 }}>✎</T>
          </View>
        </Pressable>
      </View>

      <View style={{ height: 52 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingVertical: 8, alignItems: 'center' }}>
          {chips.map(([k, label]) => {
            const on = (k === 'all' && !type) || type === k;
            // Each type chip carries its own colour (the same tone as its cards
            // & badge); "All" stays neutral accent.
            const tint = k === 'all' ? null : tone(POST_TYPES[k].tone);
            const activeBg = tint ? tint.solid : c.accent;
            const idleBg = tint ? tint.bg : c.surface;
            const idleFg = tint ? tint.fg : c.inkSoft;
            return (
              <Pressable
                key={k}
                onPress={() => { haptic.tick(); setType(k === 'all' ? null : k); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{
                  paddingVertical: 6.5, paddingHorizontal: 14, borderRadius: 999,
                  borderWidth: 1, borderColor: on ? activeBg : tint ? tint.solid + '30' : c.line,
                  backgroundColor: on ? activeBg : idleBg,
                }}
              >
                <T style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : idleFg }}>{label}</T>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* FlatList (not ScrollView): posts are unbounded — keep scrolling cheap */}
      <FlatList
        data={list}
        keyExtractor={(p) => p.slug}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 90, gap: 12 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={7}
        windowSize={9}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}
        ListEmptyComponent={
          <Pressable onPress={openCompose} style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 30 }}>
            <T style={{ fontSize: 30 }}>💬</T>
            <T style={{ fontSize: 15, fontWeight: '700', color: c.ink, marginTop: 10 }}>Nothing here yet</T>
            <T style={{ fontSize: 13, color: c.muted, marginTop: 4, textAlign: 'center', lineHeight: 19 }}>
              Be the first to share a thought with fellow travelers.
            </T>
          </Pressable>
        }
      />

      <QuickComposeSheet visible={composeOpen} onClose={() => setComposeOpen(false)} />
    </View>
  );
}
