import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useRemoteContent } from '@/lib/remoteData';
import { plural } from '@/lib/format';
import { CREATORS, creatorById, tierFor } from '@/data';
import { Creator } from '@/data/types';
import { T, H, Card, Button, IconButton } from '@/components/base';
import { PlaceCard, PostCardMini } from '@/components/cards';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icon';
import { Photo } from '@/components/ui';
import { Avatar } from '@/components/Avatar';

export default function MyScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saved, following, toggleFollow, itinerary, sharedPost, shareTrip, profile, myPostCount } = useStore();
  const { placeBySlug, posts } = useRemoteContent();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);

  const onFollowToggle = (cr: Creator) => {
    const wasFollowing = following.has(cr.id);
    toggleFollow(cr.id);
    showToast(wasFollowing ? `Unfollowed ${cr.name}` : `Following ${cr.name}`, wasFollowing ? undefined : '✓');
  };

  const name = profile.displayName || 'You';
  const handle = profile.handle || 'traveler';
  const points = profile.points ?? 0;
  const tier = tierFor(points);
  const savedPlaces = [...saved].map((s) => placeBySlug[s]).filter(Boolean);
  const followingList = CREATORS.filter((cr) => following.has(cr.id));
  const suggestions = CREATORS.filter((cr) => !following.has(cr.id));
  // The user's own posts — real, not the seeded mock contributions.
  const myPosts = user ? posts.filter((p) => p.authorId === user.id) : [];

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H style={{ fontSize: 32 }}>My TRIP</H>
          <IconButton name="settings" onPress={() => router.push('/settings')} color={c.inkSoft} />
        </View>

        {/* Identity — tap to edit */}
        <Pressable onPress={() => setEditing(true)} style={{ paddingHorizontal: 18, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={name} uri={profile.avatarUrl} size={56} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <H style={{ fontSize: 20 }} numberOfLines={1}>{name}</H>
              <View style={{ backgroundColor: c.accent50, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 }}>
                <T style={{ fontSize: 11.5, fontWeight: '700', color: c.accent }}>{tier.emoji} {tier.label}</T>
              </View>
            </View>
            <T style={{ fontSize: 13, color: c.muted, marginTop: 1 }}>@{handle} · Tap to edit</T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <H style={{ fontSize: 20, color: c.accent }}>{points}</H>
            <T style={{ fontSize: 10.5, color: c.muted, fontWeight: '700' }}>PTS</T>
          </View>
        </Pressable>

        {/* Stats — real usage */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 14 }}>
          <Stat n={myPostCount} label="Posts" />
          <Stat n={saved.size} label="Saved" />
          <Stat n={following.size} label="Following" />
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
              🗓 {itinerary.dates} · {itinerary.travelers} · {plural(itinerary.days.length, 'day')} ·{' '}
              {plural(itinerary.days.reduce((s, d) => s + d.stops.length, 0), 'stop')}
            </T>
            <View style={{ marginTop: 12, gap: 8 }}>
              {itinerary.days.map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <T style={{ fontSize: 11.5, fontWeight: '800', color: c.accent, width: 42 }}>{d.label}</T>
                  <T style={{ flex: 1, fontSize: 13, color: c.ink, fontWeight: '600' }} numberOfLines={1}>{d.theme}</T>
                  <T style={{ fontSize: 12, color: c.muted }}>{plural(d.stops.length, 'stop')}</T>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button label="Open & edit" icon="edit" variant="soft" style={{ flex: 1 }} onPress={() => router.push('/planner')} />
              <Button
                label={sharedPost ? '✓ Shared' : 'Share'}
                icon={sharedPost ? undefined : 'share'}
                variant={sharedPost ? 'soft' : 'primary'}
                style={{ flex: 1 }}
                onPress={async () => {
                  if (!sharedPost) {
                    await shareTrip('');
                    showToast('Shared — feedback incoming', '🙏');
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
              <CreatorRow key={cr.id} creator={cr} following onToggle={() => onFollowToggle(cr)} />
            ))}
          </Section>
        )}

        {/* Creators to follow */}
        <Section title="Creators to follow">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 18 }}>
            {suggestions.map((cr) => (
              <CreatorCard key={cr.id} creator={cr} onToggle={() => onFollowToggle(cr)} />
            ))}
          </ScrollView>
        </Section>

        {/* My contributions — the user's own posts, or an empty state */}
        <Section title="My contributions">
          {myPosts.length === 0 ? (
            <Pressable
              onPress={() => router.push('/compose?kind=post')}
              style={{ padding: 24, alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line }}
            >
              <T style={{ fontSize: 26 }}>✍️</T>
              <T style={{ color: c.ink, marginTop: 6, fontWeight: '700' }}>Share your first tip</T>
              <T style={{ color: c.muted, marginTop: 2, fontSize: 12.5, textAlign: 'center' }}>Post a tip or a route and help the next traveler.</T>
            </Pressable>
          ) : (
            <View style={{ gap: 10 }}>
              {myPosts.map((p) => (
                <PostCardMini key={p.id ?? p.slug} post={p} />
              ))}
            </View>
          )}
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

      <EditProfileSheet visible={editing} onClose={() => setEditing(false)} />
    </View>
  );
}

// Circular avatar: real photo if set, else initials on an accent tint.
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
