// "Not that one", pick a replacement for a single stop.
//
// Candidates come from lib/tripEdit.swapCandidates, which keeps the swap
// honest: same kind of slot (a lunch stays lunch), near the surrounding stops
// so the day's geography survives, and never a place already scheduled
// elsewhere on the trip.
import React from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { Place } from '@/data/types';
import { tierOf } from '@/lib/prominence';
import { placeBlurb } from '@/lib/placeBlurb';
import { T, H } from './base';
import { Photo } from './ui';
import { GlassView } from 'expo-glass-effect';
import { GLASS_ON } from './glass';
import { haptic } from '@/lib/haptics';

export function SwapStopSheet({
  visible,
  onClose,
  role,
  current,
  candidates,
  onPick,
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  role: string;
  current: Place | null;
  candidates: Place[];
  onPick: (p: Place) => void;
  onRemove: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ maxHeight: '82%', backgroundColor: GLASS_ON ? 'transparent' : c.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' }}>
        {GLASS_ON && <GlassView glassEffectStyle="regular" pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginTop: 10, marginBottom: 6 }} />

        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}>
          <H style={{ fontSize: 20 }}>Swap this {role.toLowerCase()}</H>
          <T style={{ fontSize: 12.5, color: c.muted, marginTop: 3 }} numberOfLines={1}>
            {current ? `Currently: ${current.name}` : ''}
          </T>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {candidates.length === 0 ? (
            <T style={{ fontSize: 13, color: c.muted, paddingVertical: 24, textAlign: 'center' }}>
              No nearby alternative for this slot, try removing it instead.
            </T>
          ) : (
            <View style={{ gap: 9 }}>
              {candidates.map((p) => (
                <Pressable
                  key={p.slug}
                  onPress={() => { haptic.tick(); onPick(p); }}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 10 }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden' }}>
                    <Photo uri={p.photoUrl} swatch={p.swatch} height={48} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <T style={{ fontSize: 14, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{p.name}</T>
                      {tierOf(p) === 'S' && <T style={{ fontSize: 9.5, fontWeight: '800', color: c.accent }}>★</T>}
                    </View>
                    <T style={{ fontSize: 11.5, color: c.muted, marginTop: 2 }} numberOfLines={1}>
                      {p.categoryL2 || p.category} · {p.neighborhood}
                    </T>
                    {/* You can't choose between five unfamiliar Korean names
                        from the names alone, this is what makes the list
                        pickable rather than a coin flip. */}
                    {!!placeBlurb(p) && (
                      <T style={{ fontSize: 11.5, lineHeight: 16, color: c.inkSoft, marginTop: 3 }} numberOfLines={2}>
                        {placeBlurb(p)}
                      </T>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 14, borderTopWidth: 1, borderTopColor: c.line }}>
          <Pressable
            onPress={() => { haptic.tick(); onRemove(); }}
            style={{ paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: c.line, alignItems: 'center', backgroundColor: c.surface }}
          >
            <T style={{ fontSize: 14, fontWeight: '800', color: c.rose }}>Remove this stop</T>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
