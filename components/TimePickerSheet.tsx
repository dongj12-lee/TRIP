import React, { useEffect, useRef } from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { TIME_OPTIONS, to12h, partOfDay } from '@/lib/timeUtils';
import { T, Button } from './base';
import { Icon } from './Icon';

// Tap-to-pick time sheet — no keyboard, no typing. One tap sets the time and
// closes. Auto-scrolls to the current value.
export function TimePickerSheet({
  visible,
  value,
  onSelect,
  onClear,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (hhmm: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const idx = TIME_OPTIONS.indexOf(value);
    if (idx >= 0) {
      // 48px row height; center-ish the selection.
      setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, idx * 48 - 120), animated: false }), 40);
    }
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <View style={{ height: '60%', backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 }}>
          <T style={{ fontSize: 17, fontWeight: '800' }}>Set a time</T>
          {!!value && (
            <Pressable onPress={() => { onClear(); onClose(); }} hitSlop={8}>
              <T style={{ fontSize: 13.5, fontWeight: '700', color: c.muted }}>Clear</T>
            </Pressable>
          )}
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
          {TIME_OPTIONS.map((t) => {
            const on = t === value;
            return (
              <Pressable
                key={t}
                onPress={() => { onSelect(t); onClose(); }}
                style={{
                  height: 48, borderRadius: 12, paddingHorizontal: 14, marginBottom: 2,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: on ? c.accent50 : 'transparent',
                }}
              >
                <T style={{ fontSize: 15.5, fontWeight: on ? '800' : '600', color: on ? c.accent : c.ink }}>{to12h(t)}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>{partOfDay(t)}</T>
                  {on && <Icon name="check" size={16} stroke={c.accent} sw={2.6} />}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
