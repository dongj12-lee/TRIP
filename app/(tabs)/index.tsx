import React, { useMemo, useState } from 'react';
import { View, FlatList, ScrollView, Pressable, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { FOREIGNER_TAGS } from '@/data';
import { useRemoteContent } from '@/lib/remoteData';
import { useStore } from '@/lib/store';
import { personalizedPlaces } from '@/lib/personalize';
import { ForeignerTagKey, Place } from '@/data/types';
import { T, H } from '@/components/base';
import { PlaceCard, PlaceCardCompact } from '@/components/cards';
import { ExploreMap } from '@/components/ExploreMap';
import { Icon } from '@/components/Icon';
import { Eyebrow, TagPill } from '@/components/ui';

// Cap map pins so the Seoul map doesn't turn into an unreadable pin-cloud
// once hundreds of places are loaded.
const MAX_MAP_PINS = 40;

export default function ExploreScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { places, refreshAll } = useRemoteContent();
  const { profile } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<Set<ForeignerTagKey>>(new Set());
  const [hood, setHood] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  const hoods = useMemo(() => Array.from(new Set(places.map((p) => p.neighborhood))).sort(), [places]);

  // Distinct categories, most common first.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    places.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([cat]) => cat);
  }, [places]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (![...activeTags].every((t) => (p as any)[t])) return false;
      if (hood && p.neighborhood !== hood) return false;
      if (category && p.category !== category) return false;
      if (q) {
        const hay = `${p.name} ${p.nameKo} ${p.category} ${p.neighborhood} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [places, query, activeTags, hood, category]);

  const toggleTag = (k: ForeignerTagKey) =>
    setActiveTags((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const mapPlaces = useMemo(() => filtered.slice(0, MAX_MAP_PINS), [filtered]);

  // "For you" is only meaningful when the user hasn't narrowed the list themselves.
  const noFilters = !query && !hood && !category && activeTags.size === 0;
  const forYou = useMemo(
    () => (noFilters ? personalizedPlaces(places, profile.interests, 12) : []),
    [noFilters, places, profile.interests],
  );

  const header = (
    <>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 12 }}>
        <H style={{ fontSize: 32, lineHeight: 36 }}>Explore</H>
        <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>
          {filtered.length} of {places.length} spots
        </T>
      </View>

      {/* Search bar — primary discovery tool, kept at the top */}
      <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.line,
            borderRadius: 14, paddingHorizontal: 13, height: 46,
          }}
        >
          <Icon name="search" size={18} stroke={c.muted} sw={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search places, food, areas…"
            placeholderTextColor={c.muted}
            style={{ flex: 1, fontSize: 15, color: c.ink, fontFamily: 'Jakarta' }}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="close" size={18} stroke={c.muted} sw={2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* For you (only when nothing is filtered/searched) */}
      {forYou.length > 0 && (
        <View style={{ paddingBottom: 16 }}>
          <View style={{ paddingHorizontal: 18, marginBottom: 10 }}>
            <Eyebrow>For you</Eyebrow>
            <T style={{ fontSize: 12.5, color: c.muted, marginTop: 2 }}>
              {profile.interests.length ? 'Picked from your interests' : 'K-content spots to start with'}
            </T>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 18 }}>
            {forYou.map((p) => (
              <PlaceCardCompact key={p.slug} place={p} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Map (hidden while searching to keep results focused) */}
      {showMap && !query && (
        <View style={{ marginHorizontal: 18, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: c.line, marginBottom: 12 }}>
          <ExploreMap places={mapPlaces} selectedSlug={selected} onSelect={setSelected} height={220} />
        </View>
      )}

      {/* Category rail */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingBottom: 10 }}>
        <Chip label="All types" active={!category} onPress={() => setCategory(null)} />
        {categories.map((cat) => (
          <Chip key={cat} label={cat} active={category === cat} onPress={() => setCategory(category === cat ? null : cat)} />
        ))}
      </ScrollView>

      {/* Foreigner-tag rail */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingBottom: 10 }}>
        {FOREIGNER_TAGS.map((t) => (
          <TagPill key={t.key} tag={t} active={activeTags.has(t.key)} onPress={() => toggleTag(t.key)} />
        ))}
      </ScrollView>

      {/* Neighborhood rail */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingBottom: 12 }}>
        <Chip label="All areas" active={!hood} onPress={() => setHood(null)} dark />
        {hoods.map((h) => (
          <Chip key={h} label={h} active={hood === h} onPress={() => setHood(hood === h ? null : h)} dark />
        ))}
      </ScrollView>

      {/* List header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 }}>
        <T style={{ fontSize: 13.5, fontWeight: '700', color: c.ink }} numberOfLines={1}>
          {category || hood || 'All spots'} · {filtered.length}
        </T>
        {!query && (
          <Pressable onPress={() => setShowMap((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>{showMap ? 'Hide map' : 'Show map'}</T>
            <Icon name="arrow" size={15} stroke={c.accent} sw={2} />
          </Pressable>
        )}
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.slug}
        renderItem={({ item }: { item: Place }) => (
          <View style={{ paddingHorizontal: 18, paddingBottom: 12 }}>
            <PlaceCard place={item} />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={{ paddingVertical: 50, alignItems: 'center', paddingHorizontal: 40 }}>
            <T style={{ fontSize: 28 }}>🔍</T>
            <T style={{ color: c.muted, marginTop: 8, textAlign: 'center' }}>
              {query ? `No spots match "${query}".` : 'No spots match those filters.'}
            </T>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={9}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}
      />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  dark,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  dark?: boolean;
}) {
  const { c } = useTheme();
  const activeBg = dark ? c.ink : c.accent;
  const activeFg = dark ? c.paper : '#fff';
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
        backgroundColor: active ? activeBg : c.surface,
        borderWidth: 1, borderColor: active ? activeBg : c.line,
      }}
    >
      <T style={{ fontSize: 13, fontWeight: '700', color: active ? activeFg : c.inkSoft }}>{label}</T>
    </Pressable>
  );
}
