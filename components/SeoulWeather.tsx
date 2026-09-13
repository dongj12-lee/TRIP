import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@/theme/theme';
import { T } from './base';
import { Icon } from './Icon';
import { WeatherSheet } from './WeatherSheet';
import { haptic } from '@/lib/haptics';
import { fetchSeoulWeather, weatherDesc, Weather } from '@/lib/weather';

// Compact live-weather card for the top of Explore, a traveler's first
// question in a new city is "what's it like out there right now?". Sits in a
// half-width row next to HolidaysCard (both are "what should I know before I
// go out today" info), so this stays to two short lines — full detail (hourly,
// 7-day, the "tip" pill) lives in the sheet a tap away. Self-fetches from the
// KMA (기상청) proxy; hides itself on failure so it never breaks the screen.
export function SeoulWeather() {
  const { c, dark } = useTheme();
  const [w, setW] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSeoulWeather()
      .then((data) => alive && setW(data))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  if (failed) return null;

  const desc = w ? weatherDesc(w.code, w.isDay) : null;

  return (
    <>
      <Pressable
        onPress={() => { if (w) { haptic.tick(); setOpen(true); } }}
        style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: dark ? '#1f2937' : '#eef3f8',
          borderWidth: 1, borderColor: dark ? '#2b3a4d' : '#dbe6f0',
          borderRadius: 14, paddingVertical: 12, paddingLeft: 11, paddingRight: 9,
        }}
      >
        <T style={{ fontSize: 22 }}>{desc ? desc.emoji : '🌡️'}</T>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 14.5, fontWeight: '800', color: c.ink }} numberOfLines={1}>Weather</T>
          {w && desc ? (
            <T style={{ fontSize: 11.5, color: c.inkSoft, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
              {w.temp}° {desc.label} · 💧{w.humidity}%
            </T>
          ) : (
            <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>Loading…</T>
          )}
        </View>
        {w && <Icon name="chevron" size={13} stroke={c.muted} sw={2} />}
      </Pressable>
      <WeatherSheet visible={open} onClose={() => setOpen(false)} weather={w} />
    </>
  );
}
