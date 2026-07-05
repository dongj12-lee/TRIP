// Thin, crash-safe wrapper around expo-haptics. No-ops on web and if the
// platform lacks a haptics engine, so call sites don't need platform guards.
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const on = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  // A light tick for toggles (save, vote, react, tab switch).
  tick() {
    if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  // A more definite tap for committing an action (join, share, post).
  press() {
    if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  // Success confirmation.
  success() {
    if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
