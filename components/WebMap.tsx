import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/theme/theme';
import { buildNativeShell, buildMapData, MapPin, NAVER_CLIENT_ID, MAP_ORIGIN } from './webMapHtml';

export type { MapPin };

// Native map: the Naver Maps JS SDK v3 in a WebView (keeps the app on Expo Go
// — no native module / dev client). The shell HTML + runtime load once with a
// baseUrl that fakes window.location so Naver's domain check passes; pin data
// is pushed in (and updated) via injectJavaScript. Web uses WebMap.web.tsx.
// See docs/OPERATIONS.md.

export function WebMap({
  pins,
  polyline,
  cluster = false,
  onPinPress,
  height = 220,
  fallback,
}: {
  pins: MapPin[];
  polyline?: { lat: number; lng: number }[];
  cluster?: boolean;
  onPinPress?: (id: string) => void;
  height?: number;
  fallback?: React.ReactNode;
}) {
  const { c } = useTheme();
  const ref = useRef<WebView>(null);
  const loaded = useRef(false);

  const shell = useMemo(() => buildNativeShell(NAVER_CLIENT_ID ?? ''), []);
  const data = useMemo(
    () => buildMapData({ pins, polyline, cluster, accent: c.accent, surface: c.surface, ink: c.ink }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(pins), JSON.stringify(polyline), cluster, c.accent, c.surface, c.ink]
  );

  const push = () => {
    if (!loaded.current) return;
    ref.current?.injectJavaScript(`window.__renderMap(${JSON.stringify(data)});true;`);
  };
  // Re-push whenever the data changes (WebView stays mounted).
  React.useEffect(push, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!NAVER_CLIENT_ID) return <>{fallback ?? <View style={{ height, backgroundColor: c.mapBg }} />}</>;
  if (pins.length === 0) return <View style={{ height, backgroundColor: c.mapBg }} />;

  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: c.mapBg }}>
      <WebView
        ref={ref}
        source={{ html: shell, baseUrl: MAP_ORIGIN }}
        originWhitelist={['*']}
        mixedContentMode="always"
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onLoadEnd={() => {
          loaded.current = true;
          push();
        }}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'pinPress') onPinPress?.(msg.id);
          } catch {}
        }}
        style={{ backgroundColor: c.mapBg }}
      />
    </View>
  );
}
