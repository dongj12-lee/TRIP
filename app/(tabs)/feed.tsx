import React, { useState } from 'react';
import { View, Animated, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { normalizePostType } from '@/data';
import { T } from '@/components/base';
import { PostCard } from '@/components/cards';
import { Avatar } from '@/components/Avatar';
import { QuickComposeSheet } from '@/components/QuickComposeSheet';
import { SkeletonList, SkeletonPostCard } from '@/components/Skeleton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { TabBar, TabTitle, useTabScroll, useContentTopPadding } from '@/components/TabHeader';
import { haptic } from '@/lib/haptics';

export default function FeedScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { sharedPost, profile } = useStore();
  const { posts, refreshPosts, loading } = useRemoteContent();
  const { scrollY, onScroll } = useTabScroll();
  const topPad = useContentTopPadding();
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
  const list = all.filter((p) => !type || normalizePostType(p.type) === type);

  // A segmented control instead of chips — three meaningful kinds, so the whole
  // filter reads at a glance rather than as a scrolling row of pills.
  const segments: [string | null, string][] = [
    [null, 'All'],
    ['post', 'Posts'],
    ['route', 'Routes'],
    ['question', 'Questions'],
  ];

  const openCompose = () => { haptic.tick(); setComposeOpen(true); };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <TabBar title="Feed" scrollY={scrollY} />
        <View style={{ paddingTop: topPad }}>
          <TabTitle title="Traveler Feed" />
          <SkeletonList card={SkeletonPostCard} n={4} />
        </View>
      </View>
    );
  }

  const ListHeader = (
    <View>
      <TabTitle title="Traveler Feed" subtitle="See what other travelers are asking, sharing, and planning" />
      <View style={{ paddingHorizontal: 18 }}>
        <OfflineBanner />
      </View>

      {/* Inline composer prompt — one tap to share */}
      <View style={{ paddingHorizontal: 18, paddingBottom: 10 }}>
        <Pressable
          onPress={openCompose}
          accessibilityRole="button"
          accessibilityLabel="Write a post"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 11,
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 11, paddingRight: 14,
          }}
        >
          <Avatar name={profile.displayName || 'You'} uri={profile.avatarUrl} size={34} />
          <T style={{ flex: 1, fontSize: 14.5, color: c.muted }}>What's on your mind?</T>
          <View style={{ backgroundColor: c.accent, width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontSize: 17, color: '#fff', fontWeight: '700', marginTop: -1 }}>✎</T>
          </View>
        </Pressable>
      </View>

      {/* Segmented filter: All / Posts / Routes / Questions */}
      <View style={{ paddingHorizontal: 18, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 14, padding: 3 }}>
          {segments.map(([k, label]) => {
            const on = type === k;
            return (
              <Pressable
                key={label}
                onPress={() => { haptic.tick(); setType(k); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center',
                  paddingVertical: 8, borderRadius: 10,
                  backgroundColor: on ? c.surface : 'transparent',
                  ...(on ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
                }}
              >
                <T style={{ fontSize: 13, fontWeight: on ? '800' : '600', color: on ? c.ink : c.muted }}>{label}</T>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <TabBar title="Feed" scrollY={scrollY} />

      <Animated.FlatList
        data={list}
        keyExtractor={(p: any) => p.slug}
        renderItem={({ item }: any) => (
          <View style={{ paddingHorizontal: 18, marginBottom: 12 }}>
            <PostCard post={item} />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        initialNumToRender={7}
        windowSize={9}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} progressViewOffset={topPad} />}
        ListEmptyComponent={
          <Pressable onPress={openCompose} style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 30 }}>
            <T style={{ fontSize: 30 }}>💬</T>
            <T style={{ fontSize: 15, fontWeight: '700', color: c.ink, marginTop: 10 }}>Nothing here yet</T>
            <T style={{ fontSize: 13, color: c.muted, marginTop: 4, textAlign: 'center', lineHeight: 19 }}>
              Be the first to share something with fellow travelers.
            </T>
          </Pressable>
        }
      />

      <QuickComposeSheet visible={composeOpen} onClose={() => setComposeOpen(false)} />
    </View>
  );
}
