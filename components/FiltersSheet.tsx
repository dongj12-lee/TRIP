import React from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { FOREIGNER_TAGS } from '@/data';
import { ForeignerTagKey } from '@/data/types';
import { T, H, Button } from './base';
import { TagPill } from './ui';
import { haptic } from '@/lib/haptics';

// Consolidates the foreigner-tag and neighborhood pickers — previously two
// full-width horizontal scroll rows always on screen — into a single sheet
// behind one "Filters" button, so Explore's default view stays to one
// category rail instead of three competing rows of pills.
export function FiltersSheet({
  visible, onClose,
  activeTags, toggleTag,
  hood, setHood, hoods,
  resultCount,
}: {
  visible: boolean;
  onClose: () => void;
  activeTags: Set<ForeignerTagKey>;
  toggleTag: (k: ForeignerTagKey) => void;
  hood: string | null;
  setHood: (h: string | null) => void;
  hoods: string[];
  resultCount: number;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const hasActive = activeTags.size > 0 || !!hood;

  const clearAll = () => {
    haptic.tick();
    activeTags.forEach((t) => toggleTag(t));
    setHood(null);
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

          <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.6, marginBottom: 10 }}>NEIGHBORHOOD</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <NeighborhoodChip label="All areas" active={!hood} onPress={() => { haptic.tick(); setHood(null); }} />
            {hoods.map((h) => (
              <NeighborhoodChip key={h} label={h} active={hood === h} onPress={() => { haptic.tick(); setHood(hood === h ? null : h); }} />
            ))}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: c.line }}>
          <Button label={`Show ${resultCount} spot${resultCount === 1 ? '' : 's'}`} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function NeighborhoodChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999,
        backgroundColor: active ? c.ink : c.surface,
        borderWidth: 1, borderColor: active ? c.ink : c.line,
      }}
    >
      <T style={{ fontSize: 13, fontWeight: '700', color: active ? c.paper : c.inkSoft }}>{label}</T>
    </Pressable>
  );
}
