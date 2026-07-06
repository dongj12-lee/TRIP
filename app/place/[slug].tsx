import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { FOREIGNER_TAGS } from '@/data';
import { T, H, IconButton, Button } from '@/components/base';
import { Icon } from '@/components/Icon';
import { Photo, Chip, Rating } from '@/components/ui';
import { PostCardMini } from '@/components/cards';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptics';

const PHRASES = [
  { en: 'Table for one, please.', ko: '혼자 왔어요. 한 명이요.', ro: 'Honja wasseoyo. Han myeong-iyo.' },
  { en: 'Can I pay by card?', ko: '카드로 결제할 수 있어요?', ro: 'Kadeu-ro gyeoljehal su isseoyo?' },
  { en: 'Do you have an English menu?', ko: '영어 메뉴 있어요?', ro: 'Yeong-eo menyu isseoyo?' },
  { en: 'Please take me to this address.', ko: '이 주소로 가주세요.', ro: 'I juso-ro gajuseyo.' },
];

export default function PlaceDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saved, toggleSave, placeReactions, togglePlaceReaction } = useStore();
  const { placeBySlug, posts } = useRemoteContent();
  const { showToast } = useToast();
  const [sheet, setSheet] = useState(false);

  const place = placeBySlug[slug!];
  // Optimistic like/dislike counts — seed from the server counts and re-sync
  // whenever they change (fires once when the place data loads).
  const [likeN, setLikeN] = useState(0);
  const [dislikeN, setDislikeN] = useState(0);
  useEffect(() => {
    setLikeN(place?.likeCount ?? 0);
    setDislikeN(place?.dislikeCount ?? 0);
  }, [place?.likeCount, place?.dislikeCount]);

  if (!place) return <View style={{ flex: 1, backgroundColor: c.paper }} />;

  const isSaved = saved.has(place.slug);
  const onSave = () => {
    haptic.tick();
    if (!isSaved) showToast('Saved to your spots', '🔖');
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
  const relatedPosts = posts.filter((p) => p.placeSlug === place.slug);
  const hasFacts = place.subway || place.freeEntry || place.englishSite || place.wheelchair;

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ height: 280 }}>
          <Photo uri={place.photoUrl} swatch={place.swatch} height={280} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.5)']} style={{ position: 'absolute', inset: 0 }} />
          <View style={{ position: 'absolute', top: insets.top, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <IconButton name="back" bg="rgba(255,253,250,0.85)" onPress={() => router.back()} />
            <IconButton
              name="heart"
              bg="rgba(255,253,250,0.85)"
              color={isSaved ? c.rose : c.ink}
              onPress={onSave}
            />
          </View>
          <View style={{ position: 'absolute', bottom: 16, left: 18, right: 18 }}>
            {!!place.kContentTitle && (
              <Chip tone="gold" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>{`🎬 ${place.kContentTitle}`}</Chip>
            )}
            <H style={{ fontSize: 27, color: '#fff', lineHeight: 31 }}>{place.name}</H>
          </View>
        </View>

        {/* Show-to-staff card */}
        <Pressable
          onPress={() => setSheet(true)}
          style={{ marginHorizontal: 18, marginTop: 16, padding: 15, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Icon name="translate" size={24} stroke={c.accent} sw={1.9} />
          <View style={{ flex: 1 }}>
            <H style={{ fontSize: 19 }}>{place.nameKo}</H>
            <T style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>Tap to show staff or a taxi driver</T>
          </View>
          <Icon name="chevron" size={18} stroke={c.muted} sw={2} />
        </Pressable>

        {/* Rating row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 16 }}>
          {place.rating != null && <Rating value={place.rating} count={place.reviews} size={15} />}
          {place.rating != null && <T style={{ color: c.muted }}>·</T>}
          <T style={{ fontSize: 13, color: c.inkSoft, fontWeight: '600' }}>{place.category}</T>
          {!!place.priceRange && (
            <>
              <T style={{ color: c.muted }}>·</T>
              <T style={{ fontSize: 13, color: c.inkSoft, fontWeight: '600' }}>{place.priceRange}</T>
            </>
          )}
        </View>

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
        </View>

        {/* Good to know — objective facts from Visit Seoul (distinct from the
            community-voted Foreigner Fit below) */}
        {hasFacts && (
          <View style={{ paddingHorizontal: 18, paddingTop: 22 }}>
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

        {/* Foreigner Fit */}
        <View style={{ paddingHorizontal: 18, paddingTop: 22 }}>
          <H style={{ fontSize: 19, marginBottom: 4 }}>Foreigner Fit</H>
          <T style={{ fontSize: 12.5, color: c.muted, marginBottom: 12 }}>Traveler-verified, tag by tag</T>
          <View style={{ gap: 2 }}>
            {FOREIGNER_TAGS.map((tag) => {
              const has = (place as any)[tag.key];
              const count = place.votes[tag.key];
              return (
                <View key={tag.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
                  <T style={{ fontSize: 20 }}>{tag.emoji}</T>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 14, fontWeight: '700', color: has ? c.ink : c.muted }}>{tag.label}</T>
                    <T style={{ fontSize: 12, color: c.muted, marginTop: 1 }}>{tag.hint}</T>
                  </View>
                  {has ? (
                    <View style={{ backgroundColor: c.sage50, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 }}>
                      <T style={{ fontSize: 12, fontWeight: '700', color: c.sage700 }}>👍 {count ?? 0}</T>
                    </View>
                  ) : (
                    <T style={{ fontSize: 16, color: c.muted }}>—</T>
                  )}
                </View>
              );
            })}
          </View>
          {place.warnTip && (
            <View style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: c.rose50, flexDirection: 'row', gap: 8 }}>
              <T style={{ fontSize: 15 }}>⚠️</T>
              <T style={{ flex: 1, fontSize: 12.5, color: c.rose700, fontWeight: '600', lineHeight: 18 }}>{place.warnTip}</T>
            </View>
          )}
        </View>

        {/* Description + info */}
        <View style={{ paddingHorizontal: 18, paddingTop: 22 }}>
          <T style={{ fontSize: 14, lineHeight: 22, color: c.inkSoft }}>{place.description}</T>
          <View style={{ marginTop: 16, gap: 10 }}>
            <InfoRow icon="clock" text={place.hours} />
            <InfoRow icon="pin" text={place.address} />
            <InfoRow icon="won" text={place.priceRange} />
          </View>
        </View>

        {/* From the community */}
        {relatedPosts.length > 0 && (
          <View style={{ paddingHorizontal: 18, paddingTop: 24 }}>
            <H style={{ fontSize: 18, marginBottom: 12 }}>From the community</H>
            <View style={{ gap: 10 }}>
              {relatedPosts.map((p) => (
                <PostCardMini key={p.slug} post={p} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Translate sheet */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={() => setSheet(false)} />
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginBottom: 16 }} />
          <View style={{ backgroundColor: c.ink, borderRadius: 18, padding: 20 }}>
            <T style={{ fontSize: 12, color: c.muted, fontWeight: '700' }}>SHOW THIS</T>
            <T style={{ fontSize: 26, color: c.paper, fontWeight: '800', marginTop: 6 }}>{place.nameKo}</T>
            <T style={{ fontSize: 14, color: c.muted, marginTop: 8 }}>{place.address}</T>
          </View>
          <T style={{ fontSize: 13, fontWeight: '700', color: c.inkSoft, marginTop: 18, marginBottom: 8 }}>Handy phrases</T>
          <ScrollView style={{ maxHeight: 260 }}>
            {PHRASES.map((p, i) => (
              <View key={i} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <T style={{ fontSize: 14, fontWeight: '700' }}>{p.en}</T>
                <T style={{ fontSize: 15, color: c.accent, marginTop: 3 }}>{p.ko}</T>
                <T style={{ fontSize: 12, color: c.muted, marginTop: 1 }}>{p.ro}</T>
              </View>
            ))}
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
        paddingVertical: 11, borderRadius: 13,
        backgroundColor: active ? activeBg : c.surface,
        borderWidth: 1, borderColor: active ? 'transparent' : c.line,
      }}
    >
      <T style={{ fontSize: 16 }}>{emoji}</T>
      <T style={{ fontSize: 13.5, fontWeight: '700', color: active ? activeColor : c.inkSoft }}>{label}</T>
    </Pressable>
  );
}
