import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { buildMapData, MAP_RUNTIME_JS, MapPin, NAVER_CLIENT_ID } from './webMapHtml';

export type { MapPin };

// Web map: react-native-webview has no web target, and a srcDoc/blob iframe
// reports window.location as "about:srcdoc", which Naver's SDK domain check
// always rejects. So the iframe points at a REAL same-origin static shell
// (public/naver-map.html, copied into dist/ on export) whose location matches
// a registered Service URL. The shared runtime (MAP_RUNTIME_JS) is injected
// into that same-origin frame from here, then driven via direct calls — same
// clustering/rendering as native. See docs/OPERATIONS.md.

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const onPinRef = useRef(onPinPress);
  onPinRef.current = onPinPress;

  const data = useMemo(
    () => buildMapData({ pins, polyline, cluster, accent: c.accent, surface: c.surface, ink: c.ink }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(pins), JSON.stringify(polyline), cluster, c.accent, c.surface, c.ink]
  );

  const render = () => {
    const w = iframeRef.current?.contentWindow as any;
    if (ready.current && w?.__renderMap) w.__renderMap(data);
  };
  useEffect(render, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const onLoad = () => {
    const iframe = iframeRef.current;
    const w = iframe?.contentWindow as any;
    const d = iframe?.contentDocument;
    if (!w || !d) return;
    if (!w.__runtimeInjected) {
      const s = d.createElement('script');
      s.textContent = MAP_RUNTIME_JS;
      d.body.appendChild(s);
      w.__runtimeInjected = true;
    }
    w.__onPin = (id: string) => onPinRef.current?.(id);
    ready.current = true;
    render();
  };

  if (!NAVER_CLIENT_ID) return <>{fallback ?? <View style={{ height, backgroundColor: c.mapBg }} />}</>;
  if (pins.length === 0) return <View style={{ height, backgroundColor: c.mapBg }} />;

  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: c.mapBg }}>
      <iframe
        ref={iframeRef}
        src={`/naver-map.html?clientId=${encodeURIComponent(NAVER_CLIENT_ID)}`}
        onLoad={onLoad}
        style={{ width: '100%', height: '100%', border: 0, background: c.mapBg }}
      />
    </View>
  );
}
