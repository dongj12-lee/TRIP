import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { adminListReports, adminSetRemoved, adminDismissReport, ReportRow } from '@/data/remote';
import { T, H, Screen, DetailHeader } from '@/components/base';
import { haptic } from '@/lib/haptics';

const TYPE_EMOJI: Record<string, string> = { post: '📝', comment: '💬', buddy: '👋', profile: '👤' };

// In-app moderation queue. Only reachable by admins (the row in Settings is
// gated on is_admin(); the RPCs re-check server-side, so a deep link buys
// nothing). Actions: remove/restore the reported content, or dismiss a report
// as a false alarm — both clear it from the queue.
export default function AdminScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReports(await adminListReports());
    } catch (e) {
      Alert.alert('Could not load reports', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (r: ReportRow, action: 'remove' | 'restore' | 'dismiss') => {
    setBusy(r.reportId);
    try {
      if (action === 'dismiss') await adminDismissReport(r.reportId);
      else await adminSetRemoved(r.targetType, r.targetId, action === 'remove');
      haptic.success();
      // Optimistic: drop the row (remove/dismiss) or flip its flag (restore).
      if (action === 'restore') {
        setReports((prev) => prev.map((x) => (x.reportId === r.reportId ? { ...x, removed: false } : x)));
      } else {
        setReports((prev) => prev.filter((x) => x.reportId !== r.reportId));
      }
    } catch (e) {
      Alert.alert('Action failed', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <DetailHeader title="Moderation" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 30 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.accent} colors={[c.accent]} />}
      >
        {!loading && reports.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <T style={{ fontSize: 34 }}>✅</T>
            <T style={{ fontSize: 15, fontWeight: '700', marginTop: 10 }}>Queue is clear</T>
            <T style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>No open reports right now.</T>
          </View>
        ) : (
          <View style={{ gap: 12, paddingTop: 6 }}>
            <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.6 }}>
              {reports.length > 0 ? `${reports.length} OPEN ${reports.length === 1 ? 'REPORT' : 'REPORTS'}` : ' '}
            </T>
            {reports.map((r) => (
              <View key={r.reportId} style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <T style={{ fontSize: 15 }}>{TYPE_EMOJI[r.targetType] ?? '⚑'}</T>
                  <T style={{ fontSize: 12.5, fontWeight: '700', color: c.inkSoft, textTransform: 'capitalize' }}>{r.targetType}</T>
                  {r.removed && (
                    <View style={{ backgroundColor: c.rose50, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                      <T style={{ fontSize: 10, fontWeight: '800', color: c.rose700 }}>REMOVED</T>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <View style={{ backgroundColor: c.gold50, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                    <T style={{ fontSize: 11, fontWeight: '700', color: c.gold700 }}>{r.reason ?? 'Reported'}</T>
                  </View>
                </View>

                {!!r.preview && (
                  <T style={{ fontSize: 13.5, lineHeight: 19, color: c.ink }} numberOfLines={4}>{r.preview}</T>
                )}
                <T style={{ fontSize: 11.5, color: c.muted, marginTop: 6 }}>
                  {r.author ? `by ${r.author} · ` : ''}reported by {r.reporterName ?? 'someone'}
                </T>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {r.targetType !== 'profile' && (
                    r.removed ? (
                      <ActionBtn label="Restore" onPress={() => act(r, 'restore')} busy={busy === r.reportId} tone="neutral" />
                    ) : (
                      <ActionBtn label="Remove" onPress={() => act(r, 'remove')} busy={busy === r.reportId} tone="danger" />
                    )
                  )}
                  <ActionBtn label="Dismiss" onPress={() => act(r, 'dismiss')} busy={busy === r.reportId} tone="neutral" />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ActionBtn({ label, onPress, busy, tone }: { label: string; onPress: () => void; busy: boolean; tone: 'danger' | 'neutral' }) {
  const { c } = useTheme();
  const danger = tone === 'danger';
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
        backgroundColor: danger ? c.rose50 : c.surface2,
        borderWidth: 1, borderColor: danger ? c.rose : c.line, opacity: busy ? 0.5 : 1,
      }}
    >
      <T style={{ fontSize: 13, fontWeight: '700', color: danger ? c.rose700 : c.inkSoft }}>{label}</T>
    </Pressable>
  );
}
