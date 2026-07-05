import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { FOREIGNER_TAGS } from '@/data';
import { useRemoteContent } from '@/lib/remoteData';
import { ForeignerTagKey } from '@/data/types';
import { T, H } from '@/components/base';
import { PlaceCard } from '@/components/cards';
import { ExploreMap } from '@/components/ExploreMap';
import { Icon } from '@/components/Icon';
import { TagPill } from '@/components/ui';

export default function ExploreScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { places } = useRemoteContent();

  const [activeTags, setActiveTags] = useState<Set<ForeignerTagKey>>(new Set());
  const [hood, setHood] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  const hoods = useMemo(() => Array.from(new Set(places.map((p) => p.neighborhood))), [places]);

  const filtered = useMemo(
    () =>
      places.filter(
        (p) =>
          [...activeTags].every((t) => (p as any)[t]) && (!hood || p.neighborhood === hood),
      ),
    [places, activeTags, hood],
  );

  const toggleTag = (k: ForeignerTagKey) =>
    setActiveTags((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView
        stickyHeaderIndices={[]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 10 }}>
          <H style={{ fontSize: 32, lineHeight: 36 }}>Explore</H>
          <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>
            {filtered.length} spots in Seoul
          </T>
        </View>

        {/* Map */}
        {showMap && (
          <View style={{ marginHorizontal: 18, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: c.line, marginBottom: 12 }}>
            <ExploreMap places={filtered} selectedSlug={selected} onSelect={setSelected} height={220} />
          </View>
        )}

        {/* Tag filter rail */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingBottom: 10 }}>
          {FOREIGNER_TAGS.map((t) => (
            <TagPill key={t.key} tag={t} active={activeTags.has(t.key)} onPress={() => toggleTag(t.key)} />
          ))}
        </ScrollView>

        {/* Neighborhood rail */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingBottom: 12 }}>
          <HoodChip label="All areas" active={!hood} onPress={() => setHood(null)} />
          {hoods.map((h) => (
            <HoodChip key={h} label={h} active={hood === h} onPress={() => setHood(hood === h ? null : h)} />
          ))}
        </ScrollView>

        {/* List header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 }}>
          <T style={{ fontSize: 13.5, fontWeight: '700', color: c.ink }}>
            {hood || 'All areas'} · {filtered.length} spots
          </T>
          <Pressable onPress={() => setShowMap((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>{showMap ? 'See all' : 'Show map'}</T>
            <Icon name="arrow" size={15} stroke={c.accent} sw={2} />
          </Pressable>
        </View>

        {/* Place list */}
        <View style={{ paddingHorizontal: 18, gap: 12 }}>
          {filtered.map((p) => (
            <PlaceCard key={p.slug} place={p} />
          ))}
          {filtered.length === 0 && (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <T style={{ color: c.muted }}>No spots match those filters.</T>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function HoodChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
        backgroundColor: active ? c.ink : c.surface,
        borderWidth: 1, borderColor: active ? c.ink : c.line,
      }}
    >
      <T style={{ fontSize: 13, fontWeight: '700', color: active ? c.paper : c.inkSoft }}>{label}</T>
    </Pressable>
  );
}
