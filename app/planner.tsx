import React, { useMemo, useState } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { analyzeTrip } from '@/lib/routeHealth';
import { buildCoOccurrence, suggestPlacesForDay } from '@/lib/routeSuggest';
import { Itinerary, ItineraryDay, ItineraryStop, Place } from '@/data/types';
import { to12h, partOfDay } from '@/lib/timeUtils';
import { T, H, Screen, DetailHeader, Button, IconButton } from '@/components/base';
import { Photo } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { AddStopSheet } from '@/components/AddStopSheet';
import { DayPlanSheet } from '@/components/DayPlanSheet';
import { RouteMap } from '@/components/RouteMap';
import { ShareCardSheet } from '@/components/ShareCardSheet';
import { ShareStop } from '@/components/ShareCard';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptics';

const EMPTY_STOP: ItineraryStop = { time: '', part: '', name: '', note: '', slug: null, swatch: ['#7a4a2a', '#e0a05a'] };

export default function TripPlanner() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { itinerary, setItinerary, shareTrip, profile } = useStore();
  const { places, posts } = useRemoteContent();
  const { showToast } = useToast();

  const [sheetDay, setSheetDay] = useState<number | null>(null);
  const [timeTarget, setTimeTarget] = useState<{ di: number; si: number } | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const coOccurrence = useMemo(() => buildCoOccurrence(posts), [posts]);
  const suggestions = useMemo(
    () =>
      sheetDay !== null
        ? suggestPlacesForDay({ day: itinerary.days[sheetDay], places, interests: profile.interests, coOccurrence })
        : [],
    [sheetDay, itinerary.days, places, profile.interests, coOccurrence],
  );

  const patch = (fn: (draft: Itinerary) => Itinerary) =>
    setItinerary((prev) => fn(JSON.parse(JSON.stringify(prev)) as Itinerary));

  const setField = (k: 'title' | 'dates' | 'travelers', v: string) => patch((d) => { d[k] = v; return d; });
  const setDay = (di: number, k: keyof ItineraryDay, v: string) => patch((d) => { (d.days[di] as any)[k] = v; return d; });
  const setStop = (di: number, si: number, k: keyof ItineraryStop, v: string) =>
    patch((d) => { (d.days[di].stops[si] as any)[k] = v; return d; });
  const removeStop = (di: number, si: number) => patch((d) => { d.days[di].stops.splice(si, 1); return d; });
  const moveStop = (di: number, si: number, dir: -1 | 1) =>
    patch((d) => {
      const stops = d.days[di].stops;
      const j = si + dir;
      if (j < 0 || j >= stops.length) return d;
      [stops[si], stops[j]] = [stops[j], stops[si]];
      return d;
    });
  const addDay = () => patch((d) => { d.days.push({ label: `Day ${d.days.length + 1}`, date: '', theme: '', stops: [] }); return d; });
  const removeDay = (di: number) => patch((d) => { d.days.splice(di, 1); return d; });

  const addPlaceToDay = (di: number, place: Place) =>
    patch((d) => {
      d.days[di].stops.push({
        time: '', part: '', name: place.name, note: '', slug: place.slug,
        swatch: place.swatch, lat: place.lat, lng: place.lng, category: place.category, photoUrl: place.photoUrl,
      });
      return d;
    });
  const addCustomToDay = (di: number) => patch((d) => { d.days[di].stops.push({ ...EMPTY_STOP }); return d; });

  const health = analyzeTrip(itinerary);

  const field = {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.ink, fontFamily: 'Jakarta',
  } as const;

  // Flatten placed stops into the shareable card (skips empty/blank rows).
  const shareStops: ShareStop[] = itinerary.days
    .flatMap((d) => d.stops)
    .filter((s) => s.name.trim())
    .map((s) => ({ name: s.name, time: s.time ? to12h(s.time) : undefined, category: s.category, photoUrl: s.photoUrl, swatch: s.swatch }));
  const canShare = shareStops.length >= 2;

  return (
    <Screen>
      <DetailHeader
        title="Trip planner"
        right={
          canShare ? (
            <IconButton name="share" label="Share as image" color={c.accent} onPress={() => { haptic.tick(); setShareOpen(true); }} />
          ) : undefined
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Label>Trip title</Label>
          <TextInput value={itinerary.title} onChangeText={(v) => setField('title', v)} style={field} placeholderTextColor={c.muted} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>Dates</Label>
              <TextInput value={itinerary.dates} onChangeText={(v) => setField('dates', v)} style={field} placeholder="Mar 14 – 16" placeholderTextColor={c.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Travelers</Label>
              <TextInput value={itinerary.travelers} onChangeText={(v) => setField('travelers', v)} style={field} placeholder="Solo" placeholderTextColor={c.muted} />
            </View>
          </View>

          {itinerary.days.map((day, di) => {
            const dh = health.days[di];
            return (
              <View key={di} style={{ marginTop: 22, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.line, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <H style={{ fontSize: 17 }}>{day.label}</H>
                    {dh.packed && (
                      <View style={{ backgroundColor: c.rose50, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <T style={{ fontSize: 10.5, fontWeight: '800', color: c.rose700 }}>PACKED · {dh.stopCount}</T>
                      </View>
                    )}
                  </View>
                  <IconButton name="close" size={18} color={c.muted} label="Remove day" onPress={() => removeDay(di)} />
                </View>
                <TextInput value={day.theme} onChangeText={(v) => setDay(di, 'theme', v)} placeholder="Day theme (e.g. Palaces & old Seoul)" style={[field, { marginTop: 8 }]} placeholderTextColor={c.muted} />

                {/* Route preview — appears once two placed stops give it a shape */}
                {day.stops.filter((s) => s.lat != null).length >= 2 && (
                  <View style={{ marginTop: 12, borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
                    <RouteMap stops={day.stops} height={130} />
                  </View>
                )}

                {day.stops.map((stop, si) => (
                  <StopCard
                    key={si}
                    stop={stop}
                    field={field}
                    first={si === 0}
                    last={si === day.stops.length - 1}
                    onTimePress={() => setTimeTarget({ di, si })}
                    onName={(v) => setStop(di, si, 'name', v)}
                    onNote={(v) => setStop(di, si, 'note', v)}
                    onRemove={() => removeStop(di, si)}
                    onUp={() => moveStop(di, si, -1)}
                    onDown={() => moveStop(di, si, 1)}
                  />
                ))}

                {dh.longHop && (
                  <View style={{ marginTop: 12, backgroundColor: c.gold50, borderRadius: 10, padding: 10, flexDirection: 'row', gap: 8 }}>
                    <T style={{ fontSize: 13 }}>🚕</T>
                    <T style={{ flex: 1, fontSize: 12, color: c.gold700, fontWeight: '600', lineHeight: 17 }}>
                      Long hop: {dh.longHop.from} → {dh.longHop.to} (~{Math.round(dh.longHop.km)}km). Budget transit time.
                    </T>
                  </View>
                )}

                <Pressable onPress={() => setSheetDay(di)} style={{ marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="plus" size={17} stroke={c.accent} sw={2.2} />
                  <T style={{ color: c.accent, fontWeight: '700', fontSize: 13.5 }}>Add stop</T>
                </Pressable>
              </View>
            );
          })}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Button label="+ Add a day" variant="soft" style={{ flex: 1 }} onPress={addDay} />
            <Button label="✨ Generate a day" variant="soft" style={{ flex: 1.2 }} onPress={() => setGenOpen(true)} />
          </View>

          {/* Trip health */}
          {(health.warnings.length > 0 || health.positives.length > 0) && (
            <View style={{ marginTop: 22, backgroundColor: c.surface2, borderRadius: 16, padding: 15 }}>
              <T style={{ fontSize: 12, fontWeight: '800', color: c.inkSoft, letterSpacing: 0.6, marginBottom: 4 }}>ROUTE CHECK</T>
              <T style={{ fontSize: 13, color: c.inkSoft, marginBottom: 10 }}>
                {health.dayCount} days · {health.totalStops} stops
              </T>
              {health.warnings.map((w, i) => (
                <View key={`w${i}`} style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <T style={{ fontSize: 13 }}>⚠️</T>
                  <T style={{ flex: 1, fontSize: 13, color: c.ink, lineHeight: 18 }}>{w}</T>
                </View>
              ))}
              {health.positives.map((p, i) => (
                <View key={`p${i}`} style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <T style={{ fontSize: 13 }}>✅</T>
                  <T style={{ flex: 1, fontSize: 13, color: c.inkSoft, lineHeight: 18 }}>{p}</T>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingBottom: insets.bottom + 12, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button label="Share for feedback" icon="share" onPress={async () => { haptic.success(); await shareTrip(''); showToast('Shared — feedback incoming', '🙏'); router.replace('/(tabs)/feed'); }} />
      </View>

      <AddStopSheet
        visible={sheetDay !== null}
        onClose={() => setSheetDay(null)}
        onAddPlace={(place) => sheetDay !== null && addPlaceToDay(sheetDay, place)}
        onAddCustom={() => sheetDay !== null && addCustomToDay(sheetDay)}
        suggestions={suggestions}
      />

      <DayPlanSheet visible={genOpen} onClose={() => setGenOpen(false)} />

      <ShareCardSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        title={itinerary.title || 'My Seoul trip'}
        subtitle={[itinerary.dates, `${shareStops.length} stops`].filter(Boolean).join(' · ')}
        stops={shareStops}
        handle={profile.handle}
      />

      <TimePickerSheet
        visible={timeTarget !== null}
        value={timeTarget ? itinerary.days[timeTarget.di]?.stops[timeTarget.si]?.time ?? '' : ''}
        onSelect={(t) => timeTarget && setStop(timeTarget.di, timeTarget.si, 'time', t)}
        onClear={() => timeTarget && setStop(timeTarget.di, timeTarget.si, 'time', '')}
        onClose={() => setTimeTarget(null)}
      />
    </Screen>
  );
}

function StopCard({
  stop, field, first, last, onTimePress, onName, onNote, onRemove, onUp, onDown,
}: {
  stop: ItineraryStop;
  field: object;
  first: boolean;
  last: boolean;
  onTimePress: () => void;
  onName: (v: string) => void;
  onNote: (v: string) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const { c } = useTheme();
  const isPlace = !!stop.slug;
  const [noteOpen, setNoteOpen] = useState(!!stop.note);
  const part = partOfDay(stop.time);

  return (
    <View style={{ marginTop: 12, borderLeftWidth: 2, borderLeftColor: c.accent50, paddingLeft: 12 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {isPlace ? (
          <View style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden' }}>
            <Photo uri={stop.photoUrl} swatch={stop.swatch} height={44} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {isPlace ? (
            <>
              <T style={{ fontSize: 14.5, fontWeight: '700' }} numberOfLines={1}>{stop.name}</T>
              {!!stop.category && <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600' }} numberOfLines={1}>{stop.category}</T>}
            </>
          ) : (
            <TextInput value={stop.name} onChangeText={onName} placeholder="Custom stop (e.g. KTX to Busan)" style={[field, { paddingVertical: 8 }]} placeholderTextColor={c.muted} />
          )}
        </View>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Pressable onPress={onUp} disabled={first} hitSlop={6} style={{ opacity: first ? 0.25 : 1, padding: 2, transform: [{ rotate: '-90deg' }] }}>
            <Icon name="chevron" size={16} stroke={c.muted} sw={2.4} />
          </Pressable>
          <View style={{ transform: [{ rotate: '90deg' }] }}>
            <Pressable onPress={onDown} disabled={last} hitSlop={6} style={{ opacity: last ? 0.25 : 1, padding: 2 }}>
              <Icon name="chevron" size={16} stroke={c.muted} sw={2.4} />
            </Pressable>
          </View>
        </View>
        <IconButton name="close" size={16} color={c.muted} label="Remove stop" onPress={onRemove} />
      </View>

      {/* Time pill (tap to pick) + auto-derived part-of-day + optional note toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <Pressable
          onPress={onTimePress}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999,
            borderWidth: 1, borderColor: stop.time ? c.accent : c.line,
            backgroundColor: stop.time ? c.accent50 : c.surface,
            borderStyle: stop.time ? 'solid' : 'dashed',
          }}
        >
          <Icon name="clock" size={15} stroke={stop.time ? c.accent : c.muted} sw={2} />
          <T style={{ fontSize: 13, fontWeight: '700', color: stop.time ? c.accent : c.muted }}>
            {stop.time ? to12h(stop.time) : 'Add time'}
          </T>
        </Pressable>
        {!!part && <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>{part}</T>}
        {!noteOpen && (
          <Pressable onPress={() => setNoteOpen(true)} hitSlop={6} style={{ marginLeft: 'auto' }}>
            <T style={{ fontSize: 12.5, color: c.muted, fontWeight: '600' }}>+ Note</T>
          </Pressable>
        )}
      </View>

      {noteOpen && (
        <TextInput
          value={stop.note}
          onChangeText={onNote}
          placeholder="Optional note — why, a tip, what to order…"
          placeholderTextColor={c.muted}
          multiline
          autoFocus={!stop.note}
          style={[field, { marginTop: 8, paddingVertical: 8, minHeight: 40 }]}
        />
      )}
    </View>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6, marginTop: 4 }}>{children}</T>;
}
