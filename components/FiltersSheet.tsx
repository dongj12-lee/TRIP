import React from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { FOREIGNER_TAGS } from '@/data';
import { ForeignerTagKey } from '@/data/types';
import { T, H, Button } from './base';
import { TagPill } from './ui';
import { SeoulMapPicker } from './SeoulMapPicker';
import { haptic } from '@/lib/haptics';

// Consolidates the foreigner-tag and neighborhood pickers — previously two
// full-width horizontal scroll rows always on screen — into a single sheet
// behind one "Filters" button, so Explore's default view stays to one
// category rail instead of three competing rows of pills.
export function FiltersSheet({
  visible, onClose,
  activeTags, toggleTag,
  selectedHoods, toggleHood, clearHoods, hoods,
  resultCount,
}: {
  visible: boolean;
  onClose: () => void;
  activeTags: Set<ForeignerTagKey>;
  toggleTag: (k: ForeignerTagKey) => void;
  selectedHoods: Set<string>;
  toggleHood: (h: string) => void;
  clearHoods: () => void;
  hoods: string[];
  resultCount: number;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const hasActive = activeTags.size > 0 || selectedHoods.size > 0;

  const clearAll = () => {
    haptic.tick();
    activeTags.forEach((t) => toggleTag(t));
    clearHoods();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <View style={{ maxHeight: '80%', backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginTop: 10, marginBottom: 6 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}>
          <H style={{ fontSize: 20 }}>Filters</H>
          {hasActive && (
            <Pressable onPress={clearAll} hitSlop={8}>
              <T style={{ fontSize: 13.5, fontWeight: '700', color: c.accent }}>Clear all</T>
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.6, marginBottom: 10 }}>FOREIGNER-FRIENDLY</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {FOREIGNER_TAGS.map((t) => (
              <TagPill key={t.key} tag={t} active={activeTags.has(t.key)} onPress={() => { haptic.tick(); toggleTag(t.key); }} size="lg" />
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.6 }}>NEIGHBORHOOD</T>
            {selectedHoods.size > 0 && (
              <Pressable onPress={() => { haptic.tick(); clearHoods(); }} hitSlop={6}>
                <T style={{ fontSize: 12.5, fontWeight: '700', color: c.accent }}>
                  Clear · {selectedHoods.size === 1 ? [...selectedHoods][0] : `${selectedHoods.size} areas`}
                </T>
              </Pressable>
            )}
          </View>
          <T style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>Tap districts on the map — pick as many as you like.</T>
          <SeoulMapPicker
            selected={selectedHoods}
            onToggle={(h) => { haptic.tick(); toggleHood(h); }}
            available={new Set(hoods)}
          />
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: c.line }}>
          <Button label={`Show ${resultCount} spot${resultCount === 1 ? '' : 's'}`} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
