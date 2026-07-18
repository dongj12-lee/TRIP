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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <TabBar title="Themes" scrollY={scrollY} />
        <View style={{ paddingTop: topPad }}>
          <TabTitle title="Themes" />
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
        <TabTitle title="Themes" />
        <View style={{ paddingHorizontal: 18 }}>
          <OfflineBanner />
        </View>
        {forYou.length > 0 && <Rail title="For you" themes={forYou} />}
        {sections.map((cat) => (
          <Rail key={cat} title={cat} themes={byCat.get(cat)!} />
        ))}
      </Animated.ScrollView>
    </View>
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
