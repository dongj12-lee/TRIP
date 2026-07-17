import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/theme/theme';
import { T } from './base';

// Round avatar — the user's photo if set, otherwise their initial on an
// accent-tinted circle (deterministic hue variation keeps a feed of avatars
// from looking monotonous).
const HUES = ['#c2569b', '#5b7a99', '#4a9d8e', '#e0a05a', '#8a6fc0', '#c75c54'];

export function Avatar({ name, uri, size = 40 }: { name: string; uri?: string; size?: number }) {
  const { c } = useTheme();
  const trimmed = (name || '').trim();
  const initial = (trimmed[0] || 'You'[0]).toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 999, borderWidth: 1, borderColor: c.line }} />;
  }
  let h = 0;
  for (let i = 0; i < trimmed.length; i++) h = (h * 31 + trimmed.charCodeAt(i)) >>> 0;
  const hue = HUES[h % HUES.length];
  return (
    <View
      style={{
        width: size, height: size, borderRadius: 999, backgroundColor: `${hue}22`,
        borderWidth: 1, borderColor: `${hue}55`, alignItems: 'center', justifyContent: 'center',
      }}
    >
      <T style={{ fontSize: size * 0.42, fontWeight: '800', color: hue, fontFamily: 'Pretendard-ExtraBold' }}>{initial}</T>
    </View>
  );
}
