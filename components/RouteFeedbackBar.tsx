import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ROUTE_PROMPTS } from '@/lib/routePrompts';
import { haptic } from '@/lib/haptics';
import { fetchMyRouteFeedback, toggleRouteFeedback } from '@/data/remote';
import { T } from './base';

// One-click structured feedback for a shared Route post. Anyone can tap a
// prompt ("Too packed?", "Reorder this"…) instead of writing a comment; taps
// aggregate into live tallies. This is the back half of the plan→share→feedback
// loop, low-friction signal the itinerary author can act on at a glance.
export function RouteFeedbackBar({ postId, initialCounts }: { postId?: string; initialCounts?: Record<string, number> }) {
  const { c } = useTheme();
  const { session } = useAuth();
  const canWrite = isSupabaseConfigured && !!session && !!postId;

  const [counts, setCounts] = useState<Record<string, number>>(initialCounts ?? {});
  const [mine, setMine] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!canWrite || !postId) return;
    fetchMyRouteFeedback(postId).then((keys) => setMine(new Set(keys))).catch(() => {});
  }, [canWrite, postId]);

  const toggle = (key: string) => {
    const on = !mine.has(key);
    haptic.tick();
    // optimistic
    setMine((prev) => {
      const n = new Set(prev);
      on ? n.add(key) : n.delete(key);
      return n;
    });
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + (on ? 1 : -1)) }));
    if (canWrite && postId) toggleRouteFeedback(postId, key, on).catch(() => {});
  };

  return (
    <View style={{ marginTop: 20 }}>
      <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.6, marginBottom: 10 }}>
        QUICK FEEDBACK
      </T>
      {/* Fixed 3-column grid, not a free-flowing wrap: six chips of uneven
          label length ("Love it" vs "Missing a spot") wrapped unpredictably
          at 2+2+1 or worse depending on width, so each cell gets an equal
          share of the row instead of only as much as its own text needs. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ROUTE_PROMPTS.map((p) => {
          const on = mine.has(p.key);
          const n = counts[p.key] ?? 0;
          return (
            <Pressable
              key={p.key}
              onPress={() => toggle(p.key)}
              style={{
                // A fixed width, not flexBasis+flexGrow: RN's default
                // flexShrink:0 let the longest label ("Missing a spot") win
                // its natural width and grow eat the rest, which pushed the
                // grid to 3+2+1 instead of 3+3. Width is unconditional.
                width: '31%',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14,
                borderWidth: 1, borderColor: on ? c.accent : c.line,
                backgroundColor: on ? c.accent50 : c.surface,
              }}
            >
              <T style={{ fontSize: 14 }}>{p.emoji}</T>
              <T numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: on ? c.accent : c.inkSoft }}>
                {p.label}
              </T>
              {n > 0 && (
                <T style={{ fontSize: 12, fontWeight: '800', color: on ? c.accent : c.muted }}>{n}</T>
              )}
            </Pressable>
          );
        })}
      </View>
      {!canWrite && (
        <T style={{ fontSize: 11.5, color: c.muted, marginTop: 8 }}>Sign in to leave feedback.</T>
      )}
    </View>
  );
}
