import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/theme';
import { T, H } from '@/components/base';
import { Photo } from '@/components/ui';
import { fetchFestivalsNow, FestivalNow } from '@/lib/festivalsNow';

// Live festivals running right now, from the KTO feed via the festivals-now
// Edge Function. Shared by the Festivals theme detail page and the Themes tab
// (as the "what a tourism-board app's home screen shows" live strip). A quiet
// no-op if the fetch fails or nothing is on, the rest of the page stands on
// its own either way.
export function FestivalsNowRail() {
  const { c } = useTheme();
  const [items, setItems] = React.useState<FestivalNow[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    fetchFestivalsNow()
      .then((f) => live && setItems(f))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  if (failed || (items && items.length === 0)) return null;

  return (
    <View style={{ paddingTop: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18 }}>
        <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: c.rose }} />
        <H style={{ fontSize: 18 }}>On right now</H>
      </View>
      <T style={{ fontSize: 12.5, color: c.muted, marginTop: 2, paddingHorizontal: 18 }}>Festivals running across Korea today · live from the tourism board</T>

      {!items ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 12, paddingHorizontal: 18 }}>
          {items.map((f, i) => (
            <View key={i} style={{ width: 220, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
              <View style={{ height: 130 }}>
                <Photo uri={f.image} swatch={['#5a1f4a', '#c2569b']} height={130} />
                {/* The badge sits on a photo, so it stays the same in both
                    themes. The `c.rose` token lightens in dark mode, which
                    dropped white text to ~2.9:1; this fixed deeper red holds
                    ~5.3:1. */}
                {f.endsSoon && (
                  <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#b04942', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 }}>
                    <T style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>ENDS SOON</T>
                  </View>
                )}
              </View>
              <View style={{ padding: 11 }}>
                <T style={{ fontSize: 14, fontWeight: '800' }} numberOfLines={2}>{f.title}</T>
                {!!f.titleKo && <T style={{ fontSize: 11.5, color: c.muted, marginTop: 1 }} numberOfLines={1}>{f.titleKo}</T>}
                <T style={{ fontSize: 11.5, color: c.accent, fontWeight: '700', marginTop: 6 }}>{f.start} – {f.end}</T>
                {!!f.where && <T style={{ fontSize: 11, color: c.muted, marginTop: 2 }} numberOfLines={1}>📍 {f.where}</T>}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
