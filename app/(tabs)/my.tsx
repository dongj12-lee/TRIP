import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { CREATORS, USER, creatorById, tierFor } from '@/data';
import { Creator } from '@/data/types';
import { T, H, Card, Button, IconButton } from '@/components/base';
import { PlaceCard, PostCardMini } from '@/components/cards';
import { Icon } from '@/components/Icon';
import { Photo } from '@/components/ui';

export default function MyScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saved, following, toggleFollow, itinerary, sharedPost, shareTrip } = useStore();
  const { placeBySlug } = useRemoteContent();

  const tier = tierFor(USER.points);
  const savedPlaces = [...saved].map((s) => placeBySlug[s]).filter(Boolean);
  const followingList = CREATORS.filter((cr) => following.has(cr.id));
  const suggestions = CREATORS.filter((cr) => !following.has(cr.id));

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H style={{ fontSize: 32 }}>My TRIP</H>
          <IconButton name="settings" onPress={() => router.push('/settings')} color={c.inkSoft} />
        </View>

        {/* Identity */}
        <View style={{ paddingHorizontal: 18, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 56, height: 56, borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
            <Photo swatch={['#c26b4a', '#e0a05a']} height={56} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <H style={{ fontSize: 20 }}>{USER.name}</H>
              <View style={{ backgroundColor: c.accent50, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 }}>
                <T style={{ fontSize: 11.5, fontWeight: '700', color: c.accent }}>{tier.emoji} {tier.label}</T>
              </View>
            </View>
            <T style={{ fontSize: 13, color: c.muted, marginTop: 1 }}>@{USER.handle}</T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <H style={{ fontSize: 20, color: c.accent }}>{USER.points}</H>
            <T style={{ fontSize: 10.5, color: c.muted, fontWeight: '700' }}>PTS</T>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 14 }}>
          <Stat n={USER.contributions} label="Posts" />
          <Stat n={USER.helpfulVotes} label="Helpful" />
          <Stat n={USER.followers} label="Followers" />
        </View>

        {/* Itinerary card */}
        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
          <Card style={{ padding: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T style={{ fontSize: 11, fontWeight: '800', color: c.accent, letterSpacing: 1 }}>MY ITINERARY</T>
              {!sharedPost && (
                <View style={{ backgroundColor: c.surface2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <T style={{ fontSize: 9.5, fontWeight: '800', color: c.muted, letterSpacing: 0.5 }}>DRAFT</T>
                </View>
              )}
            </View>
            <H style={{ fontSize: 20, marginTop: 6 }}>{itinerary.title}</H>
            <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '600', marginTop: 3 }}>
              🗓 {itinerary.dates} · {itinerary.travelers} · {itinerary.days.length} days ·{' '}
              {itinerary.days.reduce((s, d) => s + d.stops.length, 0)} stops
            </T>
            <View style={{ marginTop: 12, gap: 8 }}>
              {itinerary.days.map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <T style={{ fontSize: 11.5, fontWeight: '800', color: c.accent, width: 42 }}>{d.label}</T>
                  <T style={{ flex: 1, fontSize: 13, color: c.ink, fontWeight: '600' }} numberOfLines={1}>{d.theme}</T>
                  <T style={{ fontSize: 12, color: c.muted }}>{d.stops.length} stops</T>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button label="Open & edit" icon="settings" variant="soft" style={{ flex: 1 }} onPress={() => router.push('/planner')} />
              <Button
                label={sharedPost ? '✓ Shared' : 'Share'}
                icon={sharedPost ? undefined : 'share'}
                variant={sharedPost ? 'soft' : 'primary'}
                style={{ flex: 1 }}
                onPress={async () => {
                  if (!sharedPost) {
                    await shareTrip('');
                    router.push('/(tabs)/feed');
                  }
                }}
              />
            </View>
          </Card>
        </View>

        {/* Following */}
        {followingList.length > 0 && (
          <Section title="Following">
            {followingList.map((cr) => (
              <CreatorRow key={cr.id} creator={cr} following onToggle={() => toggleFollow(cr.id)} />
            ))}
          </Section>
        )}

        {/* Creators to follow */}
        <Section title="Creators to follow">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 18 }}>
            {suggestions.map((cr) => (
              <CreatorCard key={cr.id} creator={cr} onToggle={() => toggleFollow(cr.id)} />
            ))}
          </ScrollView>
        </Section>

        {/* My contributions */}
        <Section title="My contributions">
          <View style={{ gap: 10 }}>
            {USER.myPosts.map((p) => (
              <PostCardMini key={p.slug} post={p as any} />
            ))}
          </View>
        </Section>

        {/* Saved places */}
        <Section title="Saved places">
          {savedPlaces.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line }}>
              <T style={{ fontSize: 26 }}>🔖</T>
              <T style={{ color: c.muted, marginTop: 6, fontWeight: '600' }}>Start exploring — tap ♥ on any spot.</T>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {savedPlaces.map((p) => (
                <PlaceCard key={p.slug} place={p} />
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, paddingVertical: 12, alignItems: 'center' }}>
      <H style={{ fontSize: 18 }}>{n}</H>
      <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '700', marginTop: 1 }}>{label}</T>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 22 }}>
      <H style={{ fontSize: 18, marginBottom: 12 }}>{title}</H>
      {children}
    </View>
  );
}

function CreatorRow({ creator, following, onToggle }: { creator: Creator; following: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/creator/${creator.id}`)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 12 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ fontSize: 22 }}>{creator.avatar}</T>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <T style={{ fontSize: 14.5, fontWeight: '700' }}>{creator.name}</T>
          {creator.verified && <Icon name="check" size={13} stroke={c.accent} sw={2.6} />}
        </View>
        <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>{creator.expertise} · {creator.followers}</T>
      </View>
      <Pressable
        onPress={onToggle}
        style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.line, backgroundColor: following ? 'transparent' : c.accent }}
      >
        <T style={{ fontSize: 12.5, fontWeight: '700', color: following ? c.inkSoft : '#fff' }}>{following ? 'Following' : 'Follow'}</T>
      </Pressable>
    </Pressable>
  );
}

function CreatorCard({ creator, onToggle }: { creator: Creator; onToggle: () => void }) {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/creator/${creator.id}`)}
      style={{ width: 170, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}
    >
      <Photo swatch={creator.swatch} height={80} />
      <View style={{ padding: 12, marginTop: -22 }}>
        <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: c.surface, borderWidth: 2, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 22 }}>{creator.avatar}</T>
        </View>
        <T style={{ fontSize: 14.5, fontWeight: '700', marginTop: 6 }} numberOfLines={1}>{creator.name}</T>
        <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600' }} numberOfLines={1}>{creator.expertise}</T>
        <Pressable onPress={onToggle} style={{ marginTop: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center' }}>
          <T style={{ fontSize: 12.5, fontWeight: '700', color: '#fff' }}>Follow</T>
        </Pressable>
      </View>
    </Pressable>
  );
}
