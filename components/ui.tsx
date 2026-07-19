import React from 'react';
import { View, Text, StyleProp, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Line, Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/theme';
import { Tone } from '@/theme/tokens';
import { Icon } from './Icon';

// ─── Foreigner-tag pill (the signature element) ──────────────────────────
export type Tag = { key: string; emoji: string; label: string; tone: Tone };

export function TagPill({
  tag,
  active = true,
  size = 'sm',
  onPress,
}: {
  tag: Tag;
  active?: boolean;
  size?: 'sm' | 'lg';
  onPress?: () => void;
}) {
  const { c, tone } = useTheme();
  const t = tone(tag.tone);
  const padV = size === 'lg' ? 7 : 5;
  const padH = size === 'lg' ? 13 : 10;
  const fs = size === 'lg' ? 14 : 12.5;
  const Wrapper: any = View;
  return (
    <Wrapper
      onStartShouldSetResponder={onPress ? () => true : undefined}
      onResponderRelease={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: padV,
        paddingHorizontal: padH,
        borderRadius: 999,
        backgroundColor: active ? t.bg : 'transparent',
        borderWidth: 1,
        borderColor: active ? 'transparent' : c.line,
      }}
    >
      <Text style={{ fontSize: fs + 1, lineHeight: fs + 3 }}>{tag.emoji}</Text>
      <Text style={{ fontSize: fs, fontWeight: '700', color: active ? t.fg : c.muted, letterSpacing: -0.1 }}>
        {tag.label}
      </Text>
    </Wrapper>
  );
}

// ─── Generic chip ────────────────────────────────────────────────────────
export function Chip({
  tone,
  children,
  style,
  textStyle,
}: {
  tone?: Tone;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { c, tone: toneFn } = useTheme();
  const t = tone ? toneFn(tone) : null;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingVertical: 4,
          paddingHorizontal: 9,
          borderRadius: 999,
          backgroundColor: t ? t.bg : c.surface2,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[{ fontSize: 11.5, fontWeight: '700', letterSpacing: 0.1, color: t ? t.fg : c.inkSoft }, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

// ─── Country flag avatar ─────────────────────────────────────────────────
export function Flag({ country, size = 28 }: { country?: string | null; size?: number }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surface2,
        borderWidth: 1,
        borderColor: c.line,
      }}
    >
      <Text style={{ fontSize: size * 0.55 }}>{country || '🌐'}</Text>
    </View>
  );
}

// ─── Striped photo placeholder (swap for real <Image> later) ─────────────
export function Photo({
  uri,
  swatch = ['#3a2c22', '#a36643'],
  label,
  height = 160,
  radius = 0,
  style,
}: {
  uri?: string;
  swatch?: [string, string] | string[];
  label?: string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [a, b] = swatch;

  if (uri) {
    return (
      <View style={[{ width: '100%', height, borderRadius: radius, overflow: 'hidden', backgroundColor: a }, style]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
        {label ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 8 }}>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 6 }}>
                <Text style={{ fontSize: 10.5, letterSpacing: 0.4, color: 'rgba(255,255,255,0.9)' }}>{label.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[{ width: '100%', height, borderRadius: radius, overflow: 'hidden', backgroundColor: a }, style]}>
      <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="stripes" width={13} height={13} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={13} stroke="#ffffff" strokeWidth={2} opacity={0.16} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#stripes)" />
      </Svg>
      {label ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.22)', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 6 }}>
              <Text style={{ fontSize: 10.5, letterSpacing: 0.4, color: 'rgba(255,255,255,0.82)' }}>
                ◳ {label.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ─── Star rating row ─────────────────────────────────────────────────────
export function Rating({ value, count, size = 13 }: { value: number; count?: number; size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name="star" size={size + 1} fill={c.gold} stroke={c.gold} sw={1} />
      <Text style={{ color: c.gold700, fontSize: size, fontWeight: '700' }}>{value}</Text>
      {count != null && <Text style={{ color: c.muted, fontSize: size, fontWeight: '600' }}>({count})</Text>}
    </View>
  );
}

// ─── Section eyebrow ─────────────────────────────────────────────────────
export function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  const { c } = useTheme();
  return (
    <Text style={{ fontSize: 11.5, fontWeight: '800', letterSpacing: 1.4, color: color || c.accent }}>
      {String(children).toUpperCase()}
    </Text>
  );
}
