import React, { useMemo, useState } from 'react';
import { View, FlatList, ScrollView, Pressable, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useRemoteContent } from '@/lib/remoteData';
import { useStore } from '@/lib/store';
import { recommendedPlaces } from '@/lib/recommend';
import { ForeignerTagKey, Place } from '@/data/types';
import { INTENTS, intentByKey, IntentKey } from '@/data/intents';
import { screen, SCREENER_EXAMPLES } from '@/lib/screener';
import { T, H } from '@/components/base';
import { PlaceCard, PlaceCardCompact } from '@/components/cards';
import { ExploreMap } from '@/components/ExploreMap';
import { Icon } from '@/components/Icon';
import { Eyebrow } from '@/components/ui';
import { FiltersSheet } from '@/components/FiltersSheet';
import { SeoulWeather } from '@/components/SeoulWeather';
import { haptic } from '@/lib/haptics';
import { guLabel } from '@/lib/format';
import { SkeletonList, SkeletonPlaceCard } from '@/components/Skeleton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { DayPlanSheet } from '@/components/DayPlanSheet';

export default function ExploreScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { places, posts, refreshAll, loading } = useRemoteContent();
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
  const [intent, setIntent] = useState<IntentKey | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  const hoods = useMemo(() => Array.from(new Set(places.map((p) => p.neighborhood))).sort(), [places]);

  const activeIntent = intent ? intentByKey[intent] : null;

  // Refinements within the picked intent (e.g. Eat → Korean / Western / …),
  // most common first. Only intents that define `sub` get a row.
  const subs = useMemo(() => {
    if (!activeIntent?.sub) return [];
    const counts = new Map<string, number>();
    places.forEach((p) => {
      if (!activeIntent.match(p)) return;
      const s = activeIntent.sub!(p);
      if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [places, intent]);

  const selectIntent = (k: IntentKey | null) => {
    setIntent(k);
    setSub(null);
  };

  // Places narrowed by the structured filters (intent / sub / tags / hoods),
  // BEFORE the search query — the screener ranks within this set.
  const baseFiltered = useMemo(() => {
    const ai = intent ? intentByKey[intent] : null;
    return places.filter((p) => {
      if (![...activeTags].every((t) => (p as any)[t])) return false;
      if (selectedHoods.size && !selectedHoods.has(p.neighborhood)) return false;
      if (ai) {
        if (!ai.match(p)) return false;
        if (sub && ai.sub?.(p) !== sub) return false;
      }
      return true;
    });
  }, [places, activeTags, selectedHoods, intent, sub]);

  // The search bar is a natural-language screener: "quiet café with an english
  // menu" ranks by intent + Foreigner-Fit/facts + description, with a "why it
  // matches" note. A plain word ("gyeongbokgung") still works as a lookup.
  const q = query.trim();
  const hits = useMemo(() => (q ? screen(q, baseFiltered) : []), [q, baseFiltered]);
  const reasonsBySlug = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const h of hits) if (h.reasons.length) m[h.place.slug] = h.reasons;
    return m;
  }, [hits]);
  const screenerActive = !!q && hits.some((h) => h.reasons.length > 0);
  const filtered = q ? hits.map((h) => h.place) : baseFiltered;

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

  // Full filtered catalog goes to the map — the WebMap runtime clusters and
  // viewport-culls, so thousands of pins stay readable and cheap.
  const mapPlaces = filtered;

  // "Recommended" only shows when the user hasn't narrowed the list themselves.
  const noFilters = !query && selectedHoods.size === 0 && !intent && activeTags.size === 0;
  const recommended = useMemo(
    () => (noFilters ? recommendedPlaces(places, posts, 12) : []),
    [noFilters, places, posts],
  );

  // Initial live fetch — show breathing placeholders instead of flashing the
  // bundled seed list that would then swap to real content.
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 12 }}>
          <H style={{ fontSize: 32, lineHeight: 36 }}>Explore</H>
          <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>Finding spots…</T>
        </View>
        <SkeletonList card={SkeletonPlaceCard} n={4} />
      </View>
    );
  }

  const clearAll = () => {
    setQuery('');
    setActiveTags(new Set());
    setSelectedHoods(new Set());
    selectIntent(null);
  };

  const header = (
    <>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 12 }}>
        <H style={{ fontSize: 32, lineHeight: 36 }}>Explore</H>
        <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>
          {filtered.length} of {places.length} spots
        </T>
      </View>

      <OfflineBanner />

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
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Icon name="close" size={18} stroke={c.muted} sw={2} />
            </Pressable>
          )}
        </View>
        {/* Example prompts teach the natural-language screener */}
        {noFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingTop: 9 }}>
            <T style={{ fontSize: 12, color: c.muted, fontWeight: '700', alignSelf: 'center', marginRight: 1 }}>✨ Try</T>
            {SCREENER_EXAMPLES.map((ex) => (
              <Pressable
                key={ex}
                onPress={() => { haptic.tick(); setQuery(ex); }}
                style={{ paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}
              >
                <T style={{ fontSize: 12, color: c.inkSoft, fontWeight: '600' }}>{ex}</T>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Live Seoul weather — shown at the top of the default Explore view */}
      {noFilters && <SeoulWeather />}

      {/* "Plan my day" — the one-tap route generator, the app's magic moment */}
      {noFilters && (
        <View style={{ paddingHorizontal: 18, paddingBottom: 16 }}>
          <Pressable
            onPress={() => { haptic.tick(); setPlanOpen(true); }}
            accessibilityRole="button"
            accessibilityLabel="Plan my day"
            style={({ pressed }) => [
              {
                borderRadius: 18, padding: 16, backgroundColor: c.ink,
                flexDirection: 'row', alignItems: 'center', gap: 13,
              },
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
          >
            <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkle" size={22} stroke={c.paper} sw={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 16.5, fontWeight: '800', color: c.paper }}>Plan my day</T>
              <T style={{ fontSize: 12.5, color: c.paper, opacity: 0.75, marginTop: 2, fontWeight: '600' }}>
                A full day route in one tap — from {places.length.toLocaleString()} real spots
              </T>
            </View>
            <Icon name="chevron" size={20} stroke={c.paper} sw={2.2} />
          </Pressable>
        </View>
      )}

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
          {/* Pin tap goes straight to the place card — the map stays put. */}
          <ExploreMap places={mapPlaces} selectedSlug={null} onSelect={(slug) => slug && router.push(`/place/${slug}`)} height={220} />
        </View>
      )}

      {/* Intent bar — traveler-first categories (Eat / Cafés / Sights / …),
          icon-forward so the buckets are scannable at a glance. This is the
          app's own taxonomy; Visit Seoul's raw L1/L2/L3 never reaches the UI. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 6 }}>
        <IntentItem emoji="✨" label="All" active={!intent} onPress={() => { haptic.tick(); selectIntent(null); }} />
        {INTENTS.map((i) => (
          <IntentItem
            key={i.key}
            emoji={i.emoji}
            label={i.label}
            active={intent === i.key}
            onPress={() => { haptic.tick(); selectIntent(intent === i.key ? null : i.key); }}
          />
        ))}
      </ScrollView>

      {/* One refinement row, only where it genuinely helps (Eat → cuisines,
          Sights → historic/landmarks/…). Replaces the old L2+L3 double rail. */}
      {activeIntent && subs.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingBottom: 10 }}>
          <Chip label={`All ${activeIntent.label}`} active={!sub} onPress={() => { haptic.tick(); setSub(null); }} />
          {subs.map((s) => (
            <Chip key={s} label={s} active={sub === s} onPress={() => { haptic.tick(); setSub(sub === s ? null : s); }} />
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
              📍 {selectedHoods.size === 1 ? guLabel([...selectedHoods][0]) : `${selectedHoods.size} areas`}
            </T>
            <Icon name="close" size={12} stroke={c.accent} sw={2.4} />
          </Pressable>
        )}
      </View>

      {/* List header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 }}>
        <T style={{ fontSize: 13.5, fontWeight: '700', color: c.ink }} numberOfLines={1}>
          {screenerActive ? `✨ Best matches` : sub || activeIntent?.label || (selectedHoods.size === 1 ? guLabel([...selectedHoods][0]) : selectedHoods.size > 1 ? `${selectedHoods.size} areas` : 'All spots')} · {filtered.length}
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
            <PlaceCard place={item} reasons={reasonsBySlug[item.slug]} />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={{ paddingVertical: 50, alignItems: 'center', paddingHorizontal: 40 }}>
            <T style={{ fontSize: 28 }}>🔍</T>
            <T style={{ color: c.muted, marginTop: 8, textAlign: 'center' }}>
              {query ? `No spots match "${query}".` : 'No spots match those filters.'}
            </T>
            <Pressable
              onPress={() => { haptic.tick(); clearAll(); }}
              accessibilityRole="button"
              style={{ marginTop: 16, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, backgroundColor: c.accent }}
            >
              <T style={{ fontSize: 13.5, fontWeight: '700', color: '#fff' }}>Clear all filters</T>
            </Pressable>
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
      <DayPlanSheet visible={planOpen} onClose={() => setPlanOpen(false)} />
    </View>
  );
}

// Icon-forward category item (emoji tile + label), Airbnb-category-bar style —
// far more scannable than a row of same-looking text pills.
function IntentItem({ emoji, label, active, onPress }: { emoji: string; label: string; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [{ alignItems: 'center', width: 66, paddingVertical: 4, gap: 5 }, pressed && { opacity: 0.7 }]}
    >
      <View
        style={{
          width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
          backgroundColor: active ? c.ink : c.surface,
          borderWidth: 1.5, borderColor: active ? c.ink : c.line,
        }}
      >
        <T style={{ fontSize: 22 }}>{emoji}</T>
      </View>
      <T numberOfLines={1} style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? c.ink : c.muted }}>
        {label}
      </T>
    </Pressable>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
        backgroundColor: active ? c.accent : c.surface,
        borderWidth: 1, borderColor: active ? c.accent : c.line,
      }}
    >
      <T style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : c.inkSoft }}>{label}</T>
    </Pressable>
  );
}
