import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { haptic } from '@/lib/haptics';
import { useToast } from './Toast';
import { FOREIGNER_TAGS, POST_TYPES, normalizePostType, placeBySlug } from '@/data';
import { intentLabel } from '@/data/intents';
import { Place, Post, RouteDay } from '@/data/types';
import { Svg, Path, Circle, G } from 'react-native-svg';
import { SEOUL_DISTRICTS, SEOUL_MAP_W, SEOUL_MAP_H, projectLngLat } from '@/data/seoulDistricts';
import { Icon } from './Icon';
import { Photo, Chip, Rating, TagPill, Flag } from './ui';
import { guLabel } from '@/lib/format';
import { Avatar } from './Avatar';
import { T, H, Card } from './base';

export function PostTypeBadge({ type }: { type: string }) {
  const nt = normalizePostType(type);
  if (nt === 'post') return null; // plain posts carry no badge
  const t = POST_TYPES[nt];
  return <Chip tone={t.tone}>{`${t.emoji} ${t.label}`}</Chip>;
}

// Compact fixed-width card for horizontal carousels (e.g. the "For you" rail).
export function PlaceCardCompact({ place }: { place: Place }) {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/place/${place.slug}`)}
      style={({ pressed }) => [
        { width: 172, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View>
        <Photo uri={place.photoUrl} swatch={place.swatch} height={110} />
        {!!place.kContentTitle && (
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(28,20,14,.55)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 }}>
            <T style={{ color: '#f7efd8', fontSize: 10.5, fontWeight: '700' }}>🎬 {place.kContentTitle}</T>
          </View>
        )}
      </View>
      <View style={{ padding: 11 }}>
        <T style={{ fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{place.name}</T>
        <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
          {intentLabel(place)} · {guLabel(place.neighborhood)}
        </T>
      </View>
    </Pressable>
  );
}

export function PlaceCard({ place, compact = false, reasons }: { place: Place; compact?: boolean; reasons?: string[] }) {
  const { c } = useTheme();
  const router = useRouter();
  const { saved, toggleSave } = useStore();
  const { showToast } = useToast();
  const tags = FOREIGNER_TAGS.filter((t) => (place as any)[t.key]);
  const isSaved = saved.has(place.slug);
  const ph = 156;
  const onSave = () => {
    haptic.tick();
    if (!isSaved) showToast('Saved to your spots', '🔖');
    toggleSave(place.slug);
  };
  return (
    <Card onPress={() => router.push(`/place/${place.slug}`)} style={{ overflow: 'hidden' }}>
      <View>
        <Photo uri={place.photoUrl} swatch={place.swatch} label={place.photoUrl ? undefined : place.category} height={ph} />
        {!!place.kContentTitle && (
          <View style={{ position: 'absolute', top: 10, left: 10 }}>
            <View style={{ backgroundColor: 'rgba(28,20,14,.55)', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 }}>
              <T style={{ color: '#f7efd8', fontSize: 11.5, fontWeight: '700' }}>🎬 {place.kContentTitle}</T>
            </View>
          </View>
        )}
        <Pressable
          onPress={onSave}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
          style={{
            position: 'absolute', top: 8, right: 8, width: 38, height: 38, borderRadius: 999,
            backgroundColor: 'rgba(20,16,12,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="heart" size={20} fill={isSaved ? c.rose : 'none'} stroke={isSaved ? c.rose : '#fff'} sw={2} />
        </Pressable>
      </View>
      <View style={{ padding: 15, paddingTop: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <H style={{ fontSize: 18, flex: 1, lineHeight: 22 }}>{place.name}</H>
          {place.rating != null && <Rating value={place.rating} />}
        </View>
        <T style={{ marginTop: 4, fontSize: 12.5, color: c.inkSoft, fontWeight: '600' }}>
          {[intentLabel(place), guLabel(place.neighborhood), place.priceRange].filter(Boolean).join(' · ')}
        </T>
        {!compact && !!place.kContentNote && (
          <T style={{ marginTop: 9, fontSize: 12.5, lineHeight: 18, color: c.gold700, fontWeight: '600' }}>{place.kContentNote}</T>
        )}
        {/* Screener "why it matches" chips (accent-tinted, distinct from fit tags) */}
        {!!reasons?.length && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
            {reasons.map((r) => (
              <View key={r} style={{ backgroundColor: c.accent50, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 }}>
                <T style={{ fontSize: 11.5, fontWeight: '700', color: c.accent }}>{r}</T>
              </View>
            ))}
          </View>
        )}
        {/* Fit-tag pills only when the place actually has confirmed tags —
            no phantom bottom gap on the imported catalog (tags mostly empty). */}
        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
            {tags.map((t) => (
              <TagPill key={t.key} tag={t} />
            ))}
          </View>
        )}
      </View>
    </Card>
  );
}

export function RoutePreview({ days }: { days: RouteDay[] }) {
  const { c, tone } = useTheme();
  const terra = tone('terra');
  // Prefer the live catalog (real posts reference live slugs); fall back to the
  // bundled seed map so a route still resolves offline / before fetch.
  const { placeBySlug: livePlaces } = useRemoteContent();
  const resolve = (slug?: string) => (slug ? livePlaces[slug] ?? placeBySlug[slug] : undefined);
  const stops = days.flatMap((d) => d.stops);
  const names = stops.map((st) => resolve(st.slug)?.name ?? st.name).filter(Boolean);

  const caption = (
    <View style={{ padding: 12, paddingVertical: 11 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="route" size={14} stroke={terra.fg} sw={2} />
        <T style={{ fontSize: 11.5, fontWeight: '800', color: terra.fg }}>
          {days.length} days · {stops.length} stops
        </T>
      </View>
      <T numberOfLines={1} style={{ marginTop: 5, fontSize: 12.5, color: c.inkSoft, fontWeight: '600' }}>
        {names.slice(0, 4).join('  ›  ')}
        {names.length > 4 ? '  ›  …' : ''}
      </T>
    </View>
  );

  // Project each day's geocoded stops onto the shared Seoul silhouette space.
  const dayPts = days.map((d) =>
    d.stops
      .map((st) => resolve(st.slug))
      .filter((p): p is NonNullable<typeof p> => !!p && typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => projectLngLat(p.lng, p.lat)),
  );
  const allPts = dayPts.flat();

  // Fewer than 2 geocoded stops — no meaningful shape, keep the text preview.
  if (allPts.length < 2) {
    return <View style={{ marginTop: 10, borderRadius: 14, backgroundColor: c.terra50 }}>{caption}</View>;
  }

  // The route drawn over a faint real Seoul silhouette (same projection as the
  // Seoul Passport) — a true "trip map", not an abstract line on blank space.
  return (
    <View style={{ marginTop: 10, borderRadius: 14, backgroundColor: c.surface2, overflow: 'hidden' }}>
      <View style={{ height: 150 }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${SEOUL_MAP_W} ${SEOUL_MAP_H}`} preserveAspectRatio="xMidYMid meet">
          <G>
            {SEOUL_DISTRICTS.map((d) => (
              <Path key={d.name} d={d.path} fill={c.paper} stroke={c.line} strokeWidth={0.4} />
            ))}
          </G>
          {dayPts.map((pts, di) => {
            if (pts.length === 0) return null;
            const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
            return (
              <G key={di}>
                {pts.length > 1 && (
                  <Path d={path} stroke={terra.solid} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.95} />
                )}
                {pts.map((p, i) => {
                  const isStart = di === 0 && i === 0;
                  return (
                    <Circle key={i} cx={p.x} cy={p.y} r={isStart ? 2 : 1.35} fill={isStart ? terra.solid : c.paper} stroke={terra.solid} strokeWidth={isStart ? 0 : 0.8} />
                  );
                })}
              </G>
            );
          })}
        </Svg>
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>{caption}</View>
    </View>
  );
}

