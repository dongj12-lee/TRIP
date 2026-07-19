import React, { useEffect, useRef } from 'react';
import { View, Modal, Pressable, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { ConquestTier } from '@/lib/stamps';
import { haptic } from '@/lib/haptics';
import { useReducedMotion } from '@/lib/reducedMotion';
import { T, H, Button } from './base';

// A reward moment shown when a district-conquest tier is newly reached. Simple
// confetti (falling emoji) + the unlocked title + a share CTA — the payoff that
// makes filling the passport feel worth it.
const CONFETTI = ['🎉', '✨', '🎊', '⭐', '🏙️', '🎫'];

export function CelebrationOverlay({
  tier,
  onClose,
  onShare,
}: {
  tier: ConquestTier | null;
  onClose: () => void;
  onShare: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(0)).current;
  const pieces = useRef(
    Array.from({ length: 16 }, (_, i) => ({
      x: 6 + (i * 6.1) % 92,
      delay: (i % 8) * 90,
      emoji: CONFETTI[i % CONFETTI.length],
      fall: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    if (!tier) return;
    haptic.success();
    // Reduce Motion: the dialog appears at rest (Modal's fade carries it in),
    // no spring pop and no falling confetti.
    if (reduced) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }).start();
    pieces.forEach((p) => {
      p.fall.setValue(0);
      Animated.timing(p.fall, { toValue: 1, duration: 2600, delay: p.delay, easing: Easing.linear, useNativeDriver: true }).start();
    });
  }, [tier, reduced]);

  if (!tier) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,11,20,0.72)', alignItems: 'center', justifyContent: 'center', padding: 28 }} onPress={onClose}>
        {/* Confetti — suppressed under Reduce Motion */}
        {!reduced && pieces.map((p, i) => (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute', top: -30, left: `${p.x}%`, fontSize: 22,
              transform: [
                { translateY: p.fall.interpolate({ inputRange: [0, 1], outputRange: [0, 760] }) },
                { rotate: p.fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '220deg'] }) },
              ],
              opacity: p.fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            }}
          >
            {p.emoji}
          </Animated.Text>
        ))}

        <Animated.View
          style={{
            width: '100%', maxWidth: 340, backgroundColor: c.paper, borderRadius: 22, padding: 26, alignItems: 'center',
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
            opacity: pop,
          }}
        >
          <T style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: c.accent }}>MILESTONE UNLOCKED</T>
          <T style={{ fontSize: 72, marginTop: 8 }}>{tier.emoji}</T>
          <H style={{ fontSize: 26, marginTop: 6, textAlign: 'center' }}>{tier.title}</H>
          <T style={{ fontSize: 14, color: c.inkSoft, fontWeight: '600', marginTop: 6, textAlign: 'center', lineHeight: 20 }}>{tier.blurb}</T>

          <Button label="Share it" icon="share" style={{ marginTop: 22, alignSelf: 'stretch' }} onPress={() => { onClose(); onShare(); }} />
          <Pressable onPress={onClose} hitSlop={8} style={{ paddingVertical: 12, marginTop: 2 }}>
            <T style={{ fontSize: 14, fontWeight: '700', color: c.muted }}>Keep exploring</T>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
