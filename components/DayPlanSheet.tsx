import React, { useEffect, useMemo, useState } from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { generateDayPlan, planToItineraryDay, DayPlan, VibeKey, VIBES } from '@/lib/dayPlan';
import { fetchSeoulWeather, weatherDesc } from '@/lib/weather';
import { guLabel } from '@/lib/format';
import { to12h } from '@/lib/timeUtils';
import { haptic } from '@/lib/haptics';
import { T, H, Button } from './base';
import { Photo } from './ui';
import { Icon } from './Icon';
import { RouteMap } from './RouteMap';
import { ShareCardSheet } from './ShareCardSheet';
import { ShareStop } from './ShareCard';
import { useToast } from './Toast';

// "Plan my day" — the one-tap bridge from browsing to a shareable route.
// Pick a vibe (+ optionally an area), get a geographically coherent 5-stop
// day built from real Visit Seoul places, weighted toward the user's saved
// spots and interests, indoor-biased when rain is likely. One more tap adds
// it to the trip planner as an editable day.
export function DayPlanSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c, tone } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();
  const { places } = useRemoteContent();
  const { profile, saved, itinerary, setItinerary } = useStore();

  const [vibe, setVibe] = useState<VibeKey>('classic');
  const [area, setArea] = useState<string | null>(null);
  const [rainy, setRainy] = useState(false);
  const [exclude, setExclude] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);

  // Today's forecast decides the indoor bias (silently skipped if offline).
  useEffect(() => {
    if (!visible) return;
    fetchSeoulWeather()
      .then((w) => {
        const today = w.daily[0];
        setRainy((today?.rain ?? 0) >= 55 || [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(w.code));
      })
      .catch(() => {});
  }, [visible]);

  // Reset the shuffle history when inputs change, so each combination starts
  // from its best plan.
  useEffect(() => {
    setExclude(new Set());
  }, [vibe, area, visible]);

  const areas = useMemo(() => {
    const counts = new Map<string, number>();
    places.forEach((p) => {
      if (p.neighborhood && p.neighborhood !== 'Seoul') counts.set(p.neighborhood, (counts.get(p.neighborhood) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);
  }, [places]);

  const plan: DayPlan | null = useMemo(
    () => (visible ? generateDayPlan({ places, interests: profile.interests, saved, vibe, area, rainy, exclude }) : null),
    [visible, places, profile.interests, saved, vibe, area, rainy, exclude],
  );

  const shuffle = () => {
    if (!plan) return;
    haptic.tick();
    setExclude((prev) => new Set([...prev, ...plan.stops.map((s) => s.place.slug)]));
  };

  const addToTrip = () => {
    if (!plan) return;
    haptic.success();
    const label = `Day ${itinerary.days.length + 1}`;
    const day = planToItineraryDay(plan, label, area ? guLabel(area) : undefined);
    setItinerary((prev) => ({ ...prev, days: [...prev.days, day] }));
    onClose();
    showToast(`Added as ${label} — tweak anything`, '✨');
    // navigate (not push): when opened from the planner itself this must not
    // stack a second planner screen.
    router.navigate('/planner');
  };

  const v = VIBES[vibe];
  const accent = tone('terra');

  const shareStops: ShareStop[] = plan
    ? plan.stops.map((s) => ({ name: s.place.name, time: to12h(s.time), category: s.place.category, photoUrl: s.place.photoUrl, swatch: s.place.swatch }))
    : [];
  const shareTitle = `${v.emoji} ${v.label}${area ? ` · ${guLabel(area)}` : ''}`;
  const shareSubtitle = plan ? `${plan.stops.length} stops · ~${plan.totalKm.toFixed(1)}km on foot` : undefined;

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ maxHeight: '88%', backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginTop: 10, marginBottom: 6 }} />
        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 2 }}>
          <H style={{ fontSize: 22 }}>✨ Plan my day</H>
          <T style={{ fontSize: 12.5, color: c.muted, marginTop: 3 }}>
            {rainy ? '☔️ Rain likely today — keeping it mostly indoor.' : 'A full day from real traveler favorites — then make it yours.'}
          </T>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {/* Vibe picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14 }}>
            {(Object.keys(VIBES) as VibeKey[]).map((k) => {
              const on = vibe === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => { haptic.tick(); setVibe(k); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={{
                    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
                    backgroundColor: on ? c.accent : c.surface,
                    borderWidth: 1, borderColor: on ? c.accent : c.line,
                  }}
                >
                  <T style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : c.inkSoft }}>
                    {VIBES[k].emoji} {VIBES[k].label}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Area picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 10 }}>
            <AreaChip label="Anywhere" on={!area} onPress={() => setArea(null)} />
            {areas.map((a) => (
              <AreaChip key={a} label={guLabel(a)} on={area === a} onPress={() => setArea(area === a ? null : a)} />
            ))}
          </ScrollView>

          {/* The plan */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {plan ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '700' }}>
                    {v.emoji} {v.blurb}
                  </T>
                  <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>
                    ~{plan.totalKm.toFixed(1)}km on foot{plan.usedSaved > 0 ? ` · ♥ ${plan.usedSaved} of your saves` : ''}
                  </T>
                </View>
                <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: c.line, marginBottom: 12 }}>
                  <RouteMap stops={plan.stops.map((s) => ({ name: s.place.name, lat: s.place.lat, lng: s.place.lng }))} height={140} />
                </View>
                <View style={{ gap: 10 }}>
                  {plan.stops.map((s, i) => (
                    <Pressable
                      key={s.place.slug}
                      onPress={() => { onClose(); router.push(`/place/${s.place.slug}`); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 10 }}
                    >
                      <View style={{ alignItems: 'center', width: 44 }}>
                        <T style={{ fontSize: 11.5, fontWeight: '800', color: accent.fg }}>{to12h(s.time)}</T>
                        {i > 0 && s.kmFromPrev != null && (
                          <T style={{ fontSize: 9.5, color: c.muted, fontWeight: '600', marginTop: 1 }}>
                            {s.kmFromPrev < 1 ? `${Math.round(s.kmFromPrev * 1000)}m` : `${s.kmFromPrev.toFixed(1)}km`}
                          </T>
                        )}
                      </View>
                      <View style={{ width: 46, height: 46, borderRadius: 11, overflow: 'hidden' }}>
                        <Photo uri={s.place.photoUrl} swatch={s.place.swatch} height={46} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <T style={{ fontSize: 14, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{s.place.name}</T>
                          {s.saved && <Icon name="heart" size={12} fill={c.rose} stroke={c.rose} sw={1} />}
                        </View>
                        <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600' }} numberOfLines={1}>
                          {s.role} · {guLabel(s.place.neighborhood)}
                          {s.place.rating != null ? ` · ⭐ ${s.place.rating}` : ''}
                        </T>
                      </View>
                      <Icon name="chevron" size={16} stroke={c.muted} sw={2} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <T style={{ fontSize: 26 }}>🗺️</T>
                <T style={{ color: c.muted, marginTop: 8, textAlign: 'center', fontSize: 13 }}>
                  Not enough spots for that combination — try another area or vibe.
                </T>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 9, paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 14, borderTopWidth: 1, borderTopColor: c.line }}>
          <Button label="Shuffle" icon="refresh" variant="soft" style={{ flex: 1 }} onPress={shuffle} disabled={!plan} />
          <Button label="Share" icon="share" variant="soft" style={{ flex: 1 }} onPress={() => { haptic.tick(); setShareOpen(true); }} disabled={!plan} />
          <Button label="Add to trip" style={{ flex: 1.3 }} onPress={addToTrip} disabled={!plan} />
        </View>
      </View>
    </Modal>

    <ShareCardSheet
      visible={shareOpen}
      onClose={() => setShareOpen(false)}
      title={shareTitle}
      subtitle={shareSubtitle}
      stops={shareStops}
      handle={profile.handle}
    />
    </>
  );
}

function AreaChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => { haptic.tick(); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{
        paddingVertical: 6.5, paddingHorizontal: 12, borderRadius: 999,
        backgroundColor: on ? c.accent50 : c.surface,
        borderWidth: 1, borderColor: on ? c.accent : c.line,
      }}
    >
      <T style={{ fontSize: 12.5, fontWeight: '700', color: on ? c.accent : c.inkSoft }}>📍 {label}</T>
    </Pressable>
  );
}