export function PostCard({ post }: { post: Post }) {
  const { c, tone } = useTheme();
  const router = useRouter();
  const { votes, toggleVote } = useStore();
  const voteKey = post.id ?? post.slug;
  const voted = votes.has(voteKey);
  const open = () => router.push(`/post/${post.slug}`);
  // Untitled posts lead with their body (tweet-like); titled posts lead with the
  // title. A plain "post" carries no type tag (Threads-style) — only the
  // meaningful kinds, route & question, get a marker.
  const nt = normalizePostType(post.type);
  const leadWithBody = !post.title;
  const showType = nt !== 'post';
  const typeTone = tone(POST_TYPES[nt].tone);
  const typeLabel = POST_TYPES[nt].label;
  const likeN = post.votes + (voted ? 1 : 0);
  return (
    <Card onPress={open} style={{ padding: 16 }}>
      {/* Author row — clean: avatar, name, then one muted meta line. No
          per-type card tint, no emoji soup (real feeds keep the surface neutral). */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <Avatar name={post.author.name} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontSize: 14.5, fontWeight: '800', color: c.ink }} numberOfLines={1}>{post.author.name}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            {showType && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: typeTone.solid }} />
                <T style={{ fontSize: 12, color: typeTone.fg, fontWeight: '700' }}>{typeLabel}</T>
              </View>
            )}
            <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }} numberOfLines={1}>
              {post.when}{post.neighborhood ? `  ·  ${post.neighborhood}` : ''}
            </T>
          </View>
        </View>
      </View>

      {/* Content */}
      {leadWithBody ? (
        <T numberOfLines={6} style={{ marginTop: 11, fontSize: 15.5, lineHeight: 23, color: c.ink }}>{post.body}</T>
      ) : (
        <>
          <H style={{ marginTop: 12, fontSize: 18, lineHeight: 23 }}>{post.title}</H>
          {!!post.body && <T numberOfLines={2} style={{ marginTop: 5, fontSize: 14, lineHeight: 20, color: c.inkSoft }}>{post.body}</T>}
        </>
      )}
      {!!post.imageUrl && (
        <Photo uri={post.imageUrl} height={200} radius={14} style={{ marginTop: 12 }} />
      )}
      {post.routeDays && <RoutePreview days={post.routeDays} />}

      {/* Action row — minimal icon + count, no bordered pills (Threads-style). */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 14 }}>
        <Pressable
          onPress={() => { haptic.tick(); toggleVote(post); }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={voted ? 'Unlike post' : 'Like post'}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Icon name="heart" size={19} fill={voted ? c.rose : 'none'} stroke={voted ? c.rose : c.muted} sw={1.9} />
          {likeN > 0 && <T style={{ fontSize: 13, fontWeight: '700', color: voted ? c.rose : c.muted }}>{likeN}</T>}
        </Pressable>
        <Pressable
          onPress={open}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="View replies"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Icon name="comment" size={19} stroke={c.muted} sw={1.9} />
          {post.comments > 0 && <T style={{ fontSize: 13, fontWeight: '700', color: c.muted }}>{post.comments}</T>}
        </Pressable>
      </View>
    </Card>
  );
}

export function PostCardMini({ post }: { post: Post }) {
  const { c, tone } = useTheme();
  const router = useRouter();
  const nt = normalizePostType(post.type);
  const showType = nt !== 'post';
  const typeTone = tone(POST_TYPES[nt].tone);
  const typeLabel = POST_TYPES[nt].label;
  return (
    <Pressable
      onPress={() => router.push(`/post/${post.slug}`)}
      style={{ padding: 14, paddingVertical: 13, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}
    >
      {showType && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 }}>
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: typeTone.solid }} />
          <T style={{ fontSize: 11.5, color: typeTone.fg, fontWeight: '800' }}>{typeLabel}</T>
        </View>
      )}
      <T style={{ fontSize: 15, fontWeight: '700', lineHeight: 20 }} numberOfLines={2}>{post.title || post.body}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
        {!!post.author && <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>{post.author.name}</T>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="heart" size={13} stroke={c.muted} sw={1.9} />
          <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>{post.votes}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="comment" size={13} stroke={c.muted} sw={1.9} />
          <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>{post.comments}</T>
        </View>
      </View>
    </Pressable>
  );
}
