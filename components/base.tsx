import React from 'react';
import {
  View, Text, Pressable, StyleProp, ViewStyle, TextStyle, ScrollView,
  ScrollViewProps, TextProps, PressableProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { Icon, IconName } from './Icon';

// Weight → Jakarta family map (RN needs a distinct family per weight).
const JAKARTA: Record<string, string> = {
  '400': 'Jakarta',
  '500': 'Jakarta-Medium',
  '600': 'Jakarta-SemiBold',
  '700': 'Jakarta-Bold',
  '800': 'Jakarta-ExtraBold',
};
function jakartaFamily(weight?: TextStyle['fontWeight']) {
  const w = String(weight ?? '400');
  if (w === '650' || w === '750') return JAKARTA['700'];
  if (w === 'bold') return JAKARTA['700'];
  return JAKARTA[w] ?? 'Jakarta';
}

// Body text — defaults to Plus Jakarta Sans, resolves weight → family.
export function T({ style, ...props }: TextProps) {
  const { c } = useTheme();
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : (style as TextStyle) || {};
  const family = flat.fontFamily || jakartaFamily(flat.fontWeight);
  return <Text {...props} style={[{ color: c.ink, fontFamily: family }, style, { fontFamily: family }]} />;
}

// Display heading — Fraunces serif.
export function H({
  style,
  italic,
  ...props
}: TextProps & { italic?: boolean }) {
  const { c } = useTheme();
  return (
    <Text
      {...props}
      style={[
        { color: c.ink, fontFamily: italic ? 'Fraunces-Italic' : 'Fraunces', letterSpacing: -0.3 },
        style,
      ]}
    />
  );
}

// Full-screen container with paper background + top safe-area padding.
export function Screen({
  children,
  style,
  edges = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: c.paper, paddingTop: edges ? insets.top : 0 }, style]}>
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { c, shadow } = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.line,
    ...(shadow as object),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { transform: [{ scale: 0.985 }] }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// Screen title block (e.g. "Explore" + subtitle).
export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
      <View style={{ flex: 1 }}>
        <H style={{ fontSize: 32, lineHeight: 38 }}>{title}</H>
        {subtitle ? <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2 }}>{subtitle}</T> : null}
      </View>
      {right}
    </View>
  );
}

// Detail-screen header with a back button.
export function DetailHeader({ title, right }: { title?: string; right?: React.ReactNode }) {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
      <IconButton name="back" label="Go back" onPress={() => router.back()} />
      {title ? <H style={{ fontSize: 19, flex: 1 }} numberOfLines={1}>{title}</H> : <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  size = 22,
  color,
  bg,
  style,
  label,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
  label?: string; // screen-reader name; falls back to the icon name
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label ?? name}
      style={({ pressed }) => [
        {
          width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
          backgroundColor: bg ?? 'transparent',
        },
        pressed && { opacity: 0.6 },
        style,
      ]}
    >
      <Icon name={name} size={size} stroke={color ?? c.ink} sw={2} />
    </Pressable>
  );
}

// Primary CTA button.
export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'soft' | 'ghost';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, shadow } = useTheme();
  const bg = disabled ? c.line : variant === 'primary' ? c.accent : variant === 'soft' ? c.surface : 'transparent';
  const fg = disabled ? c.muted : variant === 'primary' ? '#fff' : c.ink;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        {
          height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
          backgroundColor: bg,
          borderWidth: variant === 'soft' ? 1 : 0,
          borderColor: c.line,
          ...(variant === 'primary' && !disabled ? (shadow as object) : {}),
        },
        pressed && !disabled && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={18} stroke={fg} sw={2} /> : null}
      <T style={{ color: fg, fontSize: 16, fontWeight: '700' }}>{label}</T>
    </Pressable>
  );
}

export type { ScrollViewProps, PressableProps };
export { ScrollView };
