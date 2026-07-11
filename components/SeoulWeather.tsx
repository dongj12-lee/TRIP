import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@/theme/theme';
import { T } from './base';
import { Icon } from './Icon';
import { WeatherSheet } from './WeatherSheet';
import { haptic } from '@/lib/haptics';
import { fetchSeoulWeather, weatherDesc, weatherTip, Weather } from '@/lib/weather';

// Compact live-weather strip for the top of Explore — a traveler's first
// question in a new city is "what's it like out there right now?". Self-fetches
// from the KMA (기상청) proxy; hides itself on failure so it never breaks
// the screen.
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
  const tip = w ? weatherTip(w) : null;

  return (
    <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
      <Pressable
        onPress={() => { if (w) { haptic.tick(); setOpen(true); } }}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          backgroundColor: dark ? '#1f2937' : '#eef3f8',
          borderWidth: 1, borderColor: dark ? '#2b3a4d' : '#dbe6f0',
          borderRadius: 16, paddingVertical: 12, paddingHorizontal: 15,
        }}
      >
        {/* Emoji + temp */}
        <T style={{ fontSize: 32 }}>{desc ? desc.emoji : '🌡️'}</T>
        <View style={{ flex: 1 }}>
          {w && desc ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <T style={{ fontSize: 20, fontWeight: '800', color: c.ink }}>{w.temp}°</T>
                <T style={{ fontSize: 13.5, fontWeight: '700', color: c.inkSoft }}>{desc.label} in Seoul</T>
              </View>
              <T style={{ fontSize: 12, color: c.muted, fontWeight: '600', marginTop: 2 }}>
                Feels {w.feels}° · H {w.hi}° L {w.lo}° · 💧 {w.humidity}%
              </T>
            </>
          ) : (
            <T style={{ fontSize: 13.5, color: c.muted, fontWeight: '600' }}>Loading Seoul weather…</T>
          )}
        </View>
        {tip && (
          <View style={{ backgroundColor: dark ? '#2b3a4d' : '#dbe6f0', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, maxWidth: 116 }}>
            <T style={{ fontSize: 11, fontWeight: '700', color: dark ? '#aebdd6' : '#42537a', textAlign: 'center' }} numberOfLines={2}>{tip}</T>
          </View>
        )}
        {w && <Icon name="chevron" size={16} stroke={c.muted} sw={2} />}
      </Pressable>
      <WeatherSheet visible={open} onClose={() => setOpen(false)} weather={w} />
    </View>
  );
}
