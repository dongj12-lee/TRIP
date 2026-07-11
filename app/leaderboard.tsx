import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/lib/auth';
import { fetchLeaderboard, fetchMyRank, LeaderRow } from '@/data/remote';
import { passportRank } from '@/lib/stamps';
import { T, H, Screen, DetailHeader } from '@/components/base';

const MEDALS = ['🥇', '🥈', '🥉'];

// Seoul Explorers — ranks travelers by how much of the passport they've filled.
// The competitive hook: "am I ahead?" Reads the public profile counts synced
// from each user's local passport (see lib/store syncPassport).
export default function Leaderboard() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [me, setMe] = useState<{ rank: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [board, rank] = await Promise.all([fetchLeaderboard(50), fetchMyRank()]);
      setRows(board);
      setMe(rank);
    } catch {
      // leave empty; the empty state covers it
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <Screen>
      <DetailHeader title="Seoul Explorers" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 30 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.accent} colors={[c.accent]} />}
      >
        {/* Your standing */}
        {me && me.rank > 0 && (
          <View style={{ backgroundColor: c.ink, borderRadius: 18, padding: 16, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ alignItems: 'center' }}>
              <T style={{ fontSize: 11, fontWeight: '800', color: c.paper, opacity: 0.6, letterSpacing: 1 }}>RANK</T>
              <H style={{ fontSize: 30, color: c.paper }}>#{me.rank}</H>
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 14, fontWeight: '800', color: c.paper }}>You're ranked #{me.rank}</T>
              <T style={{ fontSize: 12.5, color: c.paper, opacity: 0.7, marginTop: 2, fontWeight: '600' }}>
                of {me.total.toLocaleString()} Seoul explorer{me.total === 1 ? '' : 's'}
              </T>
            </View>
            <T style={{ fontSize: 30 }}>🎫</T>
          </View>
        )}

        <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.8, marginTop: 22, marginBottom: 10 }}>TOP EXPLORERS</T>

        {rows.length === 0 && !loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <T style={{ fontSize: 30 }}>🗺️</T>
            <T style={{ fontSize: 15, fontWeight: '700', marginTop: 10 }}>No explorers yet</T>
            <T style={{ fontSize: 13, color: c.muted, marginTop: 4, textAlign: 'center', lineHeight: 19 }}>
              Save spots to stamp your passport and claim the top spot.
            </T>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {rows.map((r, i) => {
              const isMe = r.id === user?.id;
              const rk = passportRank(r.stamps);
              return (
                <View
                  key={r.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: isMe ? c.accent50 : c.surface,
                    borderRadius: 14, borderWidth: 1, borderColor: isMe ? c.accent : c.line, padding: 12,
                  }}
                >
                  <View style={{ width: 30, alignItems: 'center' }}>
                    {i < 3 ? <T style={{ fontSize: 20 }}>{MEDALS[i]}</T> : <T style={{ fontSize: 14, fontWeight: '800', color: c.muted }}>{i + 1}</T>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T style={{ fontSize: 14.5, fontWeight: '800', color: c.ink }} numberOfLines={1}>{r.name}</T>
                      {!!r.country && <T style={{ fontSize: 13 }}>{r.country}</T>}
                      {isMe && <T style={{ fontSize: 11, fontWeight: '800', color: c.accent }}>YOU</T>}
                    </View>
                    <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600', marginTop: 1 }}>{rk.emoji} {rk.title}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T style={{ fontSize: 15, fontWeight: '800', color: c.accent }}>{r.stamps}</T>
                    <T style={{ fontSize: 10.5, color: c.muted, fontWeight: '700' }}>{r.districts}/25 gu</T>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
