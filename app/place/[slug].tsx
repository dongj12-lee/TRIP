import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Modal, Linking } from 'react-native';
import * as Speech from 'expo-speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchPlace } from '@/data/remote';
import { FIT_TAGS, fitTagsFor } from '@/data';
import { ForeignerTagKey } from '@/data/types';
import { T, H, Button } from '@/components/base';
import { Icon } from '@/components/Icon';
import { Photo, Chip, Rating } from '@/components/ui';
import { PostCardMini } from '@/components/cards';
import { ShareCardSheet } from '@/components/ShareCardSheet';
import { PlaceShareData } from '@/components/ShareCard';
import { useToast } from '@/components/Toast';
import { guLabel } from '@/lib/format';
import { normalizeDistrict } from '@/lib/stamps';
import { haptic } from '@/lib/haptics';

// Handy phrases are specific to the kind of place — a temple and a bar call
// for different lines, and knowing WHO to say it to (the "audience" tag)
// matters as much as the phrase itself. Keyed by `category`, with a couple of
// `category:categoryL2` overrides where the L1 bucket is too broad (e.g.
// Cuisine covers everything from a bar to a café). `ko`/`ro` are read aloud
// via the speaker button (expo-speech, ko-KR) as well as shown on screen.
type Phrase = { en: string; ko: string; ro: string; audience: string };

const TAXI_PHRASE: Phrase = { en: 'Please take me to this address.', ko: '이 주소로 가주세요.', ro: 'I juso-ro gajuseyo.', audience: 'Taxi driver' };
const CARD_PHRASE: Phrase = { en: 'Can I pay by card?', ko: '카드로 결제할 수 있어요?', ro: 'Kadeu-ro gyeoljehal su isseoyo?', audience: 'Cashier' };

const PHRASES_BY_CATEGORY: Record<string, Phrase[]> = {
  Cuisine: [
    { en: 'Table for one, please.', ko: '혼자 왔어요. 한 명이요.', ro: 'Honja wasseoyo. Han myeong-iyo.', audience: 'Server' },
    { en: 'Do you have an English menu?', ko: '영어 메뉴 있어요?', ro: 'Yeong-eo menyu isseoyo?', audience: 'Server' },
    { en: 'Not spicy, please.', ko: '안 맵게 해주세요.', ro: 'An maepge haejuseyo.', audience: 'Server' },
    CARD_PHRASE,
  ],
  'Cuisine:Bars & Clubs': [
    { en: 'One beer, please.', ko: '맥주 한 잔 주세요.', ro: 'Maekju han jan juseyo.', audience: 'Bartender' },
    { en: 'Is there a cover charge?', ko: '입장료 있어요?', ro: 'Ipjangnyo isseoyo?', audience: 'Staff' },
    CARD_PHRASE,
  ],
  'Cuisine:Cafes & Tea Shops': [
    { en: 'For here, please.', ko: '여기서 마실게요.', ro: 'Yeogiseo masilgeyo.', audience: 'Cashier' },
    { en: 'Iced, please.', ko: '아이스로 주세요.', ro: 'Aiseu-ro juseyo.', audience: 'Cashier' },
    { en: 'Do you have Wi-Fi?', ko: '와이파이 있어요?', ro: 'Waipai isseoyo?', audience: 'Staff' },
    CARD_PHRASE,
  ],
  Shopping: [
    { en: 'Can I try this on?', ko: '이거 입어봐도 돼요?', ro: 'Igeo ibeobwado dwaeyo?', audience: 'Shop staff' },
    { en: 'Do you have this in a different size?', ko: '다른 사이즈 있어요?', ro: 'Dareun saijeu isseoyo?', audience: 'Shop staff' },
    { en: 'Tax refund, please.', ko: '택스 리펀드 해주세요.', ro: 'Taekseu ripeondeu haejuseyo.', audience: 'Cashier' },
    CARD_PHRASE,
  ],
  'Shopping:Traditional Markets': [
    { en: 'How much is this?', ko: '이거 얼마예요?', ro: 'Igeo eolmayeyo?', audience: 'Vendor' },
    { en: 'Can you make it a bit cheaper?', ko: '조금 깎아주세요.', ro: 'Jogeum kkakkajuseyo.', audience: 'Vendor' },
  ],
  Culture: [
    { en: 'One adult ticket, please.', ko: '성인 한 장이요.', ro: 'Seong-in han jang-iyo.', audience: 'Ticket counter' },
    { en: 'Is there an English audio guide?', ko: '영어 오디오 가이드 있어요?', ro: 'Yeong-eo odio gaideu isseoyo?', audience: 'Staff' },
    { en: 'What time does it close?', ko: '몇 시에 닫아요?', ro: 'Myeot si-e dadayo?', audience: 'Staff' },
  ],
  History: [
    { en: 'One adult ticket, please.', ko: '성인 한 장이요.', ro: 'Seong-in han jang-iyo.', audience: 'Ticket counter' },
    { en: 'Is photography allowed here?', ko: '여기 사진 찍어도 돼요?', ro: 'Yeogi sajin jjigeodo dwaeyo?', audience: 'Staff' },
    { en: 'What time does it close?', ko: '몇 시에 닫아요?', ro: 'Myeot si-e dadayo?', audience: 'Staff' },
  ],
  Nature: [
    { en: 'Where is the trail entrance?', ko: '등산로 입구가 어디예요?', ro: 'Deungsanno ipgu-ga eodiyeyo?', audience: 'Staff' },
    { en: 'Is there a shuttle bus?', ko: '셔틀버스 있어요?', ro: 'Syeoteulbeoseu isseoyo?', audience: 'Staff' },
  ],
  'Experience Programs': [
    { en: 'Is there an English-speaking instructor?', ko: '영어 가능한 강사님 있어요?', ro: 'Yeong-eo ganeunghan gangsanim isseoyo?', audience: 'Staff' },
    { en: 'How long does this take?', ko: '얼마나 걸려요?', ro: 'Eolmana geollyeoyo?', audience: 'Staff' },
    CARD_PHRASE,
  ],
};

