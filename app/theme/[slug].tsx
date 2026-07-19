import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useRemoteContent } from '@/lib/remoteData';
import { GuideItem, ThemeBlock } from '@/data/types';
import { T, H, Screen, DetailHeader, Card } from '@/components/base';
import { Photo } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { RouteMap } from '@/components/RouteMap';
import { guLabel } from '@/lib/format';

export default function ThemeDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeBySlug, placeBySlug } = useRemoteContent();

  const theme = themeBySlug[slug!];
  if (!theme) return <Screen><DetailHeader title="Theme" /></Screen>;
  const isWalk = theme.kind === 'walk';
  // Editorial lead: opening sentence set large, the rest as supporting body.
  // Same real-boundary heuristic as the place screen (Hermes-safe).
  const dMatch = theme.description.match(/^([\s\S]{40,}?[.!?])\s+([A-Z"'“][\s\S]*)$/);
  const descLead = dMatch ? dMatch[1] : theme.description;
  const descRest = dMatch ? dMatch[2] : '';

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        {/* Hero photo — a clean band; the headline lives below on paper. */}
        <View style={{ height: 200 }}>
          <Photo uri={theme.photoUrl} swatch={theme.swatch} height={200} />
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }} />
          <View style={{ position: 'absolute', top: insets.top, left: 8 }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{ width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,16,12,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
            >
              <Icon name="back" size={22} stroke="#fff" sw={2.2} />
            </Pressable>
          </View>
        </View>

        {/* Editorial header */}
        <View style={{ paddingHorizontal: 18, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <T style={{ fontSize: 12.5, fontWeight: '800', color: c.accent, letterSpacing: 0.2 }}>{theme.badge || theme.category}</T>
            {!!theme.updated && (
              <View style={{ backgroundColor: c.sage50, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 }}>
                <T style={{ fontSize: 10.5, fontWeight: '800', color: c.sage700 }}>UPDATED {theme.updated.toUpperCase()}</T>
              </View>
            )}
          </View>
          <H style={{ fontSize: 30, color: c.ink, lineHeight: 36, marginTop: 7 }}>{theme.title}</H>
          <T style={{ fontSize: 14.5, color: c.inkSoft, fontWeight: '600', marginTop: 6 }}>{theme.subtitle}</T>
          <T style={{ fontSize: 16.5, lineHeight: 27, color: c.ink, marginTop: 16 }}>{descLead}</T>
          {!!descRest && <T style={{ fontSize: 14.5, lineHeight: 23, color: c.inkSoft, marginTop: 11 }}>{descRest}</T>}
        </View>

        {/* Know before you go */}
        {theme.tips && theme.tips.length > 0 && (
          <View style={{ marginHorizontal: 18, marginTop: 20, backgroundColor: c.gold50, borderRadius: 14, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <T style={{ fontSize: 14 }}>💡</T>
              <T style={{ fontSize: 14, fontWeight: '800', color: c.gold700 }}>Know before you go</T>
            </View>
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
            <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: c.line, marginBottom: 14 }}>
              <RouteMap
                stops={theme.placeSlugs.map((ps) => placeBySlug[ps]).filter(Boolean).map((p) => ({ name: p.name, lat: p.lat, lng: p.lng }))}
                height={140}
              />
            </View>
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
                        <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>{place.category} · {guLabel(place.neighborhood)}</T>
                      </View>
                      <Icon name="chevron" size={18} stroke={c.muted} sw={2} />
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* "Lounge" blocks: comparison tables, step-by-step how-tos, real-place rails.
            Rendered first — these are the load-bearing content for the newer deep
            guides (the quick answer / the how-to), with items/sections as detail below. */}
        {!isWalk && theme.blocks?.map((b, bi) => (
          <ThemeBlockView key={bi} block={b} placeBySlug={placeBySlug} router={router} />
        ))}

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

        {/* Deep guide: titled sections (bestsellers by category, sale calendar…) */}
        {!isWalk && theme.sections?.map((sec, si) => (
          <View key={si} style={{ paddingHorizontal: 18, paddingTop: 24 }}>
            <H style={{ fontSize: 18 }}>{sec.title}</H>
            {!!sec.subtitle && <T style={{ fontSize: 12.5, color: c.muted, marginTop: 2 }}>{sec.subtitle}</T>}
            <View style={{ gap: 12, marginTop: 12 }}>
              {sec.items.map((it, i) => (
                <GuideItemCard key={i} item={it} />
              ))}
            </View>
          </View>
        ))}

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
        <View style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 24 }}>{item.emoji}</T>
        </View>
      ) : (
        <View style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden' }}>
          <Photo swatch={item.swatch || ['#7a4a2a', '#e0a05a']} height={46} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <T style={{ fontSize: 14.5, fontWeight: '700', flex: 1 }}>{item.name}</T>
          <T style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>{item.price}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {!!item.tag && (
            <View style={{ backgroundColor: c.gold50, paddingVertical: 1.5, paddingHorizontal: 7, borderRadius: 999, marginTop: 2 }}>
              <T style={{ fontSize: 10.5, fontWeight: '800', color: c.gold700 }}>{item.tag}</T>
            </View>
          )}
          {!!item.nameKo && <T style={{ fontSize: 12, color: c.muted, marginTop: 1 }}>{item.nameKo}</T>}
        </View>
        <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 4, lineHeight: 18 }}>{item.note}</T>
        {!!item.where && <T style={{ fontSize: 12, color: c.muted, marginTop: 4, fontWeight: '600' }}>📍 {item.where}</T>}
        {!!item.caution && (
          <View style={{ marginTop: 6, backgroundColor: c.rose50, borderRadius: 6, padding: 8 }}>
            <T style={{ fontSize: 12, color: c.rose700, fontWeight: '600', lineHeight: 17 }}>⚠️ {item.caution}</T>
          </View>
        )}
      </View>
    </Card>
  );
}

