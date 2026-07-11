import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { fetchMyRank } from '@/data/remote';
import { Icon } from '@/components/Icon';
import {
  DISTRICT_STAMPS, EXPERIENCE_STAMPS, MILESTONE_STAMPS, CONQUEST_TIERS,
  milestoneStamps, progressFor, passportRank, highestConquest, StampDef, ConquestTier,
} from '@/lib/stamps';
import { T, H, Screen, DetailHeader, IconButton } from '@/components/base';
import { CollectionMap, DistrictLegend } from '@/components/CollectionMap';
import { ShareCardSheet } from '@/components/ShareCardSheet';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { haptic } from '@/lib/haptics';

export default function Passport() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { stamps, saved, itinerary, sharedPost, joined, myPostCount, profile, seenConquest, markConquestSeen } = useStore();
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<ConquestTier | null>(null);
  const [myRank, setMyRank] = useState<{ rank: number; total: number } | null>(null);
  useEffect(() => { fetchMyRank().then(setMyRank).catch(() => {}); }, []);

  // Earned = grow-only place stamps ∪ live milestones.
  const earned = useMemo(() => {
    const ms = milestoneStamps({
      savedCount: saved.size,
      hasPlan: itinerary.days.some((d) => d.stops.some((s) => s.name.trim())),
      hasShared: !!sharedPost || myPostCount > 0,
      buddyCount: joined.size,
    });
    return new Set<string>([...stamps, ...ms]);
  }, [stamps, saved.size, itinerary, sharedPost, myPostCount, joined.size]);

  const earnedDistricts = useMemo(() => {
    const s = new Set<string>();
    earned.forEach((k) => { if (k.startsWith('district:')) s.add(k.slice('district:'.length)); });
    return s;
  }, [earned]);

  const prog = progressFor(earned);
  const rank = passportRank(earned.size);
  const pct = Math.round((earned.size / prog.total) * 100);

  // Celebrate a newly-crossed district conquest tier (once).
  useEffect(() => {
    const tier = highestConquest(prog.districts);
    if (tier && tier.districts > seenConquest) {
      setCelebrate(tier);
      markConquestSeen(tier.districts);
    }
  }, [prog.districts, seenConquest]);

  return (
    <Screen>
      <DetailHeader
        title="Seoul Passport"
        right={
          earned.size > 0 ? (
            <IconButton name="share" label="Share passport" color={c.accent} onPress={() => { haptic.tick(); setShareOpen(true); }} />
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        {/* Rank + progress */}
        <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <T style={{ fontSize: 30 }}>{rank.emoji}</T>
            <View style={{ flex: 1 }}>
              <H style={{ fontSize: 22 }}>{rank.title}</H>
              <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '600' }}>
                {earned.size} of {prog.total} stamps · {prog.districts}/25 districts
              </T>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <H style={{ fontSize: 24, color: c.accent }}>{pct}%</H>
            </View>
          </View>
          <View style={{ height: 8, borderRadius: 999, backgroundColor: c.surface2, overflow: 'hidden', marginTop: 12 }}>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: c.accent, width: `${Math.max(3, pct)}%` }} />
          </View>
        </View>

        {/* Leaderboard entry — the competitive hook */}
        {earned.size > 0 && (
          <Pressable
            onPress={() => { haptic.tick(); router.push('/leaderboard'); }}
            accessibilityRole="button"
            accessibilityLabel="Open Seoul Explorers leaderboard"
            style={({ pressed }) => [
              { marginHorizontal: 18, marginTop: 16, backgroundColor: c.ink, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
              pressed && { opacity: 0.92 },
            ]}
          >
            <T style={{ fontSize: 24 }}>🏆</T>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 14.5, fontWeight: '800', color: c.paper }}>
                {myRank && myRank.rank > 0 ? `You're #${myRank.rank} of ${myRank.total.toLocaleString()} explorers` : 'Seoul Explorers'}
              </T>
              <T style={{ fontSize: 12, color: c.paper, opacity: 0.7, marginTop: 1, fontWeight: '600' }}>See how you rank against other travelers</T>
            </View>
            <Icon name="chevron" size={18} stroke={c.paper} sw={2} />
          </Pressable>
        )}

        {/* The map fills in */}
        <View style={{ marginHorizontal: 18, marginTop: 18, backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.line, paddingVertical: 14 }}>
          <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.8, textAlign: 'center' }}>YOUR SEOUL</T>
          <CollectionMap earned={earnedDistricts} height={250} />
          <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '600', textAlign: 'center', marginTop: 2 }}>
            {prog.districts === 0
              ? 'Save a spot to stamp your first district'
              : prog.districts >= 25
                ? '🎉 All 25 districts stamped — Seoul is yours!'
                : `${25 - prog.districts} districts to go`}
          </T>
          <View style={{ paddingHorizontal: 14 }}>
            <DistrictLegend earned={earnedDistricts} />
          </View>
        </View>

        {/* Seoul Conquest — district-milestone reward track */}
        <View style={{ paddingHorizontal: 18, paddingTop: 24 }}>
          <H style={{ fontSize: 18 }}>Seoul Conquest</H>
          <T style={{ fontSize: 12.5, color: c.muted, marginBottom: 12, marginTop: 3 }}>Rewards for stamping more districts</T>
          <View style={{ gap: 8 }}>
            {CONQUEST_TIERS.map((t) => {
              const got = prog.districts >= t.districts;
              return (
                <View key={t.districts} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: got ? c.accent50 : c.surface, borderRadius: 14, borderWidth: 1, borderColor: got ? c.accent : c.line, padding: 12 }}>
                  <T style={{ fontSize: 26, opacity: got ? 1 : 0.35 }}>{t.emoji}</T>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 14.5, fontWeight: '800', color: got ? c.ink : c.muted }}>{t.title}</T>
                    <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '600', marginTop: 1 }}>{t.blurb}</T>
                  </View>
                  {got ? (
                    <T style={{ fontSize: 12, fontWeight: '800', color: c.accent }}>DONE</T>
                  ) : (
                    <T style={{ fontSize: 12, fontWeight: '700', color: c.muted }}>{t.districts} gu</T>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Experience badges */}
        <StampSection title="Experiences" subtitle="Earned by saving different kinds of places" stamps={EXPERIENCE_STAMPS} earned={earned} />

        {/* Milestones */}
        <StampSection title="Milestones" subtitle="First steps around the app" stamps={MILESTONE_STAMPS} earned={earned} />

        <T style={{ textAlign: 'center', color: c.muted, fontSize: 12, marginTop: 24, paddingHorizontal: 30, lineHeight: 18 }}>
          Save or ♥ places as you explore — your passport fills up automatically.
        </T>
      </ScrollView>

      <ShareCardSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        passport={{
          earnedDistricts: [...earnedDistricts],
          rankTitle: rank.title,
          rankEmoji: rank.emoji,
          earned: earned.size,
          total: prog.total,
          districts: prog.districts,
        }}
        handle={profile.handle}
      />

      <CelebrationOverlay tier={celebrate} onClose={() => setCelebrate(null)} onShare={() => setShareOpen(true)} />
    </Screen>
  );
}

