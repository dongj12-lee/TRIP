import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Photo } from './ui';
import { T, H } from './base';

// The visuals that get captured and shared to Instagram. Deliberately use a
// FIXED brand palette (not the app theme) so shared cards look consistent
// regardless of the user's light/dark mode — it's marketing, not UI.
// 9:16 story format; capture is done at 1080×1920 by the sheet.
export type ShareStop = { name: string; time?: string; category?: string; photoUrl?: string; swatch?: [string, string] | string[] };

// Selectable background moods. `over` is the text/thumbnail treatment.
export type BgKey = 'sunset' | 'night' | 'sage' | 'rose';
export const SHARE_BGS: Record<BgKey, { grad: [string, string]; label: string; emoji: string }> = {
  sunset: { grad: ['#e79a63', '#b04e2a'], label: 'Sunset', emoji: '🌇' },
  night: { grad: ['#48507f', '#20233f'], label: 'Night', emoji: '🌃' },
  sage: { grad: ['#7ba06f', '#3f6b3c'], label: 'Nature', emoji: '🌿' },
  rose: { grad: ['#e084a0', '#b0466a'], label: 'Rosy', emoji: '🌸' },
};

const CREAM = '#fdf3e7';
const CREAM_DIM = 'rgba(253,243,231,0.82)';
const INK = '#2a1d14';
const INK_SOFT = '#6b5647';

export const SHARE_W = 340;
export const SHARE_H = Math.round((SHARE_W * 16) / 9); // 604

function BrandFooter({ handle }: { handle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <H style={{ fontSize: 26, color: CREAM, letterSpacing: 0.5 }}>TRIP</H>
        <T style={{ fontSize: 11.5, fontWeight: '700', color: CREAM_DIM, marginTop: 1 }} numberOfLines={1}>
          {handle ? `@${handle} · ` : ''}Plan your Seoul trip
        </T>
      </View>
      <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ fontSize: 24 }}>📍</T>
      </View>
    </View>
  );
}

// ─── Day route card (timeline of stops) ───────────────────────────────────
export const ShareCard = forwardRef<View, {
  title: string;
  subtitle?: string;
  stops: ShareStop[];
  handle?: string;
  bg?: BgKey;
}>(function ShareCard({ title, subtitle, stops, handle, bg = 'sunset' }, ref) {
  const shown = stops.slice(0, 5);
  const extra = stops.length - shown.length;
  const g = SHARE_BGS[bg];

  return (
    // collapsable=false is required for react-native-view-shot to snapshot it.
    <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: g.grad[1] }}>
      <LinearGradient colors={g.grad} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={{ flex: 1, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 22 }}>
        <T style={{ fontSize: 12, fontWeight: '800', letterSpacing: 2, color: CREAM_DIM }}>🇰🇷  MY SEOUL DAY</T>
        <H style={{ fontSize: 30, lineHeight: 34, color: CREAM, marginTop: 8 }} numberOfLines={2}>{title}</H>
        {!!subtitle && (
          <View style={{ alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(0,0,0,0.18)', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 }}>
            <T style={{ fontSize: 12.5, fontWeight: '700', color: CREAM }}>{subtitle}</T>
          </View>
        )}

        <View style={{ flex: 1, justifyContent: 'center', gap: 9, paddingVertical: 16 }}>
          {shown.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 15, padding: 8 }}>
              <View style={{ width: 30, alignItems: 'center' }}>
                <T style={{ fontSize: 12.5, fontWeight: '800', color: g.grad[1] }}>{s.time || `${i + 1}`}</T>
              </View>
              <View style={{ width: 50, height: 50, borderRadius: 11, overflow: 'hidden' }}>
                <Photo uri={s.photoUrl} swatch={s.swatch ?? ['#c98a5e', '#a8512f']} height={50} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 14.5, fontWeight: '800', color: INK }} numberOfLines={1}>{s.name}</T>
                {!!s.category && <T style={{ fontSize: 11.5, fontWeight: '600', color: INK_SOFT }} numberOfLines={1}>{s.category}</T>}
              </View>
            </View>
          ))}
          {extra > 0 && (
            <T style={{ fontSize: 12.5, fontWeight: '700', color: CREAM_DIM, textAlign: 'center', marginTop: 2 }}>+ {extra} more stop{extra > 1 ? 's' : ''}</T>
          )}
        </View>

        <BrandFooter handle={handle} />
      </LinearGradient>
    </View>
  );
});

// ─── Single-place card (hero photo) ───────────────────────────────────────
export type PlaceShareData = {
  name: string;
  nameKo?: string;
  category?: string;
  neighborhood?: string;
  photoUrl?: string;
  swatch?: [string, string] | string[];
  tags?: string[]; // short "why it's good" chips (e.g. "Solo OK", "English menu")
  rating?: number;
};

export const PlaceShareCard = forwardRef<View, { place: PlaceShareData; handle?: string; bg?: BgKey }>(
  function PlaceShareCard({ place, handle, bg = 'sunset' }, ref) {
    const g = SHARE_BGS[bg];
    return (
      <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: g.grad[1] }}>
        <LinearGradient colors={g.grad} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={{ flex: 1, padding: 18 }}>
          <T style={{ fontSize: 12, fontWeight: '800', letterSpacing: 2, color: CREAM_DIM, marginBottom: 12 }}>🇰🇷  A SEOUL SPOT I LOVE</T>

          {/* Hero photo — fixed height (flex + Photo's own height don't compose) */}
          <View style={{ height: SHARE_H - 36 - 42 - 80, borderRadius: 20, overflow: 'hidden' }}>
            <Photo uri={place.photoUrl} swatch={place.swatch ?? ['#c98a5e', '#a8512f']} height={SHARE_H - 36 - 42 - 80} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 }}>
              {!!place.category && (
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 }}>
                    <T style={{ fontSize: 11.5, fontWeight: '800', color: '#fff' }}>
                      {place.category}{place.neighborhood ? ` · ${place.neighborhood}` : ''}{place.rating != null ? ` · ⭐ ${place.rating}` : ''}
                    </T>
                  </View>
                </View>
              )}
              <H style={{ fontSize: 30, lineHeight: 34, color: '#fff' }} numberOfLines={2}>{place.name}</H>
              {!!place.nameKo && <T style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.86)', marginTop: 2 }}>{place.nameKo}</T>}
              {!!place.tags?.length && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {place.tags.slice(0, 4).map((t, i) => (
                    <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.92)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 }}>
                      <T style={{ fontSize: 11.5, fontWeight: '700', color: INK }}>{t}</T>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <BrandFooter handle={handle} />
          </View>
        </LinearGradient>
      </View>
    );
  },
);
