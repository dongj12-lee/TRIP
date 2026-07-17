import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useRemoteContent } from '@/lib/remoteData';
import { plural, guLabel } from '@/lib/format';
import { tierFor, TIERS } from '@/data';
import { Place } from '@/data/types';
import { T, H, Card, Button, IconButton } from '@/components/base';
import { PlaceCardCompact, PostCardMini } from '@/components/cards';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { CollectionMap } from '@/components/CollectionMap';
import { milestoneStamps, progressFor, passportRank } from '@/lib/stamps';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icon';
import { Photo } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { haptic } from '@/lib/haptics';

export default function MyScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saved, toggleSave, itinerary, sharedPost, shareTrip, profile, myPostCount, placeReactions, stamps, joined } = useStore();
  const { placeBySlug, posts } = useRemoteContent();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);


  const name = profile.displayName || 'You';
  const handle = profile.handle || 'traveler';
  const points = profile.points ?? 0;
  const tier = tierFor(points);
  const nextTier = TIERS[TIERS.findIndex((t) => t.key === tier.key) + 1];
  const savedPlaces = [...saved].map((s) => placeBySlug[s]).filter(Boolean);
  const likedPlaces = Object.entries(placeReactions)
    .filter(([, r]) => r === 'like')
    .map(([slug]) => placeBySlug[slug])
    .filter(Boolean);
  // Passport progress (place stamps ∪ live milestones).
  const earnedStamps = new Set<string>([
    ...stamps,
    ...milestoneStamps({
      savedCount: saved.size,
      hasPlan: itinerary.days.some((d) => d.stops.some((s) => s.name.trim())),
      hasShared: !!sharedPost || myPostCount > 0,
      buddyCount: joined.size,
    }),
  ]);
  const earnedDistricts = new Set<string>();
  earnedStamps.forEach((k) => { if (k.startsWith('district:')) earnedDistricts.add(k.slice('district:'.length)); });
  const passportProg = progressFor(earnedStamps);
  const passportRankInfo = passportRank(earnedStamps.size);
  const passportPct = Math.round((earnedStamps.size / passportProg.total) * 100);
  // The user's own posts — real, not the seeded mock contributions.
  const myPosts = user ? posts.filter((p) => p.authorId === user.id) : [];

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H style={{ fontSize: 32 }}>My TRIP</H>
          <IconButton name="settings" label="Settings" onPress={() => router.push('/settings')} color={c.inkSoft} />
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

        {/* Tier progress — the path to the next badge */}
        {nextTier && (
          <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
            <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                <T style={{ fontSize: 12, fontWeight: '700', color: c.inkSoft }}>{tier.emoji} {tier.label}</T>
                <T style={{ fontSize: 12, fontWeight: '600', color: c.muted }}>
                  {nextTier.min - points} pts to {nextTier.emoji} {nextTier.label}
                </T>
              </View>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: c.surface2, overflow: 'hidden' }}>
                <View
                  style={{
                    height: 6, borderRadius: 999, backgroundColor: c.accent,
                    width: `${Math.min(100, Math.max(4, ((points - tier.min) / (nextTier.min - tier.min)) * 100))}%`,
                  }}
                />
              </View>
              <T style={{ fontSize: 11, color: c.muted, marginTop: 7 }}>Earn points by posting tips, routes and voting on Foreigner Fit.</T>
            </View>
          </View>
        )}

        {/* Stats — real usage */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 14 }}>
          <Stat n={myPostCount} label="Posts" />
          <Stat n={saved.size} label="Saved" />
          <Stat n={likedPlaces.length} label="Liked" />
        </View>

        {/* Seoul Passport — the district-fill collection, taps into /passport */}
        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
          <Pressable
            onPress={() => { haptic.tick(); router.push('/passport'); }}
            accessibilityRole="button"
            accessibilityLabel="Open Seoul Passport"
            style={({ pressed }) => [
              { backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.line, overflow: 'hidden' },
              pressed && { opacity: 0.92 },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, paddingTop: 13 }}>
              <T style={{ fontSize: 11, fontWeight: '800', color: c.accent, letterSpacing: 1 }}>🎫 SEOUL PASSPORT</T>
              <View style={{ flex: 1 }} />
              <T style={{ fontSize: 12, fontWeight: '700', color: c.inkSoft }}>{passportRankInfo.emoji} {passportRankInfo.title}</T>
              <Icon name="chevron" size={16} stroke={c.muted} sw={2} />
            </View>
            <CollectionMap earned={earnedDistricts} height={158} />
            <View style={{ paddingHorizontal: 15, paddingBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <T style={{ fontSize: 12.5, fontWeight: '700', color: c.ink }}>{passportProg.districts}/25 districts · {earnedStamps.size}/{passportProg.total} stamps</T>
                <T style={{ fontSize: 12.5, fontWeight: '800', color: c.accent }}>{passportPct}%</T>
              </View>
              <View style={{ height: 7, borderRadius: 999, backgroundColor: c.surface2, overflow: 'hidden' }}>
                <View style={{ height: 7, borderRadius: 999, backgroundColor: c.accent, width: `${Math.max(3, passportPct)}%` }} />
              </View>
            </View>
          </Pressable>
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

        {/* Liked spots — quick jump back to what resonated */}
        {likedPlaces.length > 0 && (
          <Section title="Liked spots">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 18 }}>
              {likedPlaces.map((p) => (
                <PlaceCardCompact key={p.slug} place={p} />
              ))}
            </ScrollView>
          </Section>
        )}

        {/* Saved places — compact scannable rows (full cards buried the list) */}
        <Section title={savedPlaces.length > 0 ? `Saved places · ${savedPlaces.length}` : 'Saved places'}>
          {savedPlaces.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line }}>
              <T style={{ fontSize: 26 }}>🔖</T>
              <T style={{ color: c.muted, marginTop: 6, fontWeight: '600' }}>Start exploring — tap ♥ on any spot.</T>
            </View>
          ) : (
            <View style={{ gap: 9 }}>
              {savedPlaces.map((p) => (
                <SavedRow
                  key={p.slug}
                  place={p}
                  onOpen={() => router.push(`/place/${p.slug}`)}
                  onUnsave={() => { haptic.tick(); toggleSave(p.slug); showToast('Removed from saved', '🗑'); }}
                />
              ))}
            </View>
          )}
        </Section>
      </ScrollView>

      <EditProfileSheet visible={editing} onClose={() => setEditing(false)} />
    </View>
  );
}

function SavedRow({ place, onOpen, onUnsave }: { place: Place; onOpen: () => void; onUnsave: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onOpen}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 10 }}
    >
      <View style={{ width: 46, height: 46, borderRadius: 11, overflow: 'hidden' }}>
        <Photo uri={place.photoUrl} swatch={place.swatch} height={46} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{place.name}</T>
        <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600' }} numberOfLines={1}>
          {place.category} · {guLabel(place.neighborhood)}
        </T>
      </View>
      <Pressable onPress={onUnsave} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${place.name} from saved`} style={{ padding: 4 }}>
        <Icon name="heart" size={18} fill={c.rose} stroke={c.rose} sw={1.6} />
      </Pressable>
    </Pressable>
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

