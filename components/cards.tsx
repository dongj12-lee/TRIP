import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { FOREIGNER_TAGS, POST_TYPES, placeBySlug } from '@/data';
import { Place, Post, RouteDay } from '@/data/types';
import { Icon } from './Icon';
import { Photo, Chip, Rating, TagPill, Flag } from './ui';
import { T, H, Card } from './base';

export function PostTypeBadge({ type }: { type: string }) {
  const t = POST_TYPES[type] || POST_TYPES.tip;
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
        { width: 172, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View>
        <Photo uri={place.photoUrl} swatch={place.swatch} height={110} label={place.photoUrl ? undefined : place.category} />
        {!!place.kContentTitle && (
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(28,20,14,.55)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 }}>
            <T style={{ color: '#f7efd8', fontSize: 10.5, fontWeight: '700' }}>🎬 {place.kContentTitle}</T>
          </View>
        )}
      </View>
      <View style={{ padding: 11 }}>
        <T style={{ fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{place.name}</T>
        <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
          {place.category} · {place.neighborhood}
        </T>
      </View>
    </Pressable>
  );
}

export function PlaceCard({ place, compact = false }: { place: Place; compact?: boolean }) {
  const { c } = useTheme();
  const router = useRouter();
  const { saved, toggleSave } = useStore();
  const tags = FOREIGNER_TAGS.filter((t) => (place as any)[t.key]);
  const isSaved = saved.has(place.slug);
  const ph = 144;
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
          onPress={() => toggleSave(place.slug)}
          hitSlop={6}
          style={{
            position: 'absolute', top: 8, right: 8, width: 38, height: 38, borderRadius: 999,
            backgroundColor: 'rgba(255,253,250,.85)', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="heart" size={20} fill={isSaved ? c.rose : 'none'} stroke={isSaved ? c.rose : c.inkSoft} sw={2} />
        </Pressable>
      </View>
      <View style={{ padding: 15, paddingTop: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <H style={{ fontSize: 18, flex: 1, lineHeight: 22 }}>{place.name}</H>
          {place.rating != null && <Rating value={place.rating} />}
        </View>
        <T style={{ marginTop: 4, fontSize: 12.5, color: c.inkSoft, fontWeight: '600' }}>
          {place.category} · {place.neighborhood} · {place.priceRange}
        </T>
        {!compact && !!place.kContentNote && (
          <T style={{ marginTop: 9, fontSize: 12.5, lineHeight: 18, color: c.gold700, fontWeight: '600' }}>{place.kContentNote}</T>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
          {tags.map((t) => (
            <TagPill key={t.key} tag={t} />
          ))}
        </View>
      </View>
    </Card>
  );
}

export function RoutePreview({ days }: { days: RouteDay[] }) {
  const { c, tone } = useTheme();
  const terra = tone('terra');
  const stops = days.flatMap((d) => d.stops);
  const names = stops.map((st) => (st.slug && placeBySlug[st.slug] ? placeBySlug[st.slug].name : st.name)).filter(Boolean);
  return (
    <View style={{ marginTop: 10, padding: 12, paddingVertical: 10, borderRadius: 13, backgroundColor: c.terra50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="route" size={14} stroke={terra.fg} sw={2} />
        <T style={{ fontSize: 11.5, fontWeight: '700', color: terra.fg }}>
          {days.length} days · {stops.length} stops
        </T>
      </View>
      <T numberOfLines={1} style={{ marginTop: 5, fontSize: 12.5, color: c.inkSoft, fontWeight: '600' }}>
        {names.slice(0, 4).join('  ›  ')}
        {names.length > 4 ? '  ›  …' : ''}
      </T>
    </View>
  );
}

export function PostCard({ post }: { post: Post }) {
  const { c } = useTheme();
  const router = useRouter();
  const { votes, toggleVote } = useStore();
  const voteKey = post.id ?? post.slug;
  const voted = votes.has(voteKey);
  return (
    <Card onPress={() => router.push(`/post/${post.slug}`)} style={{ padding: 15 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <PostTypeBadge type={post.type} />
        {!!post.neighborhood && <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600' }}>📍 {post.neighborhood}</T>}
      </View>
      <H style={{ marginTop: 8, fontSize: 17, lineHeight: 21 }}>{post.title}</H>
      <T numberOfLines={2} style={{ marginTop: 5, fontSize: 13.5, lineHeight: 20, color: c.inkSoft }}>{post.body}</T>
      {post.routeDays && <RoutePreview days={post.routeDays} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Flag country={post.author.country} size={22} />
          <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '600' }}>{post.author.name}</T>
          <T style={{ fontSize: 12, color: c.muted }} numberOfLines={1}>· {post.when} · 💬 {post.comments}</T>
        </View>
        <Pressable
          onPress={() => toggleVote(post)}
          hitSlop={6}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999,
            borderWidth: 1, borderColor: voted ? c.rose : c.line, backgroundColor: voted ? c.rose50 : c.surface,
          }}
        >
          <Icon name="heart" size={17} fill={voted ? c.rose : 'none'} stroke={voted ? c.rose : c.inkSoft} sw={1.9} />
          <T style={{ fontSize: 12.5, fontWeight: '700', color: voted ? c.rose700 : c.inkSoft }}>{post.votes + (voted ? 1 : 0)}</T>
        </Pressable>
      </View>
    </Card>
  );
}

export function PostCardMini({ post }: { post: Post }) {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/post/${post.slug}`)}
      style={{ padding: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}
    >
      <PostTypeBadge type={post.type} />
      <T style={{ marginTop: 8, fontSize: 14.5, fontWeight: '700', lineHeight: 19 }}>{post.title}</T>
      <T style={{ marginTop: 5, fontSize: 12, color: c.muted, fontWeight: '600' }}>
        {post.author ? `${post.author.country} ${post.author.name} · ` : ''}▲ {post.votes} · 💬 {post.comments}
      </T>
    </Pressable>
  );
}
