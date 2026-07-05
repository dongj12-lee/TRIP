import React from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { Itinerary, ItineraryDay, ItineraryStop } from '@/data/types';
import { T, H, Screen, DetailHeader, Button, IconButton } from '@/components/base';

const EMPTY_STOP: ItineraryStop = { time: '', part: '', name: '', note: '', slug: null, swatch: ['#7a4a2a', '#e0a05a'] };

export default function TripPlanner() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { itinerary, setItinerary, shareTrip } = useStore();

  const patch = (fn: (draft: Itinerary) => Itinerary) =>
    setItinerary((prev) => fn(JSON.parse(JSON.stringify(prev)) as Itinerary));

  const setField = (k: 'title' | 'dates' | 'travelers', v: string) =>
    patch((d) => {
      d[k] = v;
      return d;
    });
  const setDay = (di: number, k: keyof ItineraryDay, v: string) =>
    patch((d) => {
      (d.days[di] as any)[k] = v;
      return d;
    });
  const setStop = (di: number, si: number, k: keyof ItineraryStop, v: string) =>
    patch((d) => {
      (d.days[di].stops[si] as any)[k] = v;
      return d;
    });
  const addStop = (di: number) =>
    patch((d) => {
      d.days[di].stops.push({ ...EMPTY_STOP });
      return d;
    });
  const removeStop = (di: number, si: number) =>
    patch((d) => {
      d.days[di].stops.splice(si, 1);
      return d;
    });
  const addDay = () =>
    patch((d) => {
      d.days.push({ label: `Day ${d.days.length + 1}`, date: '', theme: '', stops: [{ ...EMPTY_STOP }] });
      return d;
    });
  const removeDay = (di: number) =>
    patch((d) => {
      d.days.splice(di, 1);
      return d;
    });

  const field = {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.ink,
    fontFamily: 'Jakarta',
  } as const;

  return (
    <Screen>
      <DetailHeader title="Trip planner" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Label>Trip title</Label>
          <TextInput value={itinerary.title} onChangeText={(v) => setField('title', v)} style={field} placeholderTextColor={c.muted} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>Dates</Label>
              <TextInput value={itinerary.dates} onChangeText={(v) => setField('dates', v)} style={field} placeholderTextColor={c.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Travelers</Label>
              <TextInput value={itinerary.travelers} onChangeText={(v) => setField('travelers', v)} style={field} placeholderTextColor={c.muted} />
            </View>
          </View>

          {itinerary.days.map((day, di) => (
            <View key={di} style={{ marginTop: 22, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <H style={{ fontSize: 17 }}>{day.label}</H>
                <IconButton name="close" size={18} color={c.muted} onPress={() => removeDay(di)} />
              </View>
              <TextInput value={day.theme} onChangeText={(v) => setDay(di, 'theme', v)} placeholder="Day theme (e.g. Palaces & old Seoul)" style={[field, { marginTop: 8 }]} placeholderTextColor={c.muted} />

              {day.stops.map((stop, si) => (
                <View key={si} style={{ marginTop: 12, borderLeftWidth: 2, borderLeftColor: c.accent50, paddingLeft: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput value={stop.time} onChangeText={(v) => setStop(di, si, 'time', v)} placeholder="Time" style={[field, { width: 74 }]} placeholderTextColor={c.muted} />
                    <TextInput value={stop.name} onChangeText={(v) => setStop(di, si, 'name', v)} placeholder="Place name" style={[field, { flex: 1 }]} placeholderTextColor={c.muted} />
                    <IconButton name="close" size={16} color={c.muted} onPress={() => removeStop(di, si)} />
                  </View>
                  <TextInput value={stop.note} onChangeText={(v) => setStop(di, si, 'note', v)} placeholder="Note" multiline style={[field, { marginTop: 8, minHeight: 44 }]} placeholderTextColor={c.muted} />
                </View>
              ))}

              <Pressable onPress={() => addStop(di)} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                <T style={{ color: c.accent, fontWeight: '700', fontSize: 13.5 }}>+ Add stop</T>
              </Pressable>
            </View>
          ))}

          <Button label="+ Add a day" variant="soft" style={{ marginTop: 18 }} onPress={addDay} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingBottom: insets.bottom + 12, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button label="Share for feedback" icon="share" onPress={async () => { await shareTrip(''); router.replace('/(tabs)/feed'); }} />
      </View>
    </Screen>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6, marginTop: 4 }}>{children}</T>;
}
