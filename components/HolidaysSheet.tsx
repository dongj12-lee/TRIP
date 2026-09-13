import React, { useMemo, useState } from 'react';
import { View, Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { T, H } from './base';
import { Icon } from './Icon';
import { Holiday, holidayLabel } from '@/lib/holidays';
import { haptic } from '@/lib/haptics';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');

// Month calendar grid, opened by tapping the Explore holiday strip. Public
// holidays (KASI 공휴일) get a solid red day, since those are the ones that
// actually mean crowds/closures; solar terms and traditional minor dates
// (초복 등) get a small dot instead, cultural flavor with no practical impact
// on a trip, so they shouldn't visually compete with a real holiday.
export function HolidaysSheet({
  visible, onClose, holidays, notable,
}: {
  visible: boolean;
  onClose: () => void;
  holidays: Holiday[];
  notable: Holiday[];
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();

  const nowKST = new Date(Date.now() + 9 * 3600 * 1000);
  const [cursor, setCursor] = useState({ y: nowKST.getUTCFullYear(), m: nowKST.getUTCMonth() }); // m: 0-11
  const todayIso = `${nowKST.getUTCFullYear()}-${pad(nowKST.getUTCMonth() + 1)}-${pad(nowKST.getUTCDate())}`;

  const holidayByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach((h) => map.set(h.date, h));
    return map;
  }, [holidays]);
  const notableByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    notable.forEach((h) => map.set(h.date, h));
    return map;
  }, [notable]);

  const grid = useMemo(() => {
    const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
    const startWeekday = first.getUTCDay(); // 0=Sun
    const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
    const cells: (number | null)[] = Array(startWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const monthPrefix = `${cursor.y}-${pad(cursor.m + 1)}`;
  const monthEntries = [
    ...holidays.filter((h) => h.date.startsWith(monthPrefix)).map((h) => ({ ...h, isHoliday: true })),
    ...notable.filter((h) => h.date.startsWith(monthPrefix)).map((h) => ({ ...h, isHoliday: false })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const shiftMonth = (dir: -1 | 1) => {
    haptic.tick();
    setCursor((prev) => {
      let m = prev.m + dir;
      let y = prev.y;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { y, m };
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      {/* Capped + scrollable, same reason as WeatherSheet: the calendar grid
          scales with viewport width, so on iPad this sheet filled the screen
          and left no scrim to tap — the sheet became inescapable. */}
      <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: winH * 0.9 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginTop: 10, marginBottom: 4 }} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 }}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} style={{ padding: 4, transform: [{ rotate: '180deg' }] }} accessibilityRole="button" accessibilityLabel="Previous month">
            <Icon name="chevron" size={18} stroke={c.inkSoft} sw={2.2} />
          </Pressable>
          <H style={{ fontSize: 18 }}>{MONTH_NAMES[cursor.m]} {cursor.y}</H>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={10} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Next month">
              <Icon name="chevron" size={18} stroke={c.inkSoft} sw={2.2} />
            </Pressable>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <View style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={16} stroke={c.inkSoft} sw={2.2} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
          {WEEKDAYS.map((w, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 6 }}>
              <T style={{ fontSize: 11.5, fontWeight: '800', color: c.muted }}>{w}</T>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 }}>
          {grid.map((d, i) => {
            const iso = d != null ? `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}` : null;
            const holiday = iso ? holidayByDate.get(iso) : undefined;
            const isNotable = !holiday && iso ? notableByDate.has(iso) : false;
            const isToday = iso === todayIso;
            return (
              <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                {d != null && (
                  <View style={{ alignItems: 'center', gap: 3 }}>
                    <View
                      style={{
                        width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: holiday ? c.rose : isToday ? c.accent50 : 'transparent',
                        borderWidth: isToday && !holiday ? 1.5 : 0, borderColor: c.accent,
                      }}
                    >
                      <T style={{ fontSize: 13.5, fontWeight: holiday || isToday ? '800' : '600', color: holiday ? '#fff' : c.ink }}>
                        {d}
                      </T>
                    </View>
                    <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: isNotable ? c.muted : 'transparent' }} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 1, backgroundColor: c.line, marginHorizontal: 20, marginTop: 12 }} />

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          {monthEntries.length === 0 ? (
            <T style={{ fontSize: 13, color: c.muted, textAlign: 'center', paddingVertical: 10 }}>Nothing notable this month</T>
          ) : (
            monthEntries.map((h, i) => (
              <View key={`${h.date}-${h.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: i < monthEntries.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
                <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: h.isHoliday ? c.rose : c.muted }} />
                <T style={{ flex: 1, fontSize: 13.5, fontWeight: h.isHoliday ? '700' : '600', color: h.isHoliday ? c.ink : c.inkSoft }}>
                  {holidayLabel(h.name)}
                </T>
                <T style={{ fontSize: 12.5, color: c.muted, fontWeight: '600' }}>
                  {new Date(h.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                </T>
              </View>
            ))
          )}
        </View>

        <T style={{ fontSize: 11, color: c.muted, textAlign: 'center', marginTop: 14 }}>Public holidays & traditional dates · 한국천문연구원 KASI</T>
        </ScrollView>
      </View>
    </Modal>
  );
}
