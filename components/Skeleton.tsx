import React, { useEffect } from 'react';
import { View, Animated, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';
import { useReducedMotion } from '@/lib/reducedMotion';

// Loading placeholders shown during the initial live-content fetch, so the
// screen never flashes seed/demo data that then swaps to the real list.
// All blocks share one module-level pulse so they breathe in unison.
const pulse = new Animated.Value(0.5);
let pulseRunning = false;
function ensurePulse() {
  if (pulseRunning) return;
  pulseRunning = true;
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]),
  ).start();
}

export function Skeleton({
  w,
  h,
  r = 8,
  style,
}: {
  w?: number | `${number}%`;
  h: number;
  r?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!reduced) ensurePulse();
  }, [reduced]);
  // Reduce Motion: a static placeholder at a steady mid-opacity instead of the
  // breathing pulse loop.
  return (
    <Animated.View
      style={[{ width: w ?? '100%', height: h, borderRadius: r, backgroundColor: c.line, opacity: reduced ? 0.7 : pulse }, style]}
    />
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
      {children}
    </View>
  );
}

// Mirrors PlaceCard: photo, title row, meta line, tag pills.
export function SkeletonPlaceCard() {
  return (
    <CardShell>
      <Skeleton h={144} r={0} />
      <View style={{ padding: 15, paddingTop: 13, gap: 9 }}>
        <Skeleton w="72%" h={18} />
        <Skeleton w="48%" h={12} />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
          <Skeleton w={84} h={24} r={999} />
          <Skeleton w={96} h={24} r={999} />
          <Skeleton w={72} h={24} r={999} />
        </View>
      </View>
    </CardShell>
  );
}

// Mirrors PostCard: avatar + name, two body lines, action pills.
export function SkeletonPostCard() {
  return (
    <CardShell>
      <View style={{ padding: 15, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Skeleton w={38} h={38} r={999} />
          <View style={{ flex: 1, gap: 5 }}>
            <Skeleton w="42%" h={13} />
            <Skeleton w="28%" h={10} />
          </View>
        </View>
        <Skeleton w="94%" h={14} />
        <Skeleton w="64%" h={14} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
          <Skeleton w={64} h={30} r={999} />
          <Skeleton w={64} h={30} r={999} />
        </View>
      </View>
    </CardShell>
  );
}

// Mirrors ThemeCard: cover photo + title + subtitle.
export function SkeletonThemeCard() {
  return (
    <CardShell>
      <Skeleton h={150} r={0} />
      <View style={{ padding: 14, gap: 8 }}>
        <Skeleton w="62%" h={19} />
        <Skeleton w="84%" h={12} />
      </View>
    </CardShell>
  );
}

// Mirrors BuddyCard: emoji tile + title/meta, note lines.
export function SkeletonBuddyCard() {
  return (
    <CardShell>
      <View style={{ padding: 15, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton w={46} h={46} r={13} />
          <View style={{ flex: 1, gap: 6, paddingTop: 2 }}>
            <Skeleton w="70%" h={16} />
            <Skeleton w="52%" h={11} />
          </View>
        </View>
        <Skeleton w="92%" h={12} />
        <Skeleton w="55%" h={12} />
      </View>
    </CardShell>
  );
}

// A padded vertical stack of n skeleton cards.
export function SkeletonList({
  card: CardComp,
  n = 4,
}: {
  card: () => React.JSX.Element;
  n?: number;
}) {
  return (
    <View style={{ paddingHorizontal: 18, gap: 12, paddingTop: 6 }}>
      {Array.from({ length: n }, (_, i) => (
        <CardComp key={i} />
      ))}
    </View>
  );
}
