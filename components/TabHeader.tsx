import React, { useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { H, T } from './base';

// iOS-style large title that collapses on scroll. Instead of a permanent
// title + descriptive subtitle (a template tell), each tab shows a big title
// at rest that scrolls away behind a slim bar; the compact title + hairline
// fade in as you scroll — the pattern Apple's own apps use.
//
// The bar is transparent at rest (so the large title sits right under the
// status bar with no dead gap) and only paints its paper background + compact
// title + hairline once you scroll — the large title slides up beneath it.

const BAR_HEIGHT = 44; // nav-bar band below the status bar

export function useTabScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
  });
  return { scrollY, onScroll };
}

export function TabBar({
  title,
  scrollY,
  right,
}: {
  title: string;
  scrollY: Animated.Value;
  right?: React.ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const bgOpacity = scrollY.interpolate({ inputRange: [16, 44], outputRange: [0, 1], extrapolate: 'clamp' });
  const titleOpacity = scrollY.interpolate({ inputRange: [30, 54], outputRange: [0, 1], extrapolate: 'clamp' });
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, paddingTop: insets.top }}>
      {/* Paper background + hairline — fade in only once scrolled */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + BAR_HEIGHT, backgroundColor: c.paper, opacity: bgOpacity }}
      />
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, top: insets.top + BAR_HEIGHT, height: StyleSheet.hairlineWidth, backgroundColor: c.line, opacity: bgOpacity }}
      />
      <View style={{ height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View pointerEvents="none" style={{ opacity: titleOpacity }}>
          <H style={{ fontSize: 17, color: c.ink }}>{title}</H>
        </Animated.View>
        {right ? <View style={{ position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' }}>{right}</View> : null}
      </View>
    </View>
  );
}

// The big in-content title. Sits just under the status bar and scrolls away
// beneath the (transparent-at-rest) bar. `subtitle` is a one-line purpose
// statement — used only where the tab name alone doesn't say what it's for
// (kept short and concrete, never generic marketing copy, so it doesn't read
// as templated boilerplate).
export function TabTitle({ title, subtitle, style }: { title: string; subtitle?: string; style?: any }) {
  const { c } = useTheme();
  return (
    <View style={[{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10 }, style]}>
      <H style={{ fontSize: 32, lineHeight: 37 }}>{title}</H>
      {!!subtitle && (
        <T style={{ fontSize: 13, color: c.inkSoft, fontWeight: '600', marginTop: 3 }}>{subtitle}</T>
      )}
    </View>
  );
}

// Top padding the scroll content needs. Small — the bar is transparent at rest,
// so the large title tucks right under the status bar with no empty band.
export function useContentTopPadding() {
  const insets = useSafeAreaInsets();
  return insets.top + 8;
}