function ThemeBlockView({ block, placeBySlug, router }: { block: ThemeBlock; placeBySlug: Record<string, any>; router: ReturnType<typeof useRouter> }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 24 }}>
      <H style={{ fontSize: 18 }}>{block.title}</H>
      {!!block.subtitle && <T style={{ fontSize: 12.5, color: c.muted, marginTop: 2 }}>{block.subtitle}</T>}

      {block.type === 'compare' && (
        <View style={{ marginTop: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ width: 110 }} />
                {block.columns.map((col, ci) => (
                  <View key={ci} style={{ width: 128, paddingHorizontal: 8, paddingBottom: 8 }}>
                    <T style={{ fontSize: 12.5, fontWeight: '800', color: c.accent }}>{col}</T>
                  </View>
                ))}
              </View>
              {block.rows.map((row, ri) => (
                <View key={ri} style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: c.line, paddingVertical: 10 }}>
                  <View style={{ width: 110 }}>
                    <T style={{ fontSize: 12.5, fontWeight: '700', color: c.inkSoft }}>{row.label}</T>
                  </View>
                  {row.values.map((v, vi) => (
                    <View key={vi} style={{ width: 128, paddingHorizontal: 8 }}>
                      <T style={{ fontSize: 13, color: c.ink, lineHeight: 17 }}>{v}</T>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          {!!block.note && (
            <View style={{ marginTop: 10, backgroundColor: c.gold50, borderRadius: 10, padding: 10 }}>
              <T style={{ fontSize: 12.5, color: c.gold700, fontWeight: '600', lineHeight: 17 }}>💡 {block.note}</T>
            </View>
          )}
        </View>
      )}

      {block.type === 'steps' && (
        <View style={{ gap: 12, marginTop: 12 }}>
          {block.steps.map((s, si) => (
            <View key={si} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.emoji ? <T style={{ fontSize: 15 }}>{s.emoji}</T> : <T style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{si + 1}</T>}
              </View>
              <View style={{ flex: 1, paddingTop: 3 }}>
                <T style={{ fontSize: 14.5, fontWeight: '700' }}>{s.title}</T>
                <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, lineHeight: 18 }}>{s.note}</T>
              </View>
            </View>
          ))}
        </View>
      )}

      {block.type === 'places' && (
        <View style={{ gap: 10, marginTop: 12 }}>
          {block.placeSlugs.map((ps) => {
            const place = placeBySlug[ps];
            if (!place) return null;
            return (
              <Pressable key={ps} onPress={() => router.push(`/place/${ps}`)}>
                <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden' }}>
                    <Photo uri={place.photoUrl} swatch={place.swatch} height={46} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 14.5, fontWeight: '700' }} numberOfLines={1}>{place.name}</T>
                    <T style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}>{place.category} · {guLabel(place.neighborhood)}</T>
                  </View>
                  <Icon name="chevron" size={18} stroke={c.muted} sw={2} />
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
