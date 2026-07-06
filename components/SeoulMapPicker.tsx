import React from 'react';
import { View } from 'react-native';
import { Svg, Path, G } from 'react-native-svg';
import { useTheme } from '@/theme/theme';
import { T } from './base';
import { SEOUL_DISTRICTS, SEOUL_MAP_W, SEOUL_MAP_H } from '@/data/seoulDistricts';

// Small per-label nudges (in viewBox units) to separate the few centroids that
// sit close together, so no two "-gu" labels overlap.
const LABEL_NUDGE: Record<string, [number, number]> = {
  'Gwangjin-gu': [7, 6], // sits under Seongdong-gu at its centroid; shift toward its real SE position
};

// A real map of Seoul's 25 자치구, drawn from official boundary geometry (see
// data/seoulDistricts.ts) — unmistakably Seoul, unlike floating name chips.
// Tap a district to filter; districts with no imported places are dimmed.
export function SeoulMapPicker({
  active,
  onSelect,
  available,
}: {
  active: string | null; // district *name without -gu* (matches place.neighborhood, e.g. "Gangnam")
  onSelect: (name: string | null) => void;
  available?: Set<string>;
}) {
  const { c, dark } = useTheme();
  // place.neighborhood is the bare gu name ("Gangnam"); map data is "Gangnam-gu".
  const bare = (name: string) => name.replace(/-gu$/, '');
  const has = (name: string) => !available || available.has(bare(name));

  const fillFor = (name: string) => {
    if (active === bare(name)) return c.accent;
    if (!has(name)) return dark ? '#2b2824' : '#eceae4';
    return dark ? '#3a4a44' : '#e4ede3'; // soft land tint
  };

  return (
    <View style={{ width: '100%', aspectRatio: SEOUL_MAP_W / SEOUL_MAP_H }}>
      <Svg width="100%" height="100%" viewBox={`-1 -1 ${SEOUL_MAP_W + 2} ${SEOUL_MAP_H + 2}`}>
        <G strokeLinejoin="round">
          {SEOUL_DISTRICTS.map((d) => {
            const on = active === bare(d.name);
            return (
              <Path
                key={d.name}
                d={d.path}
                fill={fillFor(d.name)}
                stroke={on ? c.accent : c.paper}
                strokeWidth={on ? 0.8 : 0.7}
                opacity={has(d.name) ? 1 : 0.55}
                onPress={() => has(d.name) && onSelect(on ? null : bare(d.name))}
              />
            );
          })}
        </G>
        {/* The Han River — the single most recognizable feature of Seoul —
            traced through the seams between the north-bank (Gangbuk) and
            south-bank (Gangnam) districts. */}
        <Path
          d="M-3 49 C 12 50, 24 53, 36 53 S 54 55, 64 53 S 82 51, 94 50 L 103 50"
          fill="none"
          stroke={c.mapWater}
          strokeWidth={2.6}
          strokeLinecap="round"
          opacity={0.9}
        />
      </Svg>

      {/* Labels overlaid at each district's centroid. Kept compact; the full
          "-gu" name is shown per the map convention. */}
      {SEOUL_DISTRICTS.map((d) => {
        const on = active === bare(d.name);
        const dim = !has(d.name);
        const [nx, ny] = LABEL_NUDGE[d.name] ?? [0, 0];
        return (
          <View
            key={d.name}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: `${((d.cx + nx) / SEOUL_MAP_W) * 100}%`,
              top: `${((d.cy + ny) / SEOUL_MAP_H) * 100}%`,
              transform: [{ translateX: -43 }, { translateY: -6 }],
              width: 86,
              alignItems: 'center',
            }}
          >
            <T
              style={{
                fontSize: 8,
                fontWeight: on ? '800' : '700',
                color: on ? '#fff' : dim ? c.muted : c.ink,
                opacity: dim ? 0.6 : 1,
                textShadowColor: on ? 'transparent' : dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)',
                textShadowOffset: { width: 0, height: 0.5 },
                textShadowRadius: 1.5,
              }}
              numberOfLines={1}
            >
              {d.name}
            </T>
          </View>
        );
      })}
    </View>
  );
}
