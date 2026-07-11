import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Photo } from './ui';
import { T, H } from './base';

// The visual that gets captured and shared to Instagram. Deliberately uses a
// FIXED warm brand palette (not the app theme) so every shared card looks the
// same regardless of the user's light/dark mode — it's marketing, not UI.
// 9:16 story format; capture is done at 1080×1920 by the sheet.
export type ShareStop = { name: string; time?: string; category?: string; photoUrl?: string; swatch?: [string, string] | string[] };

const BRAND = {
  top: '#e79a63',
  bottom: '#b04e2a',
  card: 'rgba(255,255,255,0.96)',
  ink: '#2a1d14',
  inkSoft: '#6b5647',
  cream: '#fdf3e7',
  creamDim: 'rgba(253,243,231,0.82)',
};

export const SHARE_W = 340;
export const SHARE_H = Math.round((SHARE_W * 16) / 9); // 604

export const ShareCard = forwardRef<View, {
  title: string;
  subtitle?: string;
  stops: ShareStop[];
  handle?: string;
}>(function ShareCard({ title, subtitle, stops, handle }, ref) {
  const shown = stops.slice(0, 5);
  const extra = stops.length - shown.length;

  return (
    // collapsable=false is required for react-native-view-shot to snapshot it.
    <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: BRAND.bottom }}>
      <LinearGradient colors={[BRAND.top, BRAND.bottom]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={{ flex: 1, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 22 }}>
        {/* Header */}
        <T style={{ fontSize: 12, fontWeight: '800', letterSpacing: 2, color: BRAND.creamDim }}>🇰🇷  MY SEOUL DAY</T>
        <H style={{ fontSize: 30, lineHeight: 34, color: BRAND.cream, marginTop: 8 }} numberOfLines={2}>{title}</H>
        {!!subtitle && (
          <View style={{ alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(0,0,0,0.18)', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 }}>
            <T style={{ fontSize: 12.5, fontWeight: '700', color: BRAND.cream }}>{subtitle}</T>
          </View>
        )}

        {/* Stop timeline */}
        <View style={{ flex: 1, justifyContent: 'center', gap: 9, paddingVertical: 16 }}>
          {shown.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: BRAND.card, borderRadius: 15, padding: 8 }}>
              <View style={{ width: 30, alignItems: 'center' }}>
                <T style={{ fontSize: 12.5, fontWeight: '800', color: BRAND.bottom }}>{s.time || `${i + 1}`}</T>
              </View>
              <View style={{ width: 50, height: 50, borderRadius: 11, overflow: 'hidden' }}>
                <Photo uri={s.photoUrl} swatch={s.swatch ?? ['#c98a5e', '#a8512f']} height={50} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 14.5, fontWeight: '800', color: BRAND.ink }} numberOfLines={1}>{s.name}</T>
                {!!s.category && <T style={{ fontSize: 11.5, fontWeight: '600', color: BRAND.inkSoft }} numberOfLines={1}>{s.category}</T>}
              </View>
            </View>
          ))}
          {extra > 0 && (
            <T style={{ fontSize: 12.5, fontWeight: '700', color: BRAND.creamDim, textAlign: 'center', marginTop: 2 }}>+ {extra} more stop{extra > 1 ? 's' : ''}</T>
          )}
        </View>

        {/* Footer brand lockup */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <H style={{ fontSize: 26, color: BRAND.cream, letterSpacing: 0.5 }}>TRIP</H>
            <T style={{ fontSize: 11.5, fontWeight: '700', color: BRAND.creamDim, marginTop: 1 }}>
              {handle ? `@${handle} · ` : ''}Plan your Seoul trip
            </T>
          </View>
          <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontSize: 24 }}>📍</T>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});
