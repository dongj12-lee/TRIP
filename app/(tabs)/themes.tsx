import React, { useMemo } from 'react';
import { View, ScrollView, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useRemoteContent } from '@/lib/remoteData';
import { useStore } from '@/lib/store';
import { personalizedThemes } from '@/lib/personalize';
import { Theme } from '@/data/types';
import { T, H, Card } from '@/components/base';
import { Photo } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonList, SkeletonThemeCard } from '@/components/Skeleton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { TabBar, TabTitle, useTabScroll, useContentTopPadding } from '@/components/TabHeader';

// Editorial browse order — lead with the trip-defining categories, practical
// essentials mid-page, seasonal last. Only sections with content render.
const SECTION_ORDER = [
  'K-Content',
  'Food & Drink',
  'Neighborhoods',
  'Culture',
  'Getting Around',
  'Day Trips',
  'Shopping',
  'Essentials',
  'Festivals',
];

export default function ThemesScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { themes, loading } = useRemoteContent();
  const { profile } = useStore();
  const { scrollY, onScroll } = useTabScroll();
  const topPad = useContentTopPadding();

  const byCat = useMemo(() => {
    const m = new Map<string, Theme[]>();
    for (const t of themes) {
      if (!m.has(t.category)) m.set(t.category, []);
      m.get(t.category)!.push(t);
    }
    return m;
  }, [themes]);

  const forYou = useMemo(
    () => (profile.interests.length ? personalizedThemes(themes, profile.interests, 8) : []),
    [themes, profile.interests],
  );

  const sections = useMemo(() => {
    const known = SECTION_ORDER.filter((cat) => byCat.has(cat));
    const extra = [...byCat.keys()].filter((cat) => !SECTION_ORDER.includes(cat)).sort();
    return [...known, ...extra];
  }, [byCat]);

  // Lead with one cinematic cover (the personalized top pick, or the first
  // trip-defining theme) — Apple News+ / Arts & Culture style — then rails.
  const featured = forYou[0] ?? (sections.length ? byCat.get(sections[0])![0] : null);
  const featuredSlug = featured?.slug;
  const forYouRest = forYou.filter((t) => t.slug !== featuredSlug);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <TabBar title="Themes" scrollY={scrollY} />
        <View style={{ paddingTop: topPad }}>
          <TabTitle title="Trip Themes" />
          <SkeletonList card={SkeletonThemeCard} n={3} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <TabBar title="Themes" scrollY={scrollY} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        <TabTitle title="Trip Themes" />
        <View style={{ paddingHorizontal: 18 }}>
          <OfflineBanner />
        </View>
        {featured && <FeaturedTheme theme={featured} />}
        {forYouRest.length > 0 && <Rail title="For you" themes={forYouRest} />}
        {sections.map((cat) => {
          const items = byCat.get(cat)!.filter((t) => t.slug !== featuredSlug);
          return items.length > 0 ? <Rail key={cat} title={cat} themes={items} /> : null;
        })}
      </Animated.ScrollView>
    </View>
  );
}

// The cover story — one large, cinematic full-bleed card with the title set
// over a gradient scrim. Gives Themes an editorial "magazine cover" lead
// instead of opening straight into uniform rails (Apple News+ / Arts & Culture).
function FeaturedTheme({ theme }: { theme: Theme }) {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/theme/${theme.slug}`)}
      accessibilityRole="button"
      style={({ pressed }) => [
        { marginHorizontal: 14, marginTop: 6, marginBottom: 2, borderRadius: 22, overflow: 'hidden' },
        pressed && { opacity: 0.94 },
      ]}
    >
      <Photo uri={theme.photoUrl} swatch={theme.swatch} height={290} />
      <LinearGradient
        colors={['transparent', 'rgba(18,12,8,0.12)', 'rgba(18,12,8,0.88)']}
        locations={[0, 0.42, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <View style={{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.94)', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 }}>
        <Icon name="sparkle" size={13} stroke={c.accent} sw={2} />
        <T style={{ fontSize: 11.5, fontWeight: '800', color: c.ink }}>Featured</T>
      </View>
      <View style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
        <T style={{ fontSize: 12.5, fontWeight: '800', color: 'rgba(255,255,255,0.85)', marginBottom: 5 }} numberOfLines={1}>
          {theme.badge || theme.category}
        </T>
        <H style={{ fontSize: 27, lineHeight: 31, color: '#fff' }} numberOfLines={2}>{theme.title}</H>
        <T style={{ fontSize: 14, lineHeight: 19, color: 'rgba(255,255,255,0.92)', fontWeight: '600', marginTop: 6 }} numberOfLines={2}>{theme.subtitle}</T>
      </View>
    </Pressable>
  );
}

// One browse section: a title, then a horizontal rail of theme cards — the
// App-Store / Netflix pattern, so each category reads as a shelf you scan
// rather than a thin filter chip.
function Rail({ title, themes }: { title: string; themes: Theme[] }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingTop: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 18, marginBottom: 12 }}>
        <H style={{ fontSize: 20 }}>{title}</H>
        <T style={{ fontSize: 12.5, color: c.muted, fontWeight: '700' }}>{themes.length}</T>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 13, paddingHorizontal: 18 }}>
        {themes.map((t) => (
          <ThemeRailCard key={t.slug} theme={t} />
        ))}
      </ScrollView>
    </View>
  );
}

function ThemeRailCard({ theme }: { theme: Theme }) {
  const { c } = useTheme();
  const router = useRouter();
  const isWalk = theme.kind === 'walk';
  return (
    <Card onPress={() => router.push(`/theme/${theme.slug}`)} style={{ width: 244, overflow: 'hidden' }}>
      <View>
        <Photo uri={theme.photoUrl} swatch={theme.swatch} height={140} />
        <View style={{ position: 'absolute', top: 10, left: 10 }}>
          <View style={{ backgroundColor: 'rgba(28,20,14,.6)', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 }}>
            <T style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
              {theme.badge || (isWalk ? `🚶 ${theme.kContent}` : theme.category)}
            </T>
          </View>
        </View>
      </View>
      <View style={{ padding: 13, paddingBottom: 14 }}>
        <H style={{ fontSize: 17, color: c.ink, lineHeight: 21 }} numberOfLines={2}>{theme.title}</H>
        <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '600', marginTop: 3 }} numberOfLines={1}>{theme.subtitle}</T>
      </View>
    </Card>
  );
}
