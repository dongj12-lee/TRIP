import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/lib/auth';
import { fetchLeaderboard, fetchMyRank, fetchFriends, fetchMyLeaderRow, removeFriend, LeaderRow } from '@/data/remote';
import { passportRank } from '@/lib/stamps';
import { T, H, Screen, DetailHeader, IconButton } from '@/components/base';
import { Icon } from '@/components/Icon';
import { AddFriendSheet } from '@/components/AddFriendSheet';
import { haptic } from '@/lib/haptics';

const MEDALS = ['🥇', '🥈', '🥉'];
type Tab = 'everyone' | 'friends';

// Seoul Explorers — ranks travelers by how much of the passport they've filled.
// "Everyone" is the global board; "Friends" ranks you against people you've
// added by handle. The competitive hook: "am I ahead of my friends?"
export default function Leaderboard() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('everyone');
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [friends, setFriends] = useState<LeaderRow[]>([]);
  const [meRow, setMeRow] = useState<LeaderRow | null>(null);
  const [me, setMe] = useState<{ rank: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    try {
      const [board, rank, fr, mine] = await Promise.all([fetchLeaderboard(50), fetchMyRank(), fetchFriends(), fetchMyLeaderRow()]);
      setRows(board);
      setMe(rank);
      setFriends(fr);
      setMeRow(mine);
    } catch {
      // empty state covers it
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Friends board = you + your friends, ranked. (Sorted client-side; small set.)
  const friendsRanked: LeaderRow[] = [...friends, ...(meRow ? [meRow] : [])]
    .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
    .sort((a, b) => b.stamps - a.stamps || b.districts - a.districts);

  const unfriend = async (id: string) => {
    haptic.tick();
    setFriends((prev) => prev.filter((f) => f.id !== id));
    try { await removeFriend(id); } catch { load(); }
  };

  const list = tab === 'everyone' ? rows : friendsRanked;

  return (
    <Screen>
      <DetailHeader
        title="Seoul Explorers"
        right={<IconButton name="plus" label="Add friend" color={c.accent} onPress={() => { haptic.tick(); setAddOpen(true); }} />}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 30 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.accent} colors={[c.accent]} />}
      >
        {/* Your standing (global) */}
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

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
          {(['everyone', 'friends'] as Tab[]).map((t) => {
            const on = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => { haptic.tick(); setTab(t); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: on ? c.ink : c.surface, borderWidth: 1, borderColor: on ? c.ink : c.line }}
              >
                <T style={{ fontSize: 13.5, fontWeight: '800', color: on ? c.paper : c.inkSoft }}>
                  {t === 'everyone' ? '🌍 Everyone' : `👥 Friends${friends.length ? ` · ${friends.length}` : ''}`}
                </T>
              </Pressable>
            );
          })}
        </View>

        {/* List */}
        {list.length === 0 && !loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 46 }}>
            <T style={{ fontSize: 30 }}>{tab === 'friends' ? '👥' : '🗺️'}</T>
            <T style={{ fontSize: 15, fontWeight: '700', marginTop: 10 }}>{tab === 'friends' ? 'No friends yet' : 'No explorers yet'}</T>
            <T style={{ fontSize: 13, color: c.muted, marginTop: 4, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 }}>
              {tab === 'friends' ? 'Add a friend by @handle to compare passports.' : 'Save spots to stamp your passport and claim the top spot.'}
            </T>
            {tab === 'friends' && (
              <Pressable onPress={() => setAddOpen(true)} style={{ marginTop: 16, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, backgroundColor: c.accent }}>
                <T style={{ fontSize: 13.5, fontWeight: '700', color: '#fff' }}>Add a friend</T>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={{ gap: 8, marginTop: 14 }}>
            {list.map((r, i) => {
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
                  {tab === 'friends' && !isMe && (
                    <Pressable onPress={() => unfriend(r.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${r.name}`} style={{ padding: 2 }}>
                      <Icon name="close" size={16} stroke={c.muted} sw={2} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <AddFriendSheet visible={addOpen} onClose={() => setAddOpen(false)} onAdded={load} />
    </Screen>
  );
}
