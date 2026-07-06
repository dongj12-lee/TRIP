import React from 'react';
import { View, Pressable } from 'react-native';
import { Svg, Rect, Path, G } from 'react-native-svg';
import { useTheme } from '@/theme/theme';
import { Place } from '@/data/types';
import { T } from './base';

// Styled stand-in for a real Naver/Kakao Maps SDK (see README Assets note).
// `sub` is category_l2 — lets Cuisine (cafes/bars/restaurants all share the
// same L1) still get a distinct pin per kind.
function pinEmoji(cat: string, sub?: string | null) {
  if (sub?.includes('Cafe')) return '☕';
  if (sub?.includes('Bar')) return '🍺';
  if (sub?.includes('Restaurant')) return '🍜';
  if (cat.includes('Culture')) return '🎭';
  if (cat.includes('History')) return '🏯';
  if (cat.includes('Nature')) return '🌳';
  if (cat.includes('Shopping')) return '🛍️';
  if (cat.includes('Experience')) return '🎟️';
  if (cat.includes('Cuisine')) return '🍽️';
  return '📍';
}

export function ExploreMap({
  places,
  selectedSlug,
  onSelect,
  height = 220,
}: {
  places: Place[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  height?: number;
}) {
  const { c } = useTheme();
  if (places.length === 0) {
    return <View style={{ height, backgroundColor: c.mapBg }} />;
  }
  const lats = places.map((p) => p.lat);
  const lngs = places.map((p) => p.lng);
  const minLa = Math.min(...lats), maxLa = Math.max(...lats);
  const minLn = Math.min(...lngs), maxLn = Math.max(...lngs);
  const padX = (maxLn - minLn) * 0.22 || 0.004;
  const padY = (maxLa - minLa) * 0.28 || 0.004;
  const x = (lng: number) => 6 + 88 * ((lng - minLn + padX) / (maxLn - minLn + 2 * padX));
  const y = (lat: number) => 92 - 80 * ((lat - minLa + padY) / (maxLa - minLa + 2 * padY));

  return (
    <View style={{ height, backgroundColor: c.mapBg, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <Rect x={2} y={6} width={30} height={22} rx={2} fill={c.mapPark} opacity={0.7} />
        <Rect x={70} y={60} width={34} height={30} rx={2} fill={c.mapPark} opacity={0.55} />
        <Path d="M-5 40 Q30 34 52 46 T105 52 L105 60 Q60 54 40 64 T-5 70 Z" fill={c.mapWater} />
        <G stroke={c.mapRoad} fill="none" strokeLinecap="round">
          <Path d="M-5 24 H105" strokeWidth={3.4} />
          <Path d="M-5 78 H105" strokeWidth={3} />
          <Path d="M26 -5 V105" strokeWidth={3.2} />
          <Path d="M74 -5 V105" strokeWidth={2.8} />
          <Path d="M-5 52 H105" strokeWidth={1.4} opacity={0.8} />
          <Path d="M50 -5 V105" strokeWidth={1.4} opacity={0.8} />
        </G>
      </Svg>
      {places.map((p) => {
        const on = p.slug === selectedSlug;
        return (
          <Pressable
            key={p.slug}
            onPress={() => onSelect(on ? null : p.slug)}
            style={{
              position: 'absolute',
              left: `${x(p.lng)}%`,
              top: `${y(p.lat)}%`,
              transform: [{ translateX: -16 }, { translateY: -32 }],
            }}
          >
            <View
              style={{
                width: 32, height: 32, borderRadius: 16, borderBottomLeftRadius: 2,
                transform: [{ rotate: '45deg' }],
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? c.accent : c.surface,
                borderWidth: 2, borderColor: c.surface,
              }}
            >
              <T style={{ transform: [{ rotate: '-45deg' }], fontSize: 14 }}>{pinEmoji(p.category, p.categoryL2)}</T>
            </View>
          </Pressable>
        );
      })}
      <View style={{ position: 'absolute', left: 12, bottom: 12, backgroundColor: c.surface, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 }}>
        <T style={{ fontSize: 9.5, color: c.muted, fontWeight: '600' }}>SEOUL · 서울</T>
      </View>
    </View>
  );
}
