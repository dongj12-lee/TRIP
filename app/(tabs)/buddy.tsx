import React, { useState } from 'react';
import { View, Animated, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { Buddy } from '@/data/types';
import { T, IconButton } from '@/components/base';
import { Flag } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { SkeletonList, SkeletonBuddyCard } from '@/components/Skeleton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { TabBar, TabTitle, useTabScroll, useContentTopPadding } from '@/components/TabHeader';
import { haptic } from '@/lib/haptics';

export default function BuddyScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { buddies, refreshBuddies, loading } = useRemoteContent();
  const { scrollY, onScroll } = useTabScroll();
  const topPad = useContentTopPadding();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBuddies();
    setRefreshing(false);
  };

  const compose = (
    <IconButton name="plus" bg={c.accent} color="#fff" label="Post a plan" onPress={() => router.push('/compose?kind=buddy')} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <TabBar title="Buddy" scrollY={scrollY} right={compose} />

      {loading ? (
        <View style={{ paddingTop: topPad }}>
          <TabTitle title="Travel Buddies" />
          <SkeletonList card={SkeletonBuddyCard} n={4} />
        </View>
      ) : (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} progressViewOffset={topPad} />
          }
        >
          <TabTitle title="Travel Buddies" />

          <View style={{ paddingHorizontal: 18 }}>
            <OfflineBanner />
            {/* Purpose line — "Buddy" alone doesn't say what the tab is for
                (unlike Feed/Explore, this is a novel concept), so it earns one.
                The safety reminder lives on the plan detail screen instead,
                right before you request to join — a more relevant moment. */}
            <T style={{ fontSize: 13, color: c.inkSoft, fontWeight: '600', marginBottom: 4 }}>
              Find someone for a 2-person dish or a day trip out of town.
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
            <View style={{ marginTop: 10 }}>
              {buddies.map((b) => (
                <BuddyRow key={b.id} buddy={b} />
              ))}
            </View>
          )}
        </Animated.ScrollView>
      )}
    </View>
  );
}

// An X-style row: edge-to-edge with a hairline divider, host avatar leading,
// the plan itself reading as the "post", and a single clear Join action.
function BuddyRow({ buddy }: { buddy: Buddy }) {
  const { c } = useTheme();
  const router = useRouter();
  const { joined } = useStore();
  const requested = joined.has(buddy.id); // asked to join — host still approves
  const count = buddy.interested + (requested ? 1 : 0);
  const spotsLeft = Math.max(0, buddy.groupSize - 1 - count); // host takes one seat
  const open = () => router.push(`/buddy/${buddy.id}`);

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        { flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
        pressed && { backgroundColor: c.surface2 },
      ]}
    >
      <Avatar name={buddy.author.name} size={44} />

      <View style={{ flex: 1 }}>
        {/* Host · when — inline, tweet-header style */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <T style={{ fontSize: 14.5, fontWeight: '800', color: c.ink }} numberOfLines={1}>{buddy.author.name}</T>
          <Flag country={buddy.author.country} size={15} />
          <T style={{ fontSize: 13, color: c.muted, fontWeight: '600' }} numberOfLines={1}>· {buddy.when}</T>
        </View>

        {/* The plan itself — the "post" */}
        <T style={{ fontSize: 15.5, lineHeight: 21, color: c.ink, fontWeight: '700', marginTop: 3 }} numberOfLines={2}>{buddy.activity}</T>
        {!!buddy.note && (
          <T style={{ fontSize: 14, lineHeight: 20, color: c.inkSoft, marginTop: 3 }} numberOfLines={2}>{buddy.note}</T>
        )}

        {/* Meta + a single Join action */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 11, gap: 12 }}>
          <MetaBit icon="pin" text={buddy.neighborhood} />
          <View style={{ flex: 1 }} />
          {requested ? (
            // Already asked — host approves before it's confirmed
            <View style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}>
              <T style={{ fontSize: 12.5, fontWeight: '800', color: c.inkSoft }}>Requested</T>
            </View>
          ) : spotsLeft > 0 ? (
            <>
              {spotsLeft <= 3 && <T style={{ fontSize: 12, color: c.muted, fontWeight: '700' }}>{spotsLeft} left</T>}
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); haptic.tick(); open(); }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Join plan"
                style={{ paddingVertical: 6, paddingHorizontal: 15, borderRadius: 999, backgroundColor: c.ink }}
              >
                <T style={{ fontSize: 12.5, fontWeight: '800', color: c.paper }}>Join</T>
              </Pressable>
            </>
          ) : (
            <T style={{ fontSize: 12.5, fontWeight: '700', color: c.muted }}>Full</T>
          )}
        </View>
      </View>
    </Pressable>
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
