import React from 'react';
import { Platform, View, StyleProp, ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

// iOS 26 Liquid Glass available on this device? Constant per session — it's a
// hardware/OS capability. False on web, Android, and pre-26 iOS, where callers
// fall back to a solid surface. Import this instead of re-checking everywhere.
export const GLASS_ON = Platform.OS !== 'web' && isLiquidGlassAvailable();

// A bottom-sheet panel surface: real Liquid Glass on iOS 26, a solid
// `fallbackColor` panel everywhere else. Pass the panel's shape (radius,
// maxHeight, padding) via `style` — do NOT put a backgroundColor there; this
// adds it only on the fallback path (glass provides its own material).
export function SheetSurface({
  style,
  fallbackColor,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  fallbackColor: string;
  children: React.ReactNode;
}) {
  if (GLASS_ON) {
    // overflow hidden so the rounded top corners clip the glass + content.
    return (
      <GlassView glassEffectStyle="regular" style={[{ overflow: 'hidden' }, style] as any}>
        {children}
      </GlassView>
    );
  }
  return <View style={[style, { backgroundColor: fallbackColor }]}>{children}</View>;
}
