import React, { useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { H } from './base';

// iOS-style large title that collapses on scroll. Instead of a permanent
// title + descriptive subtitle (a template tell), each tab shows a big title
// at rest that scrolls away behind a slim bar; the compact title + hairline
// fade in as you scroll — the pattern Apple's own apps use.

export const BAR_HEIGHT = 44; // nav-bar height below the status bar

export function useTabScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
  });
  return { scrollY, onScroll };
}

// The slim sticky bar. Its background is always paper (so scrolled content
// passes cleanly beneath it); only the compact title and hairline fade in.
// A `right` action, if given, stays visible at all times.
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
  const titleOpacity = scrollY.interpolate({ inputRange: [18, 46], outputRange: [0, 1], extrapolate: 'clamp' });
  const borderOpacity = scrollY.interpolate({ inputRange: [4, 32], outputRange: [0, 1], extrapolate: 'clamp' });
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, backgroundColor: c.paper, paddingTop: insets.top }}>
      <View style={{ height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ opacity: titleOpacity }}>
          <H style={{ fontSize: 17, color: c.ink }}>{title}</H>
        </Animated.View>
        {right ? <View style={{ position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' }}>{right}</View> : null}
      </View>
      <Animated.View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, opacity: borderOpacity }} />
    </View>
  );
}

// The big in-content title. Sits just below the bar and scrolls away naturally.
export function TabTitle({ title, style }: { title: string; style?: any }) {
  return (
    <View style={[{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10 }, style]}>
      <H style={{ fontSize: 32, lineHeight: 37 }}>{title}</H>
    </View>
  );
}

// Top padding the scroll content needs so the large title clears the bar.
export function useContentTopPadding() {
  const insets = useSafeAreaInsets();
  return insets.top + BAR_HEIGHT;
}
