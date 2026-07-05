import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { useToast } from '@/components/Toast';
import { fetchBuddyInterests } from '@/data/remote';
import { T, H, Screen, DetailHeader, Card, Button } from '@/components/base';
import { Flag } from '@/components/ui';
import { ReportSheet } from '@/components/ReportSheet';

export default function BuddyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { joined, toggleJoin, profile } = useStore();
  const { buddies, placeBySlug } = useRemoteContent();
  const { showToast } = useToast();
  const [liveInterested, setLiveInterested] = useState<{ name: string; country: string; message: string }[] | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const buddy = buddies.find((b) => b.id === id);

  useEffect(() => {
    if (!buddy || !isSupabaseConfigured) return;
    fetchBuddyInterests(buddy.id).then(setLiveInterested).catch(() => {});
  }, [buddy?.id]);

  if (!buddy) return <Screen><DetailHeader title="Plan" /></Screen>;
  const isJoined = joined.has(buddy.id);
  const place = buddy.placeSlug ? placeBySlug[buddy.placeSlug] : null;
  const interestedList = liveInterested ?? buddy.interestedList;
  // buddy.interested is the server-maintained count (trigger-updated); when we
  // don't yet have a live list, fall back to it + a local optimistic +1.
  const interestedCount = liveInterested ? liveInterested.length : buddy.interested + (isJoined ? 1 : 0);

  const handleToggleJoin = () => {
    const willJoin = !isJoined;
    if (willJoin) { haptic.success(); showToast("You're in — the host will see you", '🙋'); }
    else haptic.tick();
    toggleJoin(buddy.id);
    if (liveInterested) {
      setLiveInterested((prev) =>
        !prev
          ? prev
          : willJoin
            ? [...prev, { name: 'You', country: profile.country || '🌐', message: '' }]
            : prev.filter((p) => p.name !== 'You'),
      );
    }
  };

  return (
    <Screen>
      <DetailHeader
        title="Buddy plan"
        right={
          <Pressable onPress={() => setReportOpen(true)} hitSlop={10} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
            <T style={{ fontSize: 20, color: c.muted, fontWeight: '800' }}>···</T>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 4 }}>
          <View style={{ width: 56, height: 56, borderRadius: 15, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontSize: 28 }}>{buddy.emoji}</T>
          </View>
          <H style={{ fontSize: 22, flex: 1, lineHeight: 26 }}>{buddy.activity}</H>
        </View>

        <Card style={{ padding: 15, marginTop: 16, gap: 8 }}>
          <Row label="🕒 When" value={buddy.when} />
          <Row label="📍 Where" value={place ? `${place.name} · ${buddy.neighborhood}` : buddy.neighborhood} />
          <Row label="👥 Group" value={`Up to ${buddy.groupSize} people`} />
        </Card>

        <T style={{ fontSize: 14.5, lineHeight: 22, color: c.ink, marginTop: 16 }}>{buddy.note}</T>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <Flag country={buddy.author.country} size={30} />
          <View>
            <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '700' }}>HOST</T>
            <T style={{ fontSize: 14.5, fontWeight: '700' }}>{buddy.author.name}</T>
          </View>
        </View>

        <T style={{ fontSize: 14, fontWeight: '800', marginTop: 24, marginBottom: 12 }}>
          Interested ({interestedCount})
        </T>
        <View style={{ gap: 12 }}>
          {!liveInterested && isJoined && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Flag country="🧳" size={30} />
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 13, fontWeight: '700' }}>You</T>
                <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2 }}>Count me in!</T>
              </View>
            </View>
          )}
          {interestedList.map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <Flag country={p.country} size={30} />
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 13, fontWeight: '700' }}>{p.name}</T>
                <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2 }}>{p.message}</T>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingBottom: insets.bottom + 12, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button
          label={isJoined ? "✓ You're interested" : "I'm interested 🙋"}
          variant={isJoined ? 'soft' : 'primary'}
          onPress={handleToggleJoin}
        />
      </View>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} target={{ type: 'buddy', id: buddy.id, authorId: buddy.authorId }} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <T style={{ fontSize: 13, color: c.muted, fontWeight: '700' }}>{label}</T>
      <T style={{ fontSize: 13.5, color: c.ink, fontWeight: '600', flex: 1, textAlign: 'right' }}>{value}</T>
    </View>
  );
}
