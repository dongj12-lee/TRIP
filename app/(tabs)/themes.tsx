import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useRemoteContent } from '@/lib/remoteData';
import { useStore } from '@/lib/store';
import { personalizedThemes } from '@/lib/personalize';
import { Theme } from '@/data/types';
import { T, H, Card } from '@/components/base';
import { Photo, Chip } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SkeletonList, SkeletonThemeCard } from '@/components/Skeleton';
import { OfflineBanner } from '@/components/OfflineBanner';

const CATEGORIES = ['All', 'Essentials', 'Food & Drink', 'K-Content', 'Culture', 'Shopping', 'Getting Around', 'Day Trips', 'Festivals'];

export default function ThemesScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { themes, loading } = useRemoteContent();
  const { profile } = useStore();
  const [cat, setCat] = useState('All');

  // On "All", order by the user's interests so their trip type leads.
  const list = useMemo(() => {
    if (cat !== 'All') return themes.filter((t) => t.category === cat);
    if (!profile.interests.length) return themes;
    const ranked = personalizedThemes(themes, profile.interests, themes.length);
    const seen = new Set(ranked.map((t) => t.slug));
    return [...ranked, ...themes.filter((t) => !seen.has(t.slug))];
  }, [themes, cat, profile.interests]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 12 }}>
          <H style={{ fontSize: 32, lineHeight: 36 }}>Themes</H>
          <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>
            Curated walks & guides for the trip you came for
          </T>
        </View>
        <SkeletonList card={SkeletonThemeCard} n={3} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 6 }}>
        <H style={{ fontSize: 32, lineHeight: 36 }}>Themes</H>
        <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, fontWeight: '600' }}>
          Curated walks & guides for the trip you came for
        </T>
      </View>

      <OfflineBanner />

      <View style={{ height: 56 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center' }}>
          {CATEGORIES.map((k) => {
            const on = cat === k;
            return (
              <Pressable
                key={k}
                onPress={() => setCat(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{
                  paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
                  borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : c.surface,
                }}
              >
                <T style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : c.inkSoft }}>{k}</T>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 90, gap: 14 }} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 44 }}>
            <T style={{ fontSize: 28 }}>🧳</T>
            <T style={{ color: c.muted, marginTop: 8, fontSize: 13 }}>No guides in this category yet.</T>
          </View>
        ) : (
          list.map((t) => <ThemeCard key={t.slug} theme={t} />)
        )}
      </ScrollView>
    </View>
  );
}

function ThemeCard({ theme }: { theme: Theme }) {
  const { c } = useTheme();
  const router = useRouter();
  const isWalk = theme.kind === 'walk';
  return (
    <Card onPress={() => router.push(`/theme/${theme.slug}`)} style={{ overflow: 'hidden' }}>
      <View>
        <Photo uri={theme.photoUrl} swatch={theme.swatch} height={150} />
        <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 }}>
          <View style={{ backgroundColor: 'rgba(28,20,14,.6)', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 }}>
            <T style={{ color: '#fff', fontSize: 11.5, fontWeight: '700' }}>
              {theme.badge || (isWalk ? `🚶 ${theme.kContent}` : theme.category)}
            </T>
          </View>
        </View>
      </View>
      {/* Text lives below the photo, so it stays readable on any cover */}
      <View style={{ padding: 14, paddingBottom: 13 }}>
        <H style={{ fontSize: 20, color: c.ink, lineHeight: 25 }}>{theme.title}</H>
        <T style={{ fontSize: 13, color: c.inkSoft, fontWeight: '600', marginTop: 2 }}>{theme.subtitle}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          {isWalk ? (
            <>
              <MetaBit icon="walk" label={`${theme.stops} stops`} />
              <MetaBit icon="clock" label={theme.hours || ''} />
            </>
          ) : (
            theme.meta?.map((m, i) => <MetaBit key={i} icon={m.icon} label={m.label} />)
          )}
        </View>
      </View>
    </Card>
  );
}

function MetaBit({ icon, label }: { icon: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon name={icon as any} size={15} stroke={c.inkSoft} sw={1.9} />
      <T style={{ fontSize: 12.5, color: c.inkSoft, fontWeight: '600' }}>{label}</T>
    </View>
  );
}
