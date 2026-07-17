import React from 'react';
import { View } from 'react-native';
import { Svg, Rect, Path, G, Polyline, Circle } from 'react-native-svg';
import { useTheme } from '@/theme/theme';
import { T } from './base';
import { WebMap } from './WebMap';

export type RouteMapStop = { name: string; lat?: number; lng?: number };

export function RouteMap({ stops, height = 150 }: { stops: RouteMapStop[]; height?: number }) {
  const pts = stops.filter((s): s is { name: string; lat: number; lng: number } => s.lat != null && s.lng != null);
  if (pts.length < 2) return null;
  return (
    <WebMap
      height={height}
      pins={pts.map((p, i) => ({ id: String(i), lat: p.lat, lng: p.lng, number: i + 1 }))}
      polyline={pts.map((p) => ({ lat: p.lat, lng: p.lng }))}
      fallback={<FallbackRouteMap stops={stops} height={height} />}
    />
  );
}

// Stylized stand-in for when no Naver Maps client ID is configured yet.
function FallbackRouteMap({ stops, height = 150 }: { stops: RouteMapStop[]; height?: number }) {
  const { c } = useTheme();
  const pts = stops.filter((s): s is { name: string; lat: number; lng: number } => s.lat != null && s.lng != null);
  if (pts.length < 2) return null;

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLa = Math.min(...lats), maxLa = Math.max(...lats);
  const minLn = Math.min(...lngs), maxLn = Math.max(...lngs);
  const padX = (maxLn - minLn) * 0.25 || 0.004;
  const padY = (maxLa - minLa) * 0.3 || 0.004;
  const x = (lng: number) => 8 + 84 * ((lng - minLn + padX) / (maxLn - minLn + 2 * padX));
  const y = (lat: number) => 90 - 78 * ((lat - minLa + padY) / (maxLa - minLa + 2 * padY));
  const line = pts.map((p) => `${x(p.lng)},${y(p.lat)}`).join(' ');

  return (
    <View style={{ height, backgroundColor: c.mapBg, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <Rect x={2} y={6} width={30} height={22} rx={2} fill={c.mapPark} opacity={0.7} />
        <Rect x={70} y={60} width={34} height={30} rx={2} fill={c.mapPark} opacity={0.55} />
        <Path d="M-5 40 Q30 34 52 46 T105 52 L105 60 Q60 54 40 64 T-5 70 Z" fill={c.mapWater} />
        <G stroke={c.mapRoad} fill="none" strokeLinecap="round">
          <Path d="M-5 24 H105" strokeWidth={3.4} />
          <Path d="M-5 78 H105" strokeWidth={3} />
          <Path d="M26 -5 V105" strokeWidth={3.2} />
          <Path d="M74 -5 V105" strokeWidth={2.8} />
        </G>
        <Polyline
          points={line}
          fill="none"
          stroke={c.accent}
          strokeWidth={1.6}
          strokeDasharray="3.2 2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <Circle key={i} cx={x(p.lng)} cy={y(p.lat)} r={4.6} fill={c.accent} stroke={c.surface} strokeWidth={1.4} />
        ))}
      </Svg>
      {/* Stop numbers as overlay text (SVG <Text> font loading is unreliable on RN) */}
      {pts.map((p, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute', left: `${x(p.lng)}%`, top: `${y(p.lat)}%`,
            width: 20, height: 20, marginLeft: -10, marginTop: -10,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <T style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{i + 1}</T>
        </View>
      ))}
      <View style={{ position: 'absolute', left: 12, bottom: 10, backgroundColor: c.surface, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 }}>
        <T style={{ fontSize: 9.5, color: c.muted, fontWeight: '600' }}>DAY ROUTE · {pts.length} STOPS</T>
      </View>
    </View>
  );
}
