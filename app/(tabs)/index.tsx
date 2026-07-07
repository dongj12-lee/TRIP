import React, { useMemo, useState } from 'react';
import { View, FlatList, ScrollView, Pressable, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRemoteContent } from '@/lib/remoteData';
import { useStore } from '@/lib/store';
import { recommendedPlaces } from '@/lib/recommend';
import { ForeignerTagKey, Place } from '@/data/types';
import { T, H } from '@/components/base';
import { PlaceCard, PlaceCardCompact } from '@/components/cards';
import { ExploreMap } from '@/components/ExploreMap';
import { Icon } from '@/components/Icon';
import { Eyebrow } from '@/components/ui';
import { FiltersSheet } from '@/components/FiltersSheet';
import { SeoulWeather } from '@/components/SeoulWeather';
import { haptic } from '@/lib/haptics';

const CATEGORY_EMOJI: Record<string, string> = {
  Culture: '🎭', History: '🏯', Nature: '🌳', Shopping: '🛍️',
  Cuisine: '🍽️', 'Experience Programs': '🎟️',
};

// Cap map pins so the Seoul map doesn't turn into an unreadable pin-cloud
// once hundreds of places are loaded.
const MAX_MAP_PINS = 40;

export default function ExploreScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { places, posts, refreshAll } = useRemoteContent();
  const { profile } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<Set<ForeignerTagKey>>(new Set());
  const [selectedHoods, setSelectedHoods] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [subsubcategory, setSubsubcategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hoods = useMemo(() => Array.from(new Set(places.map((p) => p.neighborhood))).sort(), [places]);

  // Distinct categories, most common first.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    places.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([cat]) => cat);
  }, [places]);

  // Drill-down: sub-categories only make sense once a top category is picked,
  // and only for places within it that actually have an L2 tag.
  const subcategories = useMemo(() => {
    if (!category) return [];
    const counts = new Map<string, number>();
    places.forEach((p) => {
      if (p.category === category && p.categoryL2) counts.set(p.categoryL2, (counts.get(p.categoryL2) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [places, category]);

  const subsubcategories = useMemo(() => {
    if (!category || !subcategory) return [];
    const counts = new Map<string, number>();
    places.forEach((p) => {
      if (p.category === category && p.categoryL2 === subcategory && p.categoryL3) {
        counts.set(p.categoryL3, (counts.get(p.categoryL3) ?? 0) + 1);
      }
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [places, category, subcategory]);

  const selectCategory = (cat: string | null) => {
    setCategory(cat);
    setSubcategory(null);
    setSubsubcategory(null);
  };
  const selectSubcategory = (sub: string | null) => {
    setSubcategory(sub);
    setSubsubcategory(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (![...activeTags].every((t) => (p as any)[t])) return false;
      if (selectedHoods.size && !selectedHoods.has(p.neighborhood)) return false;
      if (category && p.category !== category) return false;
      if (subcategory && p.categoryL2 !== subcategory) return false;
      if (subsubcategory && p.categoryL3 !== subsubcategory) return false;
      if (q) {
        const hay = `${p.name} ${p.nameKo} ${p.category} ${p.neighborhood} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [places, query, activeTags, selectedHoods, category, subcategory, subsubcategory]);

  const activeFilterCount = activeTags.size + selectedHoods.size;

  const toggleTag = (k: ForeignerTagKey) =>
    setActiveTags((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const toggleHood = (h: string) =>
    setSelectedHoods((prev) => {
      const n = new Set(prev);
      n.has(h) ? n.delete(h) : n.add(h);
      return n;
    });
  const clearHoods = () => setSelectedHoods(new Set());

  const mapPlaces = useMemo(() => filtered.slice(0, MAX_MAP_PINS), [filtered]);

  // "Recommended" only shows when the user hasn't narrowed the list themselves.
  const noFilters = !query && selectedHoods.size === 0 && !category && activeTags.size === 0;
  const recommended = useMemo(
    () => (noFilters ? recommendedPlaces(places, posts, 12) : []),
    [noFilters, places, posts],
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

      {/* Live Seoul weather — shown at the top of the default Explore view */}
      {noFilters && <SeoulWeather />}

      {/* Recommended (only when nothing is filtered/searched) — driven by what
          other travelers liked and put in their routes. */}
      {recommended.length > 0 && (
        <View style={{ paddingBottom: 16 }}>
          <View style={{ paddingHorizontal: 18, marginBottom: 10 }}>
            <Eyebrow>Recommended</Eyebrow>
            <T style={{ fontSize: 12.5, color: c.muted, marginTop: 2 }}>
              Liked by travelers & in their routes
            </T>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 18 }}>
            {recommended.map((p) => (
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

      {/* Category rail — the one filter kept always visible; icon-forward for quick scanning */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingBottom: 10 }}>
        <Chip label="All types" active={!category} onPress={() => selectCategory(null)} />
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={CATEGORY_EMOJI[cat] ? `${CATEGORY_EMOJI[cat]} ${cat}` : cat}
            active={category === cat}
            onPress={() => selectCategory(category === cat ? null : cat)}
          />
        ))}
      </ScrollView>

      {/* Sub-category drill-down — only appears once a top category with real
          sub-groups is picked, mirroring Visit Seoul's own L1 → L2 → L3 tree
          instead of flattening everything into one giant list. */}
      {subcategories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingBottom: 10 }}>
          <Chip label={`All ${category}`} active={!subcategory} onPress={() => selectSubcategory(null)} dark />
          {subcategories.map((sub) => (
            <Chip key={sub} label={sub} active={subcategory === sub} onPress={() => selectSubcategory(subcategory === sub ? null : sub)} dark />
          ))}
        </ScrollView>
      )}
      {subcategory && subsubcategories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingBottom: 10 }}>
          <Chip label={`All ${subcategory}`} active={!subsubcategory} onPress={() => setSubsubcategory(null)} />
          {subsubcategories.map((s) => (
            <Chip key={s} label={s} active={subsubcategory === s} onPress={() => setSubsubcategory(subsubcategory === s ? null : s)} />
          ))}
        </ScrollView>
      )}

      {/* Everything else (foreigner-fit tags, neighborhood) lives behind one
          Filters button, so the default view never shows more than one row
          of pills at a time. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingBottom: 12 }}>
        <Pressable
          onPress={() => { haptic.tick(); setFiltersOpen(true); }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
            backgroundColor: activeFilterCount > 0 ? c.ink : c.surface,
            borderWidth: 1, borderColor: activeFilterCount > 0 ? c.ink : c.line,
          }}
        >
          <Icon name="filter" size={14} stroke={activeFilterCount > 0 ? c.paper : c.inkSoft} sw={2} />
          <T style={{ fontSize: 13, fontWeight: '700', color: activeFilterCount > 0 ? c.paper : c.inkSoft }}>
            {activeFilterCount > 0 ? `Filters · ${activeFilterCount}` : 'Filters'}
          </T>
        </Pressable>
        {selectedHoods.size > 0 && (
          <Pressable
            onPress={clearHoods}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.accent50 }}
          >
            <T style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>
              📍 {selectedHoods.size === 1 ? [...selectedHoods][0] : `${selectedHoods.size} areas`}
            </T>
            <Icon name="close" size={12} stroke={c.accent} sw={2.4} />
          </Pressable>
        )}
      </View>

      {/* List header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 }}>
        <T style={{ fontSize: 13.5, fontWeight: '700', color: c.ink }} numberOfLines={1}>
          {subsubcategory || subcategory || category || (selectedHoods.size === 1 ? [...selectedHoods][0] : selectedHoods.size > 1 ? `${selectedHoods.size} areas` : 'All spots')} · {filtered.length}
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
      <FiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        activeTags={activeTags}
        toggleTag={toggleTag}
        selectedHoods={selectedHoods}
        toggleHood={toggleHood}
        clearHoods={clearHoods}
        hoods={hoods}
        resultCount={filtered.length}
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