function StampSection({ title, subtitle, stamps, earned }: { title: string; subtitle: string; stamps: StampDef[]; earned: Set<string> }) {
  const { c } = useTheme();
  const gotCount = stamps.filter((s) => earned.has(s.key)).length;
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 3 }}>
        <H style={{ fontSize: 18 }}>{title}</H>
        <T style={{ fontSize: 12.5, fontWeight: '700', color: c.accent }}>{gotCount}/{stamps.length}</T>
      </View>
      <T style={{ fontSize: 12.5, color: c.muted, marginBottom: 12 }}>{subtitle}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stamps.map((s) => (
          <StampBadge key={s.key} stamp={s} got={earned.has(s.key)} />
        ))}
      </View>
    </View>
  );
}

function StampBadge({ stamp, got }: { stamp: StampDef; got: boolean }) {
  const { c } = useTheme();
  // 3 per row.
  return (
    <View style={{ width: '31%', alignItems: 'center', backgroundColor: got ? c.accent50 : c.surface, borderRadius: 16, borderWidth: 1, borderColor: got ? c.accent : c.line, paddingVertical: 14, paddingHorizontal: 6 }}>
      <View
        style={{
          width: 52, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
          backgroundColor: got ? c.surface : c.surface2,
          borderWidth: got ? 2 : 1, borderColor: got ? c.accent : c.line,
          borderStyle: got ? 'solid' : 'dashed',
        }}
      >
        <T style={{ fontSize: 26, opacity: got ? 1 : 0.35 }}>{stamp.emoji}</T>
      </View>
      <T style={{ fontSize: 11.5, fontWeight: '800', color: got ? c.ink : c.muted, marginTop: 8, textAlign: 'center' }} numberOfLines={1}>
        {stamp.label}
      </T>
      <T style={{ fontSize: 10, color: c.muted, marginTop: 2, textAlign: 'center', lineHeight: 13 }} numberOfLines={2}>
        {got ? 'Collected' : stamp.hint}
      </T>
    </View>
  );
}
