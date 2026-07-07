import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useRemoteContent } from '@/lib/remoteData';
import { GuideItem } from '@/data/types';
import { T, H, Screen, DetailHeader, Card } from '@/components/base';
import { Photo } from '@/components/ui';
import { Icon } from '@/components/Icon';

export default function ThemeDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeBySlug, placeBySlug } = useRemoteContent();

  const theme = themeBySlug[slug!];
  if (!theme) return <Screen><DetailHeader title="Theme" /></Screen>;
  const isWalk = theme.kind === 'walk';

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 200 }}>
          <Photo uri={theme.photoUrl} swatch={theme.swatch} height={200} />
          <View style={{ position: 'absolute', top: insets.top, left: 8 }}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 999, backgroundColor: 'rgba(255,253,250,0.9)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="back" size={22} stroke={c.ink} sw={2} />
            </Pressable>
          </View>
          {!!theme.badge && (
            <View style={{ position: 'absolute', top: insets.top, right: 14, backgroundColor: 'rgba(28,20,14,.6)', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 }}>
              <T style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{theme.badge}</T>
            </View>
          )}
        </View>

        {/* Title + description below the photo, in dark text for readability */}
        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
          <H style={{ fontSize: 26, color: c.ink, lineHeight: 31 }}>{theme.title}</H>
          <T style={{ fontSize: 14, color: c.accent, fontWeight: '700', marginTop: 3 }}>{theme.subtitle}</T>
          <T style={{ fontSize: 14.5, lineHeight: 22, color: c.inkSoft, marginTop: 12 }}>{theme.description}</T>
        </View>

        {/* Know before you go */}
        {theme.tips && theme.tips.length > 0 && (
          <View style={{ marginHorizontal: 18, marginTop: 16, backgroundColor: c.gold50, borderRadius: 16, padding: 15 }}>
            <T style={{ fontSize: 12, fontWeight: '800', color: c.gold700, letterSpacing: 0.6, marginBottom: 8 }}>💡 KNOW BEFORE YOU GO</T>
            <View style={{ gap: 8 }}>
              {theme.tips.map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                  <T style={{ color: c.gold700 }}>•</T>
                  <T style={{ flex: 1, fontSize: 13, lineHeight: 19, color: c.ink }}>{tip}</T>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Walk: numbered stops */}
        {isWalk && theme.placeSlugs && (
          <View style={{ paddingHorizontal: 18, paddingTop: 22 }}>
            <H style={{ fontSize: 18, marginBottom: 14 }}>The walk</H>
            <View style={{ gap: 12 }}>
              {theme.placeSlugs.map((ps, i) => {
                const place = placeBySlug[ps];
                if (!place) return null;
                return (
                  <Pressable key={ps} onPress={() => router.push(`/place/${ps}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <T style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{i + 1}</T>
                    </View>
                    <Card style={{ flex: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden' }}>
                        <Photo uri={place.photoUrl} swatch={place.swatch} height={44} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <T style={{ fontSize: 14.5, fontWeight: '700' }} numberOfLines={1}>{place.name}</T>
                        <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>{place.category} · {place.neighborhood}</T>
                      </View>
                      <Icon name="chevron" size={18} stroke={c.muted} sw={2} />
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Guide: items */}
        {!isWalk && theme.items && (
          <View style={{ paddingHorizontal: 18, paddingTop: 22 }}>
            <H style={{ fontSize: 18, marginBottom: 14 }}>{theme.itemsTitle || 'Picks'}</H>
            <View style={{ gap: 12 }}>
              {theme.items.map((it, i) => (
                <GuideItemCard key={i} item={it} />
              ))}
            </View>
          </View>
        )}

        {/* Guide: streets */}
        {!isWalk && theme.streets && (
          <View style={{ paddingHorizontal: 18, paddingTop: 22 }}>
            <H style={{ fontSize: 18, marginBottom: 14 }}>{theme.streetsTitle || 'Where to find it'}</H>
            <View style={{ gap: 10 }}>
              {theme.streets.map((s, i) => (
                <Card key={i} style={{ padding: 13 }}>
                  <T style={{ fontSize: 14.5, fontWeight: '700' }}>{s.name}</T>
                  <T style={{ fontSize: 12.5, color: c.accent, marginTop: 1 }}>{s.nameKo}</T>
                  <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 4, lineHeight: 18 }}>{s.note}</T>
                </Card>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function GuideItemCard({ item }: { item: GuideItem }) {
  const { c } = useTheme();
  return (
    <Card style={{ padding: 13, flexDirection: 'row', gap: 12 }}>
      {item.emoji ? (
        <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 24 }}>{item.emoji}</T>
        </View>
      ) : (
        <View style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden' }}>
          <Photo swatch={item.swatch || ['#7a4a2a', '#e0a05a']} height={46} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <T style={{ fontSize: 14.5, fontWeight: '700', flex: 1 }}>{item.name}</T>
          <T style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>{item.price}</T>
        </View>
        {!!item.nameKo && <T style={{ fontSize: 12, color: c.muted, marginTop: 1 }}>{item.nameKo}</T>}
        <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 4, lineHeight: 18 }}>{item.note}</T>
        {!!item.where && <T style={{ fontSize: 12, color: c.muted, marginTop: 4, fontWeight: '600' }}>📍 {item.where}</T>}
        {!!item.caution && (
          <View style={{ marginTop: 6, backgroundColor: c.rose50, borderRadius: 8, padding: 8 }}>
            <T style={{ fontSize: 12, color: c.rose700, fontWeight: '600', lineHeight: 17 }}>⚠️ {item.caution}</T>
          </View>
        )}
      </View>
    </Card>
  );
}
