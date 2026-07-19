import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { fetchLeaderboard, fetchMyRank, fetchFriends, fetchMyLeaderRow, fetchAddedMe, addFriend, removeFriend, LeaderRow } from '@/data/remote';
import { passportRank, milestoneStamps } from '@/lib/stamps';
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
  const { stamps, saved, itinerary, sharedPost, joined, myPostCount } = useStore();
  const [tab, setTab] = useState<Tab>('everyone');

  // The current user's LIVE counts (server sync is async, so the board can lag).
  // We override "you" everywhere with these so it always matches the passport.
  const liveEarned = new Set<string>([
    ...stamps,
    ...milestoneStamps({
      savedCount: saved.size,
      hasPlan: itinerary.days.some((d) => d.stops.some((s) => s.name.trim())),
      hasShared: !!sharedPost || myPostCount > 0,
      buddyCount: joined.size,
    }),
  ]);
  let liveDistricts = 0;
  liveEarned.forEach((k) => { if (k.startsWith('district:')) liveDistricts++; });
  const withLive = (r: LeaderRow): LeaderRow => (r.id === user?.id ? { ...r, stamps: liveEarned.size, districts: liveDistricts } : r);
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [friends, setFriends] = useState<LeaderRow[]>([]);
  const [addedMe, setAddedMe] = useState<LeaderRow[]>([]);
  const [meRow, setMeRow] = useState<LeaderRow | null>(null);
  const [me, setMe] = useState<{ rank: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    try {
      const [board, rank, fr, mine, incoming] = await Promise.all([
        fetchLeaderboard(50), fetchMyRank(), fetchFriends(), fetchMyLeaderRow(), fetchAddedMe(),
      ]);
      setRows(board);
      setMe(rank);
      setFriends(fr);
      setMeRow(mine);
      setAddedMe(incoming);
    } catch {
      // empty state covers it
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const addBack = async (r: LeaderRow) => {
    haptic.success();
    setAddedMe((prev) => prev.filter((x) => x.id !== r.id));
    setFriends((prev) => (prev.some((f) => f.id === r.id) ? prev : [...prev, r]));
    try { await addFriend(r.id); } catch { load(); }
  };

  // Friends board = you + your friends, ranked. (Sorted client-side; small set.)
  const friendsRanked: LeaderRow[] = [...friends, ...(meRow ? [meRow] : [])]
    .map(withLive)
    .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
    .sort((a, b) => b.stamps - a.stamps || b.districts - a.districts);

  const unfriend = async (id: string) => {
    haptic.tick();
    setFriends((prev) => prev.filter((f) => f.id !== id));
    try { await removeFriend(id); } catch { load(); }
  };

  const list = (tab === 'everyone' ? rows : friendsRanked)
    .map(withLive)
    .sort((a, b) => b.stamps - a.stamps || b.districts - a.districts);

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
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: on ? c.ink : c.surface, borderWidth: 1, borderColor: on ? c.ink : c.line }}
              >
                <T style={{ fontSize: 13.5, fontWeight: '800', color: on ? c.paper : c.inkSoft }}>
                  {t === 'everyone' ? '🌍 Everyone' : `👥 Friends${friends.length ? ` · ${friends.length}` : ''}`}
                </T>
              </Pressable>
            );
          })}
        </View>

        {/* Added-you prompts (Friends tab) — mutual growth */}
        {tab === 'friends' && addedMe.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.6, marginBottom: 8 }}>
              👋 ADDED YOU · {addedMe.length}
            </T>
            <View style={{ gap: 8 }}>
              {addedMe.map((r) => (
                <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.accent50, borderRadius: 14, borderWidth: 1, borderColor: c.accent, padding: 12 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T style={{ fontSize: 14.5, fontWeight: '800', color: c.ink }} numberOfLines={1}>{r.name}</T>
                      {!!r.country && <T style={{ fontSize: 13 }}>{r.country}</T>}
                    </View>
                    <T style={{ fontSize: 11.5, color: c.inkSoft, fontWeight: '600', marginTop: 1 }}>{r.stamps} stamps · {r.districts}/25 gu</T>
                  </View>
                  <Pressable onPress={() => addBack(r)} accessibilityRole="button" accessibilityLabel={`Add ${r.name} back`} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.accent }}>
                    <T style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Add back</T>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* List */}
        {list.length === 0 && !loading && !(tab === 'friends' && addedMe.length > 0) ? (
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
