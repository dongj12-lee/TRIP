import React, { useMemo, useState } from 'react';
import { View, Modal, Pressable, TextInput, FlatList, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRemoteContent } from '@/lib/remoteData';
import { Place } from '@/data/types';
import { Suggestion } from '@/lib/routeSuggest';
import { Icon } from './Icon';
import { Photo, Eyebrow } from './ui';
import { T, Button } from './base';

// Bottom-sheet place picker for the trip planner. Searching the real place DB
// means an added stop carries coordinates/category/photo (so route-health and
// thumbnails work), while "Add a custom stop" keeps free-text flexibility for
// things the DB doesn't have (transit legs, a friend's recommendation, etc.).
// `suggestions` (from lib/routeSuggest.ts) surface a "for this day" rail above
// search — proximity/interest/co-occurrence picks, each with a plain-language reason.
export function AddStopSheet({
  visible,
  onClose,
  onAddPlace,
  onAddCustom,
  suggestions = [],
}: {
  visible: boolean;
  onClose: () => void;
  onAddPlace: (place: Place) => void;
  onAddCustom: () => void;
  suggestions?: Suggestion[];
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { places } = useRemoteContent();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places.slice(0, 20);
    return places
      .filter((p) => `${p.name} ${p.nameKo} ${p.category} ${p.neighborhood}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [places, query]);

  const handleAdd = (p: Place) => {
    onAddPlace(p);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <View style={{ height: '85%', backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginBottom: 14 }} />

        {suggestions.length > 0 && !query && (
          <View style={{ paddingBottom: 14 }}>
            <View style={{ paddingHorizontal: 18, marginBottom: 10 }}>
              <Eyebrow>✨ Suggested for this day</Eyebrow>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 18 }}>
              {suggestions.map((s) => (
                <Pressable
                  key={s.place.slug}
                  onPress={() => handleAdd(s.place)}
                  style={({ pressed }) => [
                    { width: 150, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Photo uri={s.place.photoUrl} swatch={s.place.swatch} height={80} />
                  <View style={{ padding: 9 }}>
                    <T style={{ fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{s.place.name}</T>
                    <T style={{ fontSize: 10.5, color: c.accent, fontWeight: '600', marginTop: 3, lineHeight: 13 }} numberOfLines={2}>
                      {s.reason}
                    </T>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ paddingHorizontal: 18 }}>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 13, height: 46,
            }}
          >
            <Icon name="search" size={18} stroke={c.muted} sw={2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search a place to add…"
              placeholderTextColor={c.muted}
              style={{ flex: 1, fontSize: 15, color: c.ink, fontFamily: 'Jakarta' }}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Icon name="close" size={18} stroke={c.muted} sw={2} />
              </Pressable>
            )}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(p) => p.slug}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: insets.bottom + 90 }}
          ListHeaderComponent={
            <Button
              label="+ Add a custom stop (transit, etc.)"
              variant="soft"
              style={{ marginBottom: 14 }}
              onPress={() => {
                onAddCustom();
                setQuery('');
                onClose();
              }}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <T style={{ color: c.muted }}>No places match "{query}".</T>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleAdd(item)}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
                pressed && { opacity: 0.6 },
              ]}
            >
              <View style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden' }}>
                <Photo uri={item.photoUrl} swatch={item.swatch} height={52} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 14.5, fontWeight: '700' }} numberOfLines={1}>{item.name}</T>
                <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }} numberOfLines={1}>
                  {item.category} · {item.neighborhood}
                </T>
              </View>
              <Icon name="plus" size={20} stroke={c.accent} sw={2.2} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
