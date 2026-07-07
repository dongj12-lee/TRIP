import React, { useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { Buddy } from '@/data/types';
import { T, H, Card, IconButton } from '@/components/base';
import { Flag } from '@/components/ui';
import { SkeletonList, SkeletonBuddyCard } from '@/components/Skeleton';
import { OfflineBanner } from '@/components/OfflineBanner';

export default function BuddyScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { buddies, refreshBuddies, loading } = useRemoteContent();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBuddies();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <H style={{ fontSize: 32, lineHeight: 36 }}>Buddy</H>
          <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>
            Short-notice plans other travelers can join
          </T>
        </View>
        <IconButton name="plus" bg={c.accent} color="#fff" label="Post a plan" onPress={() => router.push('/compose?kind=buddy')} />
      </View>

      {loading ? (
        <SkeletonList card={SkeletonBuddyCard} n={4} />
      ) : (
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 90, gap: 12, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}
      >
        <OfflineBanner />

        {/* Safety banner */}
        <View style={{ backgroundColor: c.gold50, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <T style={{ fontSize: 18 }}>🛟</T>
          <T style={{ flex: 1, fontSize: 12.5, lineHeight: 18, color: c.gold700, fontWeight: '600' }}>
            Meet in public, tell a friend your plans, and trust your gut. TRIP doesn't vet members.
          </T>
        </View>

        {buddies.length === 0 ? (
          <Pressable
            onPress={() => router.push('/compose?kind=buddy')}
            accessibilityRole="button"
            style={{ alignItems: 'center', paddingVertical: 44, paddingHorizontal: 30 }}
          >
            <T style={{ fontSize: 30 }}>👋</T>
            <T style={{ fontSize: 15, fontWeight: '700', color: c.ink, marginTop: 10 }}>No plans yet</T>
            <T style={{ fontSize: 13, color: c.muted, marginTop: 4, textAlign: 'center', lineHeight: 19 }}>
              Post the first one — dinner tonight, a palace walk tomorrow, anything.
            </T>
            <View style={{ marginTop: 16, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, backgroundColor: c.accent }}>
              <T style={{ fontSize: 13.5, fontWeight: '700', color: '#fff' }}>Post a plan</T>
            </View>
          </Pressable>
        ) : (
          buddies.map((b) => <BuddyCard key={b.id} buddy={b} />)
        )}
      </ScrollView>
      )}
    </View>
  );
}

function BuddyCard({ buddy }: { buddy: Buddy }) {
  const { c } = useTheme();
  const router = useRouter();
  const { joined } = useStore();
  const isJoined = joined.has(buddy.id);
  const count = buddy.interested + (isJoined ? 1 : 0);
  return (
    <Card onPress={() => router.push(`/buddy/${buddy.id}`)} style={{ padding: 15 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 24 }}>{buddy.emoji}</T>
        </View>
        <View style={{ flex: 1 }}>
          <H style={{ fontSize: 17, lineHeight: 21 }}>{buddy.activity}</H>
          <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '600', marginTop: 3 }}>
            🕒 {buddy.when} · 📍 {buddy.neighborhood} · 👥 up to {buddy.groupSize}
          </T>
        </View>
      </View>
      <T style={{ fontSize: 13.5, color: c.inkSoft, lineHeight: 19, marginTop: 10 }}>{buddy.note}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Flag country={buddy.author.country} size={22} />
          <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '600' }}>{buddy.author.name}</T>
        </View>
        <View style={{ backgroundColor: count > 0 ? c.surface2 : 'transparent', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 }}>
          <T style={{ fontSize: 12, fontWeight: '700', color: count > 0 ? c.inkSoft : c.muted }}>
            {count > 0 ? `🙋 ${count} interested` : 'Be the first 🙋'}
          </T>
        </View>
      </View>
    </Card>
  );
}
