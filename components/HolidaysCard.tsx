import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@/theme/theme';
import { T } from './base';
import { Icon } from './Icon';
import { HolidaysSheet } from './HolidaysSheet';
import { haptic } from '@/lib/haptics';
import { fetchKoreaHolidays, fetchKoreaNotableDates, holidayLabel, nextHoliday, Holiday } from '@/lib/holidays';

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// A real day/month, unlike the 📅 emoji it replaces — Apple's font renders
// that glyph as a fixed "17 JUL" regardless of the actual date, which is
// exactly wrong for a card whose whole point is today's real date.
function TodayIcon() {
  const { c, dark } = useTheme();
  const now = new Date(Date.now() + 9 * 3600 * 1000); // KST
  return (
    <View style={{ width: 30, height: 30, borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: dark ? '#463a22' : '#e0cfa8' }}>
      <View style={{ height: 11, backgroundColor: c.rose, alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ fontSize: 7, fontWeight: '800', color: '#fff', letterSpacing: 0.2 }}>{MONTH_ABBR[now.getUTCMonth()]}</T>
      </View>
      <View style={{ flex: 1, backgroundColor: dark ? '#201f1d' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ fontSize: 13, fontWeight: '800', color: c.ink }}>{now.getUTCDate()}</T>
      </View>
    </View>
  );
}

// Compact "next Korean public holiday" card for Explore, half-width next to
// the weather card. Travelers plan around weather instinctively but have no
// idea Korean public holidays exist until they're standing in a packed palace
// on 광복절. Self-fetches from KASI via a Supabase proxy; hides itself on
// failure so it never breaks the screen.
export function HolidaysCard() {
  const { c, dark } = useTheme();
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);
  const [notable, setNotable] = useState<Holiday[]>([]);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchKoreaHolidays()
      .then((data) => alive && setHolidays(data))
      .catch(() => alive && setFailed(true));
    // Cultural flavor for the calendar sheet only, no closures/crowds, so a
    // failure here shouldn't hide the card the way a holidays failure does.
    fetchKoreaNotableDates()
      .then((data) => alive && setNotable(data))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (failed) return null;

  const next = holidays ? nextHoliday(holidays) : null;

  return (
    <>
      <Pressable
        onPress={() => { if (holidays) { haptic.tick(); setOpen(true); } }}
        style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: dark ? '#2b2415' : '#faf3e6',
          borderWidth: 1, borderColor: dark ? '#463a22' : '#ecdfc4',
          borderRadius: 14, paddingVertical: 12, paddingLeft: 11, paddingRight: 9,
        }}
      >
        <TodayIcon />
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 14.5, fontWeight: '800', color: c.ink }} numberOfLines={1}>Calendar</T>
          <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
            {next ? holidayLabel(next.name) : holidays ? 'No holidays soon' : 'Loading…'}
          </T>
        </View>
        {holidays && <Icon name="chevron" size={13} stroke={c.muted} sw={2} />}
      </Pressable>
      <HolidaysSheet visible={open} onClose={() => setOpen(false)} holidays={holidays ?? []} notable={notable} />
    </>
  );
}
