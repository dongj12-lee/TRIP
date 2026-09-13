// Optional flight times for the trip planner.
//
// Collapsed by default and skippable: most people opening "plan my trip" are
// still daydreaming, not holding a booking, and a form gate would kill that.
// Filled in, it removes the planner's biggest guess, right now day 1 just
// assumes you start at lunch (see lib/tripPlan.ts dayShape).
//
// Granularity is deliberately whole hours. The generated day has stops every
// two hours, so offering minute precision would promise a plan that reacted to
// "14:23" when nothing downstream can.
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/theme/theme';
import { T } from './base';
import { haptic } from '@/lib/haptics';

const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

export function hourLabel(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

function HourChips({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (h: number | null) => void;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: 10 }}>
      <T style={{ fontSize: 11.5, fontWeight: '700', color: c.muted, paddingHorizontal: 20, marginBottom: 6 }}>{label}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 20 }}>
        {HOURS.map((h) => {
          const on = value === h;
          return (
            <Pressable
              key={h}
              onPress={() => { haptic.tick(); onChange(on ? null : h); }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} ${hourLabel(h)}`}
              style={{
                paddingVertical: 6.5, paddingHorizontal: 11, borderRadius: 999,
                backgroundColor: on ? c.accent50 : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.line,
              }}
            >
              <T style={{ fontSize: 12, fontWeight: '700', color: on ? c.accent : c.inkSoft }}>{hourLabel(h)}</T>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function FlightTimesRow({
  open,
  onToggle,
  arriveHour,
  departHour,
  onChangeArrive,
  onChangeDepart,
}: {
  open: boolean;
  onToggle: () => void;
  arriveHour: number | null;
  departHour: number | null;
  onChangeArrive: (h: number | null) => void;
  onChangeDepart: (h: number | null) => void;
}) {
  const { c } = useTheme();
  const set = arriveHour != null || departHour != null;
  const summary = set
    ? [arriveHour != null ? `Land ${hourLabel(arriveHour)}` : null, departHour != null ? `Fly out ${hourLabel(departHour)}` : null]
        .filter(Boolean)
        .join(' · ')
    : 'Optional, we’ll plan around your flights';

  return (
    <View style={{ paddingTop: 12 }}>
      <Pressable
        onPress={() => { haptic.tick(); onToggle(); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{
          marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 9,
          paddingVertical: 10, paddingHorizontal: 13, borderRadius: 14,
          backgroundColor: c.surface, borderWidth: 1, borderColor: set ? c.accent : c.line,
        }}
      >
        <T style={{ fontSize: 14 }}>✈️</T>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 13, fontWeight: '800' }}>Flight times</T>
          <T style={{ fontSize: 11.5, color: set ? c.accent : c.muted, fontWeight: '600', marginTop: 1 }} numberOfLines={1}>
            {summary}
          </T>
        </View>
        <T style={{ fontSize: 12, fontWeight: '800', color: c.muted }}>{open ? '−' : '+'}</T>
      </Pressable>

      {open && (
        <>
          <HourChips label="I land at" value={arriveHour} onChange={onChangeArrive} />
          <HourChips label="My flight home is at" value={departHour} onChange={onChangeDepart} />
          <T style={{ fontSize: 11, color: c.muted, paddingHorizontal: 20, marginTop: 8, lineHeight: 15 }}>
            We keep 2 hours after landing for immigration and the ride into the city, and 4 hours before
            take-off for check-in.
          </T>
        </>
      )}
    </View>
  );
}
