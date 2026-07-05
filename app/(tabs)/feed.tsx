import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { POST_TYPES } from '@/data';
import { T, H, IconButton } from '@/components/base';
import { PostCard } from '@/components/cards';

export default function FeedScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sharedPost } = useStore();
  const { posts } = useRemoteContent();
  const [type, setType] = useState<string | null>(null);

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

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <H style={{ fontSize: 32, lineHeight: 36 }}>Community</H>
          <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>
            Routes, tips & questions — by travelers, for travelers
          </T>
        </View>
        <IconButton name="plus" bg={c.accent} color="#fff" onPress={() => router.push('/compose?kind=post')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingVertical: 10 }}>
        {chips.map(([k, label]) => {
          const on = (k === 'all' && !type) || type === k;
          return (
            <Pressable
              key={k}
              onPress={() => setType(k === 'all' ? null : k)}
              style={{
                paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
                borderWidth: 1, borderColor: on ? c.accent : c.line,
                backgroundColor: on ? c.accent : c.surface,
              }}
            >
              <T style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : c.inkSoft }}>{label}</T>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 90, gap: 12 }} showsVerticalScrollIndicator={false}>
        {list.map((p) => (
          <PostCard key={p.slug} post={p} />
        ))}
      </ScrollView>
    </View>
  );
}
