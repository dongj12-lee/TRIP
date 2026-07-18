import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
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
        <Header c={c} insets={insets} />
        <SkeletonList card={SkeletonThemeCard} n={3} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <Header c={c} insets={insets} />
      <OfflineBanner />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingTop: 6 }} showsVerticalScrollIndicator={false}>
        {forYou.length > 0 && <Rail title="For you" themes={forYou} />}
        {sections.map((cat) => (
          <Rail key={cat} title={cat} themes={byCat.get(cat)!} />
        ))}
      </ScrollView>
    </View>
  );
}

function Header({ c, insets }: { c: any; insets: { top: number } }) {
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 6 }}>
      <H style={{ fontSize: 32, lineHeight: 36 }}>Themes</H>
      <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>
        Curated walks & guides for the trip you came for
      </T>
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