// Taxi phrase always appears last — every place needs "take me here" regardless
// of what kind of place it is.
function phrasesFor(category: string, categoryL2?: string | null): Phrase[] {
  const specific = (categoryL2 && PHRASES_BY_CATEGORY[`${category}:${categoryL2}`]) || PHRASES_BY_CATEGORY[category] || [];
  return [...specific, TAXI_PHRASE];
}

// Over-photo hero controls — a dark scrim circle so they read on any cover
// (a light button vanished on bright photos).
const heroBtn = {
  width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
  backgroundColor: 'rgba(20,16,12,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
} as const;

export default function PlaceDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saved, toggleSave, placeReactions, togglePlaceReaction, tagVotes, toggleTagVote, itinerary, setItinerary, profile, stamps } = useStore();
  const { placeBySlug, posts } = useRemoteContent();
  const { showToast } = useToast();
  const [sheet, setSheet] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  const place = placeBySlug[slug!];
  // Optimistic like/dislike counts — seed from the server counts and re-sync
  // whenever they change (fires once when the place data loads).
  const [likeN, setLikeN] = useState(0);
  const [dislikeN, setDislikeN] = useState(0);
  useEffect(() => {
    setLikeN(place?.likeCount ?? 0);
    setDislikeN(place?.dislikeCount ?? 0);
  }, [place?.likeCount, place?.dislikeCount]);

  // Stop any in-progress phrase playback when the sheet closes (swipe-down,
  // backdrop tap, or Android back button all route through this).
  useEffect(() => {
    if (!sheet) { Speech.stop(); setSpeakingIdx(null); }
  }, [sheet]);

  // Optimistic Foreigner Fit yes/no counts — seeded once per place, then
  // nudged locally on each tap (the server trigger keeps the real counts in
  // sync).
  const [tagCounts, setTagCounts] = useState<Partial<Record<string, { yes: number; no: number }>>>({});
  useEffect(() => {
    setTagCounts(place?.votes ?? {});
  }, [place?.slug]);

  // The browse query omits `description` for payload size, so fetch the full
  // record here. Seed/offline places already carry their own description.
  const [description, setDescription] = useState(place?.description ?? '');
  useEffect(() => {
    if (!place) return;
    if (place.description) { setDescription(place.description); return; }
    if (!isSupabaseConfigured) return;
    let alive = true;
    fetchPlace(place.slug).then((full) => { if (alive && full?.description) setDescription(full.description); }).catch(() => {});
    return () => { alive = false; };
  }, [place?.slug]);

  if (!place) return <View style={{ flex: 1, backgroundColor: c.paper }} />;

  const fitKeys = fitTagsFor(place.category, place.categoryL2);
  const phrases = phrasesFor(place.category, place.categoryL2);
  const speak = (i: number, ko: string) => {
    haptic.tick();
    Speech.stop();
    if (speakingIdx === i) { setSpeakingIdx(null); return; } // tap again to stop
    setSpeakingIdx(i);
    Speech.speak(ko, { language: 'ko-KR', rate: 0.92, onDone: () => setSpeakingIdx(null), onStopped: () => setSpeakingIdx(null), onError: () => setSpeakingIdx(null) });
  };
  const isSaved = saved.has(place.slug);
  // Split the description into an editorial lead (first sentence, set large)
  // and the rest (supporting body). Only break at a real sentence boundary —
  // ≥40 chars, ending in .!?, followed by whitespace + an uppercase/quote —
  // so dates like "War (6. 25. 1950)" don't fool it. Hermes-safe (no
  // lookbehind; lookahead/capture only).
  const descMatch = description.match(/^([\s\S]{40,}?[.!?])\s+([A-Z"'“][\s\S]*)$/);
  const descLead = descMatch ? descMatch[1] : description;
  const descRest = descMatch ? descMatch[2] : '';
  const onSave = () => {
    haptic.tick();
    if (!isSaved) {
      // Celebrate a newly-stamped district (passport dopamine).
      const gu = normalizeDistrict(place.neighborhood);
      const newDistrict = gu && !stamps.has(`district:${gu}`);
      if (newDistrict) showToast(`${gu}-gu stamped! 🎫`, '🎉');
      else showToast('Saved to your spots', '🔖');
    }
    toggleSave(place.slug);
  };
  const myReaction = placeReactions[place.slug];
  const react = (r: 'like' | 'dislike') => {
    const cur = placeReactions[place.slug];
    setLikeN((n) => n + (r === 'like' ? (cur === 'like' ? -1 : 1) : cur === 'like' ? -1 : 0));
    setDislikeN((n) => n + (r === 'dislike' ? (cur === 'dislike' ? -1 : 1) : cur === 'dislike' ? -1 : 0));
    haptic.tick();
    if (r === 'like' && cur !== 'like') showToast('Added to your likes', '👍');
    togglePlaceReaction(place.slug, r);
  };
  const onVoteTag = (key: ForeignerTagKey, vote: 'yes' | 'no') => {
    const votingKey = `${place.slug}:${key}`;
    const current = tagVotes[votingKey]; // 'yes' | 'no' | undefined
    setTagCounts((prev) => {
      const c = prev[key] ?? { yes: 0, no: 0 };
      const next = { ...c };
      if (current === vote) next[vote] = Math.max(0, next[vote] - 1); // undo
      else {
        next[vote] += 1;
        if (current) next[current] = Math.max(0, next[current] - 1); // switching sides
      }
      return { ...prev, [key]: next };
    });
    haptic.tick();
    if (current !== vote) showToast(vote === 'yes' ? 'Thanks for confirming' : 'Thanks for the heads-up', vote === 'yes' ? '✅' : '📝');
    toggleTagVote(place.slug, key, vote);
  };
  const relatedPosts = posts.filter((p) => p.placeSlug === place.slug);
  const hasFacts = place.subway || place.freeEntry || place.englishSite || place.wheelchair;

  // One-tap browse→plan: drop this place into the last itinerary day.
  const inTrip = itinerary.days.some((d) => d.stops.some((s) => s.slug === place.slug));
  const addToTrip = () => {
    haptic.tick();
    if (inTrip) {
      showToast('Already in your trip', '🗓');
      return;
    }
    setItinerary((prev) => {
      const days = prev.days.length ? [...prev.days] : [{ label: 'Day 1', date: '', theme: '', stops: [] }];
      const di = days.length - 1;
      days[di] = {
        ...days[di],
        stops: [
          ...days[di].stops,
          {
            time: '', part: '', name: place.name, note: '', slug: place.slug,
            swatch: place.swatch, lat: place.lat, lng: place.lng, category: place.category, photoUrl: place.photoUrl,
          },
        ],
      };
      return { ...prev, days };
    });
    showToast(`Added to ${itinerary.days[itinerary.days.length - 1]?.label ?? 'Day 1'}`, '✨');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        {/* Hero photo — a clean band. The headline lives below on paper,
            editorial-style, instead of trapped over a busy image. */}
        <View style={{ height: 240 }}>
          <Photo uri={place.photoUrl} swatch={place.swatch} height={240} />
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }} />
          <View style={{ position: 'absolute', top: insets.top, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back" style={heroBtn}>
              <Icon name="back" size={22} stroke="#fff" sw={2.2} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => { haptic.tick(); setShareOpen(true); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share this place" style={heroBtn}>
                <Icon name="share" size={20} stroke="#fff" sw={2.2} />
              </Pressable>
              <Pressable onPress={onSave} hitSlop={8} accessibilityRole="button" accessibilityLabel={isSaved ? 'Remove from saved' : 'Save this place'} style={heroBtn}>
                <Icon name="heart" size={22} fill={isSaved ? c.rose : 'none'} stroke={isSaved ? c.rose : '#fff'} sw={2.2} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Editorial header */}
        <View style={{ paddingHorizontal: 18, paddingTop: 20 }}>
          {!!place.kContentTitle && (
            <Chip tone="gold" style={{ alignSelf: 'flex-start', marginBottom: 12 }}>{`🎬 ${place.kContentTitle}`}</Chip>
          )}
          <T style={{ fontSize: 12.5, fontWeight: '800', color: c.accent, letterSpacing: 0.2 }}>
            {place.category}{place.neighborhood ? `   ·   ${guLabel(place.neighborhood)}` : ''}
          </T>
          <H style={{ fontSize: 31, color: c.ink, lineHeight: 37, marginTop: 7 }}>{place.name}</H>
          {(place.rating != null || !!place.priceRange) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              {place.rating != null && <Rating value={place.rating} count={place.reviews} size={15} />}
              {place.rating != null && !!place.priceRange && <T style={{ color: c.muted }}>·</T>}
              {!!place.priceRange && <T style={{ fontSize: 13.5, color: c.inkSoft, fontWeight: '700' }}>{place.priceRange}</T>}
            </View>
          )}
          {/* The business's own official website, when they have one — not a
              review source (see migration-025 for why there's no such link). */}
          {!!place.websiteUrl && (
            <Pressable
              onPress={() => { haptic.tick(); Linking.openURL(place.websiteUrl!); }}
              accessibilityRole="button"
              accessibilityLabel="Visit website"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12 }}
            >
              <Icon name="globe" size={14} stroke={c.accent} sw={2} />
              <T style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>Visit website</T>
            </Pressable>
          )}
        </View>

        {/* Show-to-staff card */}
        <Pressable
          onPress={() => setSheet(true)}
          style={{ marginHorizontal: 18, marginTop: 20, padding: 15, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Icon name="translate" size={24} stroke={c.accent} sw={1.9} />
          <View style={{ flex: 1 }}>
            <H style={{ fontSize: 19 }}>{place.nameKo}</H>
            <T style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>Tap to show staff or a taxi driver</T>
          </View>
          <Icon name="chevron" size={18} stroke={c.muted} sw={2} />
        </Pressable>

        {/* Like / dislike — the community satisfaction signal */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 16 }}>
          <ReactionButton
            active={myReaction === 'like'}
            emoji="👍"
            label={likeN > 0 ? `Like · ${likeN}` : 'Like'}
            activeBg={c.sage50}
            activeColor={c.sage700}
            onPress={() => react('like')}
          />
          <ReactionButton
            active={myReaction === 'dislike'}
            emoji="👎"
            label={dislikeN > 0 ? `${dislikeN}` : 'Not for me'}
            activeBg={c.rose50}
            activeColor={c.rose700}
            onPress={() => react('dislike')}
          />
          <ReactionButton
            active={inTrip}
            emoji="🗓"
            label={inTrip ? 'In trip' : 'Add to trip'}
            activeBg={c.accent50}
            activeColor={c.accent}
            onPress={addToTrip}
          />
        </View>

        {/* About — the place's editorial "read", surfaced up top (was buried
            at the very bottom) with the opening line set large as a lead. */}
        {!!description && (
          <View style={{ paddingHorizontal: 18, paddingTop: 28 }}>
            <H style={{ fontSize: 19, marginBottom: 12 }}>About</H>
            <T style={{ fontSize: 16.5, lineHeight: 27, color: c.ink }}>{descLead}</T>
            {!!descRest && <T style={{ fontSize: 14.5, lineHeight: 23, color: c.inkSoft, marginTop: 11 }}>{descRest}</T>}
            {/* price already sits in the header, so it's not repeated here */}
            <View style={{ marginTop: 20, gap: 10 }}>
              {!!place.hours && <InfoRow icon="clock" text={place.hours} />}
              {!!place.address && <InfoRow icon="pin" text={place.address} />}
            </View>
          </View>
        )}

        {/* Good to know — objective facts from Visit Seoul (distinct from the
            community-voted Foreigner Fit below) */}
        {hasFacts && (
          <View style={{ paddingHorizontal: 18, paddingTop: 28 }}>
            <H style={{ fontSize: 19, marginBottom: 10 }}>Good to know</H>
            <View style={{ gap: 8 }}>
              {!!place.subway && <FactRow emoji="🚇" text={place.subway} />}
              {place.freeEntry && <FactRow emoji="🎟️" text="Free entry" />}
              {place.englishSite && <FactRow emoji="🌐" text="English website available" />}
              {place.wheelchair && <FactRow emoji="♿" text="Step-free / accessible facilities" />}
            </View>
          </View>
        )}

        {/* K-content connection */}
        {!!place.kContentTitle && (
          <View style={{ marginHorizontal: 18, marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: c.gold50 }}>
            <T style={{ fontSize: 11.5, fontWeight: '800', color: c.gold700, letterSpacing: 0.8 }}>🎬 {place.kContentTitle.toUpperCase()} CONNECTION</T>
            <T style={{ fontSize: 13.5, color: c.ink, marginTop: 5, lineHeight: 19 }}>{place.kContentNote}</T>
          </View>
        )}

        {/* Foreigner Fit — tags tailored to this place's category */}
        <View style={{ paddingHorizontal: 18, paddingTop: 28 }}>
          <H style={{ fontSize: 19, marginBottom: 4 }}>Foreigner Fit</H>
          <T style={{ fontSize: 12.5, color: c.muted, marginBottom: 12 }}>Tap to confirm — traveler-verified, tag by tag</T>
          {fitKeys.every((key) => !place.verifiedTags?.includes(key) && (tagCounts[key]?.yes ?? 0) === 0 && (tagCounts[key]?.no ?? 0) === 0) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.accent50, borderRadius: 10, padding: 11, marginBottom: 10 }}>
              <T style={{ fontSize: 16 }}>👋</T>
              <T style={{ flex: 1, fontSize: 12.5, color: c.accent, fontWeight: '600', lineHeight: 17 }}>No one's confirmed this yet — be the first, it helps every traveler after you.</T>
            </View>
          )}
          <View style={{ gap: 2 }}>
            {fitKeys.map((key) => {
              const tag = FIT_TAGS[key];
              const { yes = 0, no = 0 } = tagCounts[key] ?? {};
              const verified = !!place.verifiedTags?.includes(key);
              const has = yes > no || verified;
              const votingKey = `${place.slug}:${key}`;
              const mineVote = tagVotes[votingKey];
              return (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
                  <T style={{ fontSize: 20 }}>{tag.emoji}</T>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T style={{ fontSize: 14, fontWeight: '700', color: has ? c.ink : c.muted }}>{tag.label}</T>
                      {verified && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.sage50, paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 999 }}>
                          <T style={{ fontSize: 10, color: c.sage700, fontWeight: '800' }}>✓ TRIP verified</T>
                        </View>
                      )}
                    </View>
                    <T style={{ fontSize: 12, color: c.muted, marginTop: 1 }}>{tag.hint}</T>
                  </View>
                  <TagVoteButton
                    active={mineVote === 'yes'}
                    count={yes}
                    emoji="👍"
                    activeBg={c.sage}
                    idleTextColor={yes > 0 ? c.sage700 : c.muted}
                    onPress={() => onVoteTag(key, 'yes')}
                  />
                  <TagVoteButton
                    active={mineVote === 'no'}
                    count={no}
                    emoji="👎"
                    activeBg={c.rose}
                    idleTextColor={no > 0 ? c.rose700 : c.muted}
                    onPress={() => onVoteTag(key, 'no')}
                  />
                </View>
              );
            })}
          </View>
          {place.warnTip && (
            <View style={{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: c.rose50, flexDirection: 'row', gap: 8 }}>
              <T style={{ fontSize: 15 }}>⚠️</T>
              <T style={{ flex: 1, fontSize: 12.5, color: c.rose700, fontWeight: '600', lineHeight: 18 }}>{place.warnTip}</T>
            </View>
          )}
        </View>

        {/* From the community */}
        {relatedPosts.length > 0 && (
          <View style={{ paddingHorizontal: 18, paddingTop: 28 }}>
            <H style={{ fontSize: 18, marginBottom: 12 }}>From the community</H>
            <View style={{ gap: 10 }}>
              {relatedPosts.map((p) => (
                <PostCardMini key={p.slug} post={p} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <ShareCardSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        place={{
          name: place.name,
          nameKo: place.nameKo,
          category: place.category,
          neighborhood: guLabel(place.neighborhood),
          photoUrl: place.photoUrl,
          swatch: place.swatch,
          rating: place.rating,
          tags: ([
            ['soloOk', 'Solo OK'],
            ['englishMenu', 'English menu'],
            ['englishSpoken', 'English spoken'],
            ['cardOk', 'Card OK'],
            ['priceTransparent', 'Fair price'],
          ] as const)
            .filter(([k]) => (place as any)[k])
            .map(([, label]) => label),
        }}
        handle={profile.handle}
      />

      {/* Translate sheet */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={() => setSheet(false)} />
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginBottom: 16 }} />
          <View style={{ backgroundColor: c.ink, borderRadius: 18, padding: 20 }}>
            <T style={{ fontSize: 12, color: c.muted, fontWeight: '700' }}>SHOW THIS</T>
            <T style={{ fontSize: 26, color: c.paper, fontWeight: '800', marginTop: 6 }}>{place.nameKo}</T>
            <T style={{ fontSize: 14, color: c.muted, marginTop: 8 }}>{place.address}</T>
          </View>
          <T style={{ fontSize: 13, fontWeight: '700', color: c.inkSoft, marginTop: 18, marginBottom: 8 }}>Handy phrases</T>
          <ScrollView style={{ maxHeight: 320 }}>
            {phrases.map((p, i) => {
              const speaking = speakingIdx === i;
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.line }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <T style={{ fontSize: 14, fontWeight: '700', flexShrink: 1 }} numberOfLines={2}>{p.en}</T>
                      <View style={{ backgroundColor: c.surface2, borderRadius: 999, paddingVertical: 2.5, paddingHorizontal: 8 }}>
                        <T style={{ fontSize: 10.5, fontWeight: '800', color: c.inkSoft }} numberOfLines={1}>{p.audience}</T>
                      </View>
                    </View>
                    <T style={{ fontSize: 15, color: c.accent, marginTop: 3 }}>{p.ko}</T>
                    <T style={{ fontSize: 12, color: c.muted, marginTop: 1 }}>{p.ro}</T>
                  </View>
                  <Pressable
                    onPress={() => speak(i, p.ko)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={speaking ? 'Stop playback' : `Play "${p.ko}" aloud`}
                    style={{
                      width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: speaking ? c.accent : c.surface2,
                    }}
                  >
                    <Icon name="speaker" size={16} stroke={speaking ? '#fff' : c.inkSoft} sw={2} />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
          <Button label="Close" variant="soft" style={{ marginTop: 16 }} onPress={() => setSheet(false)} />
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: any; text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Icon name={icon} size={17} stroke={c.muted} sw={1.9} />
      <T style={{ flex: 1, fontSize: 13.5, color: c.inkSoft, fontWeight: '600' }}>{text}</T>
    </View>
  );
}

function FactRow({ emoji, text }: { emoji: string; text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <T style={{ fontSize: 16, lineHeight: 20 }}>{emoji}</T>
      <T style={{ flex: 1, fontSize: 13.5, color: c.inkSoft, fontWeight: '600', lineHeight: 20 }}>{text}</T>
    </View>
  );
}

function ReactionButton({
  active, emoji, label, activeBg, activeColor, onPress,
}: { active: boolean; emoji: string; label: string; activeBg: string; activeColor: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingVertical: 11, borderRadius: 14,
        backgroundColor: active ? activeBg : c.surface,
        borderWidth: 1, borderColor: active ? 'transparent' : c.line,
      }}
    >
      <T style={{ fontSize: 16 }}>{emoji}</T>
      <T style={{ fontSize: 13.5, fontWeight: '700', color: active ? activeColor : c.inkSoft }}>{label}</T>
    </Pressable>
  );
}

// Compact yes/no vote pill for a single Foreigner Fit tag. Shows the shared
// count as soon as it's nonzero, regardless of whether this viewer cast it.
function TagVoteButton({
  active, count, emoji, activeBg, idleTextColor, onPress,
}: { active: boolean; count: number; emoji: string; activeBg: string; idleTextColor: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: active ? activeBg : count > 0 ? `${activeBg}22` : c.surface,
        borderWidth: active ? 0 : 1, borderColor: c.line,
        paddingVertical: 5, paddingHorizontal: 9, borderRadius: 999, minWidth: 40, justifyContent: 'center',
      }}
    >
      <T style={{ fontSize: 12 }}>{emoji}</T>
      {count > 0 && <T style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : idleTextColor }}>{count}</T>}
    </Pressable>
  );
}
