import React from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { T, H } from './base';
import { Weather, weatherDesc, weatherTip, dayLabel, hourLabel } from '@/lib/weather';

// The 7-day forecast, opened by tapping the Explore weather strip.
export function WeatherSheet({ visible, onClose, weather }: { visible: boolean; onClose: () => void; weather: Weather | null }) {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  if (!weather) return null;

  const now = weatherDesc(weather.code, weather.isDay);
  const tip = weatherTip(weather);
  // Shared temp range across the week, to scale each day's bar.
  const weekMin = Math.min(...weather.daily.map((d) => d.lo));
  const weekMax = Math.max(...weather.daily.map((d) => d.hi));
  const span = Math.max(1, weekMax - weekMin);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: insets.bottom + 16 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginTop: 10, marginBottom: 4 }} />

        {/* Current conditions header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <T style={{ fontSize: 40 }}>{now.emoji}</T>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <H style={{ fontSize: 30 }}>{weather.temp}°</H>
              <T style={{ fontSize: 14, fontWeight: '700', color: c.inkSoft }}>{now.label} in Seoul</T>
            </View>
            <T style={{ fontSize: 12.5, color: c.muted, fontWeight: '600', marginTop: 2 }}>
              Feels {weather.feels}° · 💧 {weather.humidity}%{tip ? ` · ${tip}` : ''}
            </T>
          </View>
        </View>

        {/* Hourly — next 24 hours */}
        {weather.hourly.length > 0 && (
          <>
            <View style={{ height: 1, backgroundColor: c.line, marginHorizontal: 20 }} />
            <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.6, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
              NEXT 24 HOURS
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 4 }}>
              {weather.hourly.map((h, i) => {
                const hd = weatherDesc(h.code, h.isDay);
                const wet = h.rain >= 20;
                return (
                  <View key={h.time} style={{ alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 14, backgroundColor: i === 0 ? c.accent50 : 'transparent', minWidth: 52 }}>
                    <T style={{ fontSize: 11.5, fontWeight: i === 0 ? '800' : '700', color: i === 0 ? c.accent : c.inkSoft }}>{hourLabel(h.time, i)}</T>
                    <T style={{ fontSize: 20, marginTop: 5 }}>{hd.emoji}</T>
                    <View style={{ height: 14, justifyContent: 'center', marginTop: 3 }}>
                      {wet ? (
                        <T style={{ fontSize: 10.5, fontWeight: '700', color: dark ? '#8fb3d9' : '#4a7ba6' }}>💧{h.rain}%</T>
                      ) : null}
                    </View>
                    <T style={{ fontSize: 14, fontWeight: '800', color: c.ink, marginTop: 3 }}>{h.temp}°</T>
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}

        <View style={{ height: 1, backgroundColor: c.line, marginHorizontal: 20, marginTop: 14 }} />
        <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.6, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
          NEXT 7 DAYS
        </T>

        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          {weather.daily.map((d, i) => {
            const desc = weatherDesc(d.code, true);
            // Position/width of this day's temp bar within the week's range.
            const left = ((d.lo - weekMin) / span) * 100;
            const width = Math.max(8, ((d.hi - d.lo) / span) * 100);
            return (
              <View key={d.date} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: i < weather.daily.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
                <T style={{ width: 46, fontSize: 13.5, fontWeight: i === 0 ? '800' : '700', color: i === 0 ? c.ink : c.inkSoft }}>{dayLabel(d.date, i)}</T>
                <T style={{ width: 30, fontSize: 18, textAlign: 'center' }}>{desc.emoji}</T>
                <View style={{ width: 42, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  {d.rain >= 20 ? (
                    <>
                      <T style={{ fontSize: 11 }}>💧</T>
                      <T style={{ fontSize: 11.5, fontWeight: '700', color: dark ? '#8fb3d9' : '#4a7ba6' }}>{d.rain}%</T>
                    </>
                  ) : null}
                </View>
                {/* Low — bar — High */}
                <T style={{ width: 30, fontSize: 13, fontWeight: '600', color: c.muted, textAlign: 'right' }}>{d.lo}°</T>
                <View style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: c.surface2, marginHorizontal: 10, justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, height: 6, borderRadius: 999, backgroundColor: c.accent }} />
                </View>
                <T style={{ width: 30, fontSize: 13.5, fontWeight: '800', color: c.ink }}>{d.hi}°</T>
              </View>
            );
          })}
        </View>

        <T style={{ fontSize: 11, color: c.muted, textAlign: 'center', marginTop: 14 }}>Live forecast · {weather.source ?? '기상청 KMA'}</T>
      </View>
    </Modal>
  );
}
