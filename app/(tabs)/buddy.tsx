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
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
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
  const spotsLeft = Math.max(0, buddy.groupSize - 1 - count); // host takes one seat
  return (
    <Card onPress={() => router.push(`/buddy/${buddy.id}`)} style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 25 }}>{buddy.emoji}</T>
        </View>
        <View style={{ flex: 1 }}>
          <H style={{ fontSize: 18, lineHeight: 23 }}>{buddy.activity}</H>
          {/* Clean meta: line icons, not emoji soup */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
            <MetaBit icon="clock" text={buddy.when} />
            <MetaBit icon="pin" text={buddy.neighborhood} />
          </View>
        </View>
      </View>

      <T style={{ fontSize: 14, color: c.inkSoft, lineHeight: 20, marginTop: 11 }} numberOfLines={2}>{buddy.note}</T>

      {/* Footer: host on the left, availability on the right */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar name={buddy.author.name} size={26} />
          <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '700' }}>{buddy.author.name}</T>
          <Flag country={buddy.author.country} size={16} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="buddy" size={14} stroke={c.muted} sw={1.9} />
          <T style={{ fontSize: 12.5, fontWeight: '700', color: spotsLeft > 0 ? c.inkSoft : c.muted }}>
            {count > 0 ? `${count + 1}/${buddy.groupSize}` : spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left` : 'Full'}
          </T>
        </View>
      </View>
    </Card>
  );
}

function MetaBit({ icon, text }: { icon: string; text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon name={icon as any} size={13.5} stroke={c.muted} sw={1.9} />
      <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '600' }}>{text}</T>
    </View>
  );
}
