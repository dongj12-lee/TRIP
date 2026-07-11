import React from 'react';
import { View } from 'react-native';
import { Svg, Path, G } from 'react-native-svg';
import { useTheme } from '@/theme/theme';
import { SEOUL_DISTRICTS, SEOUL_MAP_W, SEOUL_MAP_H } from '@/data/seoulDistricts';
import { T } from './base';

// Read-only Seoul silhouette that "fills in" as districts are collected — the
// hero visual of the passport. Earned gu glow in the accent; locked gu stay
// faint. Watching the map light up is the core dopamine of the collection.
const bare = (n: string) => n.replace(/-gu$/, '');

export function CollectionMap({ earned, height = 250 }: { earned: Set<string>; height?: number }) {
  const { c, dark } = useTheme();
  const lockedFill = dark ? '#2b2824' : '#ece7dd';
  const lockedStroke = dark ? '#3a352e' : '#dcd5c8';

  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${SEOUL_MAP_W} ${SEOUL_MAP_H}`} preserveAspectRatio="xMidYMid meet">
        <G>
          {SEOUL_DISTRICTS.map((d) => {
            const on = earned.has(bare(d.name));
            return (
              <Path
                key={d.name}
                d={d.path}
                fill={on ? c.accent : lockedFill}
                stroke={on ? c.paper : lockedStroke}
                strokeWidth={0.5}
                opacity={on ? 1 : 0.85}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

// Compact chip list of which districts are stamped (for the passport section).
export function DistrictLegend({ earned }: { earned: Set<string> }) {
  const { c } = useTheme();
  const names = SEOUL_DISTRICTS.map((d) => bare(d.name)).filter((n) => earned.has(n));
  if (names.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
      {names.map((n) => (
        <View key={n} style={{ backgroundColor: c.accent50, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 }}>
          <T style={{ fontSize: 11.5, fontWeight: '700', color: c.accent }}>{n}-gu</T>
        </View>
      ))}
    </View>
  );
}
