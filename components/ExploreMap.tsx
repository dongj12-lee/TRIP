import React from 'react';
import { View, Pressable } from 'react-native';
import { Svg, Rect, Path, G } from 'react-native-svg';
import { useTheme } from '@/theme/theme';
import { Place } from '@/data/types';
import { T } from './base';
import { WebMap } from './WebMap';
import { categoryPinColor } from './webMapHtml';

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

// Sentinel id for the one-off pin from a live Naver search result (not part
// of the app's own catalog) — chosen to never collide with a real place slug.
export const EXTERNAL_PIN_ID = '__external__';

export function ExploreMap({
  places,
  selectedSlug,
  onSelect,
  savedSlugs,
  externalPin,
  height = 220,
}: {
  places: Place[];
  selectedSlug: string | null;
  onSelect: (id: string | null) => void;
  savedSlugs?: Set<string>;
  externalPin?: { lat: number; lng: number } | null;
  height?: number;
}) {
  if (places.length === 0 && !externalPin) return <FallbackExploreMap places={places} selectedSlug={selectedSlug} onSelect={onSelect} height={height} />;
  const pins = places.map((p) => ({
    id: p.slug,
    lat: p.lat,
    lng: p.lng,
    color: categoryPinColor(p.category, p.categoryL2),
    selected: p.slug === selectedSlug,
    saved: savedSlugs?.has(p.slug) ?? false,
  }));
  if (externalPin) {
    pins.push({ id: EXTERNAL_PIN_ID, lat: externalPin.lat, lng: externalPin.lng, external: true, selected: true } as any);
  }
  return (
    <WebMap
      height={height}
      cluster
      pins={pins}
      onPinPress={(id) => onSelect(id)}
      fallback={<FallbackExploreMap places={places} selectedSlug={selectedSlug} onSelect={onSelect} height={height} />}
    />
  );
}

// Styled stand-in for when no Naver Maps client ID is configured yet.
function FallbackExploreMap({
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
                width: 32, height: 32, borderRadius: 14, borderBottomLeftRadius: 6,
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
