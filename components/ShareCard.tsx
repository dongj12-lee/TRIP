import React, { forwardRef } from 'react';
import { View, Platform, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Rect, Path, G } from 'react-native-svg';
import { SEOUL_DISTRICTS, SEOUL_MAP_W, SEOUL_MAP_H } from '@/data/seoulDistricts';
import { Icon } from './Icon';
import { Photo } from './ui';
import { T, H } from './base';

// The visuals that get captured and shared to Instagram. Deliberately use
// FIXED palettes (not the app theme) so shared cards look consistent
// regardless of the user's light/dark mode, this is marketing, not UI.
// All cards are 9:16 story format; capture happens at 1080×1920 in the sheet.
//
// Templates are designed around formats that already circulate on Instagram:
//   fourcuts, 인생네컷 photo-booth strip (THE Korea-trip signal)
//   ticket  , a collectible "SEOUL DAY PASS" stub with perforation + barcode
//   magazine, an editorial cover with masthead + coverlines
//   polaroid, a taped, tilted instant photo with a pen caption
//   classic , the original gradient timeline / hero cards

export type ShareStop = { name: string; time?: string; category?: string; photoUrl?: string; swatch?: [string, string] | string[] };
export type PlaceShareData = {
  name: string;
  nameKo?: string;
  category?: string;
  neighborhood?: string;
  photoUrl?: string;
  swatch?: [string, string] | string[];
  tags?: string[];
  rating?: number;
};

export type PassportShareData = {
  earnedDistricts: string[]; // bare gu names
  rankTitle: string;
  rankEmoji: string;
  earned: number;
  total: number;
  districts: number;
};

export type DayTemplate = 'fourcuts' | 'ticket' | 'classic';
export type PlaceTemplate = 'magazine' | 'fourcuts' | 'polaroid' | 'classic';

export const DAY_TEMPLATES: Record<DayTemplate, { label: string; emoji: string }> = {
  fourcuts: { label: 'Four Cuts', emoji: '🎞️' },
  ticket: { label: 'Day Pass', emoji: '🎫' },
  classic: { label: 'Classic', emoji: '🌇' },
};
export const PLACE_TEMPLATES: Record<PlaceTemplate, { label: string; emoji: string }> = {
  magazine: { label: 'Cover', emoji: '📰' },
  fourcuts: { label: 'Four Cuts', emoji: '🎞️' },
  polaroid: { label: 'Polaroid', emoji: '📸' },
  classic: { label: 'Classic', emoji: '🌇' },
};

// Background moods (Classic template only).
export type BgKey = 'night' | 'sage' | 'sunset' | 'rose';
// Order here is the order the swatches render in, and the first key is the
// default. Navy leads: white type sits on it with the most contrast, and it
// doesn't read as the app's own accent colour the way the orange did.
export const SHARE_BGS: Record<BgKey, { grad: [string, string]; label: string; emoji: string }> = {
  night: { grad: ['#48507f', '#20233f'], label: 'Night', emoji: '🌃' },
  sage: { grad: ['#7ba06f', '#3f6b3c'], label: 'Nature', emoji: '🌿' },
  sunset: { grad: ['#e79a63', '#b04e2a'], label: 'Sunset', emoji: '🌇' },
  rose: { grad: ['#e084a0', '#b0466a'], label: 'Rosy', emoji: '🌸' },
};

export const SERIF = Platform.select<string | undefined>({ ios: 'Didot', default: undefined });

const CREAM = '#fdf3e7';
const CREAM_DIM = 'rgba(253,243,231,0.82)';
const INK = '#2a1d14';
const INK_SOFT = '#6b5647';

export const SHARE_W = 340;
export const SHARE_H = Math.round((SHARE_W * 16) / 9); // 604

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

// Deterministic pseudo-random widths for the fake barcode.
function barcodeBars(seed: string, count = 32): number[] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(1 + (h % 3));
  }
  return out;
}

function Barcode({ seed, color = '#241b12', height = 26 }: { seed: string; color?: string; height?: number }) {
  const bars = barcodeBars(seed);
  const total = bars.reduce((s, w) => s + w + 1.4, 0);
  let x = 0;
  return (
    <Svg width={total * 2} height={height}>
      {bars.map((w, i) => {
        const el = <Rect key={i} x={x * 2} y={0} width={w * 2 * 0.62} height={height} fill={color} />;
        x += w + 1.4;
        return el;
      })}
    </Svg>
  );
}

function BrandFooter({ handle }: { handle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <H style={{ fontSize: 26, color: CREAM, letterSpacing: 0.5 }}>BADA</H>
        <T style={{ fontSize: 11.5, fontWeight: '700', color: CREAM_DIM, marginTop: 1 }} numberOfLines={1}>
          {handle ? `@${handle} · ` : ''}Plan your Seoul trip
        </T>
      </View>
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="pin" size={24} stroke={CREAM} sw={2} />
      </View>
    </View>
  );
}

// ─── 🎞️ FOUR CUTS, 인생네컷 photo-booth strip ────────────────────────────
// Korea's photo-booth format: 4 stacked frames on a black strip, date stamp,
// small logo. Instantly reads as "I'm in Korea", that's the viral hook.
export const FourCutsCard = forwardRef<View, { title: string; stops: ShareStop[]; handle?: string }>(
  function FourCutsCard({ title, stops, handle }, ref) {
    const cuts = stops.filter((s) => s.photoUrl || s.swatch).slice(0, 4);
    while (cuts.length < 4 && stops.length > 0) cuts.push(stops[cuts.length % stops.length]);
    const PAD = 16;
    const FOOT = 74;
    const GAP = 8;
    const photoH = Math.floor((SHARE_H - PAD * 2 - FOOT - GAP * 3) / 4); // ≈ 105

    return (
      <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: '#141210', padding: PAD }}>
        <View style={{ gap: GAP }}>
          {cuts.map((s, i) => (
            <View key={i} style={{ height: photoH, borderRadius: 6, overflow: 'hidden', backgroundColor: '#26221e' }}>
              <Photo uri={s.photoUrl} swatch={s.swatch ?? ['#5a4636', '#2e241c']} height={photoH} />
              {/* film date stamp on the last frame */}
              {i === 3 && (
                <T style={{ position: 'absolute', right: 8, bottom: 6, fontSize: 11, fontWeight: '800', color: '#f7a04b', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3 }}>
                  {today()}
                </T>
              )}
              {/* stop name tag */}
              <View style={{ position: 'absolute', left: 8, bottom: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6 }}>
                <T style={{ fontSize: 9.5, fontWeight: '700', color: 'rgba(255,255,255,0.92)' }} numberOfLines={1}>
                  {i + 1}/4 · {s.name}
                </T>
              </View>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <T style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2.4, color: 'rgba(253,243,231,0.55)' }}>SEOUL FOUR CUTS</T>
            <T style={{ fontSize: 12.5, fontWeight: '700', color: CREAM, marginTop: 3 }} numberOfLines={1}>{title}</T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <H style={{ fontSize: 21, color: CREAM, letterSpacing: 0.5 }}>BADA</H>
            <T style={{ fontSize: 9.5, fontWeight: '700', color: 'rgba(253,243,231,0.55)' }}>{handle ? `@${handle}` : 'plan your seoul trip'}</T>
          </View>
        </View>
      </View>
    );
  },
);

// ─── 🎫 DAY PASS, collectible ticket stub ────────────────────────────────
export const TicketCard = forwardRef<View, { title: string; subtitle?: string; stops: ShareStop[]; handle?: string }>(
  function TicketCard({ title, subtitle, stops, handle }, ref) {
    const BG = '#22253f';
    const PAPER = '#f8f1e2';
    const ACCENT = '#b04e2a';
    const shown = stops.slice(0, 6);
    return (
      <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: BG, padding: 18, justifyContent: 'center' }}>
        <View style={{ borderRadius: 18, backgroundColor: PAPER, overflow: 'hidden' }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <T style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 2.6, color: INK_SOFT }}>ADMIT ONE · {today()}</T>
              <T style={{ fontSize: 13 }}>🇰🇷</T>
            </View>
            <H style={{ fontSize: 32, lineHeight: 36, color: INK, marginTop: 8 }}>SEOUL{'\n'}DAY PASS</H>
            <T style={{ fontSize: 12.5, fontWeight: '700', color: ACCENT, marginTop: 6 }} numberOfLines={1}>{title}{subtitle ? `  ·  ${subtitle}` : ''}</T>
          </View>

          {/* Stops, stations on the line */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 0 }}>
            {shown.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5.5 }}>
                <View style={{ width: 34 }}>
                  <T style={{ fontSize: 10.5, fontWeight: '800', color: ACCENT }}>{s.time || `NO.${i + 1}`}</T>
                </View>
                <View style={{ alignItems: 'center', width: 10 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: i === 0 || i === shown.length - 1 ? ACCENT : 'transparent', borderWidth: 1.6, borderColor: ACCENT }} />
                  {i < shown.length - 1 && <View style={{ position: 'absolute', top: 9, width: 1.4, height: 18, backgroundColor: '#d8c9b2' }} />}
                </View>
                <T style={{ flex: 1, fontSize: 14, fontWeight: '800', color: INK }} numberOfLines={1}>{s.name}</T>
              </View>
            ))}
          </View>

          {/* Perforation */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 11, height: 22, borderTopRightRadius: 999, borderBottomRightRadius: 999, backgroundColor: BG }} />
            <View style={{ flex: 1, borderBottomWidth: 2, borderStyle: 'dashed', borderColor: '#cbbba2', marginHorizontal: 4 }} />
            <View style={{ width: 11, height: 22, borderTopLeftRadius: 999, borderBottomLeftRadius: 999, backgroundColor: BG }} />
          </View>

          {/* Stub */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <H style={{ fontSize: 20, color: INK, letterSpacing: 0.5 }}>BADA</H>
              <T style={{ fontSize: 10, fontWeight: '700', color: INK_SOFT, marginTop: 1 }}>{handle ? `@${handle} · ` : ''}plan your seoul trip</T>
            </View>
            <Barcode seed={title + (handle ?? '')} />
          </View>
        </View>
      </View>
    );
  },
);

// ─── 🌇 CLASSIC day card (original gradient timeline) ─────────────────────
export const ShareCard = forwardRef<View, {
  title: string;
  subtitle?: string;
  stops: ShareStop[];
  handle?: string;
  bg?: BgKey;
}>(function ShareCard({ title, subtitle, stops, handle, bg = 'night' }, ref) {
  const shown = stops.slice(0, 5);
  const extra = stops.length - shown.length;
  const g = SHARE_BGS[bg];

  return (
    <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: g.grad[1] }}>
      <LinearGradient colors={g.grad} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={{ flex: 1, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 22 }}>
        <T style={{ fontSize: 12, fontWeight: '800', letterSpacing: 2, color: CREAM_DIM }}>🇰🇷  MY SEOUL DAY</T>
        <H style={{ fontSize: 30, lineHeight: 34, color: CREAM, marginTop: 8 }} numberOfLines={2}>{title}</H>
        {!!subtitle && (
          <View style={{ alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(0,0,0,0.18)', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 }}>
            <T style={{ fontSize: 12.5, fontWeight: '700', color: CREAM }}>{subtitle}</T>
          </View>
        )}
        <View style={{ flex: 1, justifyContent: 'center', gap: 9, paddingVertical: 16 }}>
          {shown.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 14, padding: 8 }}>
              <View style={{ width: 30, alignItems: 'center' }}>
                <T style={{ fontSize: 12.5, fontWeight: '800', color: g.grad[1] }}>{s.time || `${i + 1}`}</T>
              </View>
              <View style={{ width: 50, height: 50, borderRadius: 10, overflow: 'hidden' }}>
                <Photo uri={s.photoUrl} swatch={s.swatch ?? ['#c98a5e', '#a8512f']} height={50} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 14.5, fontWeight: '800', color: INK }} numberOfLines={1}>{s.name}</T>
                {!!s.category && <T style={{ fontSize: 11.5, fontWeight: '600', color: INK_SOFT }} numberOfLines={1}>{s.category}</T>}
              </View>
            </View>
          ))}
          {extra > 0 && (
            <T style={{ fontSize: 12.5, fontWeight: '700', color: CREAM_DIM, textAlign: 'center', marginTop: 2 }}>+ {extra} more stop{extra > 1 ? 's' : ''}</T>
          )}
        </View>
        <BrandFooter handle={handle} />
      </LinearGradient>
    </View>
  );
});

// ─── 📰 MAGAZINE, editorial cover ────────────────────────────────────────
export const MagazineCard = forwardRef<View, { place: PlaceShareData; handle?: string }>(
  function MagazineCard({ place, handle }, ref) {
    const tags = place.tags?.slice(0, 3) ?? [];
    const rating = place.rating != null ? `★ ${place.rating}` : '';
    return (
      <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: '#181410' }}>
        <Photo uri={place.photoUrl} swatch={place.swatch ?? ['#c98a5e', '#a8512f']} height={SHARE_H} />
        <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 190 }} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 }} />

        {/* Masthead */}
        <View style={{ position: 'absolute', top: 22, left: 0, right: 0, alignItems: 'center' }}>
          <T style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 3.2, color: 'rgba(255,255,255,0.85)' }}>BADA MAGAZINE · {today()}</T>
          <H style={{ fontFamily: SERIF, fontSize: 58, lineHeight: 66, color: '#fff', letterSpacing: 4, marginTop: 2 }}>SEOUL</H>
        </View>

        {/* Coverlines */}
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 24 }}>
          <T style={{ fontSize: 11, fontWeight: '800', letterSpacing: 2.2, color: '#f2b25c' }}>
            {(place.category ?? 'THE FIND').toUpperCase()}{place.neighborhood ? `, ${place.neighborhood.toUpperCase()}` : ''}
          </T>
          <H style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 40, color: '#fff', marginTop: 6 }} numberOfLines={3}>{place.name}</H>
          {!!place.nameKo && <T style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{place.nameKo}</T>}
          {tags.length ? (
            <T style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 1.8, color: 'rgba(255,255,255,0.88)', marginTop: 12 }} numberOfLines={1}>
              {[...tags, rating].filter(Boolean).join('   ·   ').toUpperCase()}
            </T>
          ) : (
            <T style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.88)', marginTop: 11 }} numberOfLines={2}>
              “the spot locals keep to themselves”{rating ? `  ·  ${rating}` : ''}
            </T>
          )}
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <T style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3, color: 'rgba(255,255,255,0.62)' }} numberOfLines={1}>
              {handle ? `Found by @${handle}` : 'Plan your Seoul trip'}
            </T>
            <H style={{ fontSize: 15, color: '#fff', letterSpacing: 1.4 }}>BADA</H>
          </View>
        </View>
      </View>
    );
  },
);

// ─── 🎞️ PLACE FOUR CUTS, one spot through the photo-booth ───────────────
// The 인生네컷 strip is the format most likely to read as "Korea trip" on a
// feed, but it only existed for day routes, where four stops give four frames.
//
// A 2×2 grid rather than the day card's vertical strip: four tall cells crop a
// landscape source hard enough that each is a genuinely different picture,
// where four wide bands of the same street shot just looked like the photo
// repeated. Each cell is also a slot the user can fill with their own photo
// (Instagram Layout-style), so a real four-cut of their own trip is possible.
//
// Slot 4 is the caption card until someone puts a photo in it; then the name
// moves on top of that photo, so the place is always named either way.
function Cut({
  uri, swatch, w, h, zoom, ox = 0, oy = 0, exact,
}: { uri?: string; swatch?: string[]; w: number; h: number; zoom: number; ox?: number; oy?: number; exact?: boolean }) {
  return (
    <View style={{ width: w, height: h, overflow: 'hidden', backgroundColor: '#26221e', borderRadius: 4 }}>
      {/* A photo the user chose is already cropped to this shape, so show it
          as-is; only the catalogue shot gets the synthetic re-framing. */}
      <View style={{ width: w, height: h, transform: exact ? [] : [{ scale: zoom }, { translateX: ox }, { translateY: oy }] }}>
        <Photo uri={uri} swatch={swatch ?? ['#5a4636', '#2e241c']} height={h} />
      </View>
    </View>
  );
}

// Dashed "+" on a slot, so the cells read as fillable. Hidden while the card
// is being captured — this is editing chrome, it must not reach the export.
function SlotHint() {
  return (
    <View style={{ position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 999, borderWidth: 1.4, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
      <T style={{ fontSize: 13, fontWeight: '800', color: '#fff', lineHeight: 15 }}>+</T>
    </View>
  );
}

export const PlaceFourCutsCard = forwardRef<View, {
  place: PlaceShareData;
  handle?: string;
  photos?: (string | undefined)[];
  onPickSlot?: (i: number) => void;
  showHints?: boolean;
}>(
  function PlaceFourCutsCard({ place, handle, photos, onPickSlot, showHints }, ref) {
    const PAD = 16;
    const HEAD = 32;
    const FOOT = 68;
    const GAP = 7;
    const cw = (SHARE_W - PAD * 2 - GAP) / 2;
    const ch = (SHARE_H - PAD * 2 - HEAD - FOOT - GAP) / 2;
    // Wide / tight / off-centre. Varying the zoom, not just the offset, is what
    // keeps the default three from collapsing into the same picture.
    const frames = [
      { zoom: 1.0, ox: 0, oy: 0 },
      { zoom: 2.1, ox: 16, oy: -20 },
      { zoom: 1.5, ox: -18, oy: 24 },
      { zoom: 1.0, ox: 0, oy: 0 },
    ];

    const nameBlock = (onPhoto: boolean) => (
      <>
        <H style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 25, color: onPhoto ? '#fff' : '#1c1510' }} numberOfLines={4}>{place.name}</H>
        {!!place.nameKo && (
          <T style={{ fontSize: 11, fontWeight: '700', color: onPhoto ? 'rgba(255,255,255,0.8)' : 'rgba(28,21,16,0.66)', marginTop: 4 }} numberOfLines={1}>{place.nameKo}</T>
        )}
      </>
    );

    return (
      <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: '#141210', padding: PAD }}>
        <View style={{ height: HEAD, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2.4, color: 'rgba(253,243,231,0.55)' }}>SEOUL FOUR CUTS</T>
          <T style={{ fontSize: 10.5, fontWeight: '800', color: '#f7a04b', letterSpacing: 1 }}>{today()}</T>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {frames.map((f, i) => {
            const mine = photos?.[i];
            const caption = i === 3 && !mine;
            const body = caption ? (
              <View style={{ width: cw, height: ch, borderRadius: 4, backgroundColor: '#f7a04b', padding: 12, justifyContent: 'flex-end' }}>
                {nameBlock(false)}
              </View>
            ) : (
              <>
                <Cut uri={mine ?? place.photoUrl} swatch={place.swatch} w={cw} h={ch} zoom={f.zoom} ox={f.ox} oy={f.oy} exact={!!mine} />
                {i === 0 && !!place.category && (
                  <View style={{ position: 'absolute', left: 6, top: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 5 }}>
                    <T style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.92)' }} numberOfLines={1}>
                      {place.neighborhood || place.category}
                    </T>
                  </View>
                )}
                {i === 3 && (
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, overflow: 'hidden' }}>
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={{ padding: 10, paddingTop: 30 }}>
                      {nameBlock(true)}
                    </LinearGradient>
                  </View>
                )}
              </>
            );

            if (!onPickSlot) return <View key={i}>{body}</View>;
            return (
              <Pressable
                key={i}
                onPress={() => onPickSlot(i)}
                accessibilityRole="button"
                accessibilityLabel={`Use my photo in frame ${i + 1}`}
              >
                {body}
                {showHints && !mine && <SlotHint />}
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <T style={{ fontSize: 12, fontWeight: '700', color: CREAM }} numberOfLines={1}>
              {place.tags?.slice(0, 2).join('  ·  ') || 'a spot worth the trip'}
            </T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <H style={{ fontSize: 20, color: CREAM, letterSpacing: 0.5 }}>BADA</H>
            <T style={{ fontSize: 9.5, fontWeight: '700', color: 'rgba(253,243,231,0.55)' }}>{handle ? `@${handle}` : 'plan your seoul trip'}</T>
          </View>
        </View>
      </View>
    );
  },
);

// ─── 📸 POLAROID, taped instant photo ────────────────────────────────────
export const PolaroidCard = forwardRef<View, { place: PlaceShareData; handle?: string }>(
  function PolaroidCard({ place, handle }, ref) {
    const PHOTO = SHARE_W - 40 - 28; // card width minus frame margins
    return (
      <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H }}>
        <LinearGradient colors={['#e0cdb4', '#c4a888']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {/* The polaroid */}
          <View
            style={{
              width: SHARE_W - 40, backgroundColor: '#fffdf7', padding: 14, paddingBottom: 20,
              transform: [{ rotate: '-2.2deg' }],
              shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
            }}
          >
            <View style={{ height: PHOTO * 1.16, overflow: 'hidden', backgroundColor: '#eee' }}>
              <Photo uri={place.photoUrl} swatch={place.swatch ?? ['#c98a5e', '#a8512f']} height={PHOTO * 1.16} />
              <T style={{ position: 'absolute', right: 8, bottom: 8, fontSize: 12, fontWeight: '800', color: '#f7a04b', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 3 }}>
                {today()}
              </T>
            </View>
            <View style={{ paddingTop: 14, alignItems: 'center' }}>
              <H style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 27, color: '#33261a', textAlign: 'center' }} numberOfLines={2}>{place.name}</H>
              <T style={{ fontSize: 11.5, fontWeight: '600', color: '#8a7460', marginTop: 4 }}>
                {[place.neighborhood, 'Seoul'].filter(Boolean).join(' · ')}
              </T>
            </View>
          </View>

          {/* Tape */}
          <View style={{ position: 'absolute', top: '11%', alignSelf: 'center', width: 92, height: 26, backgroundColor: 'rgba(255,255,240,0.55)', transform: [{ rotate: '3deg' }], borderRadius: 6 }} />

          {/* Brand */}
          <View style={{ position: 'absolute', bottom: 26, alignItems: 'center' }}>
            <H style={{ fontSize: 20, color: '#4a3826', letterSpacing: 0.5 }}>BADA</H>
            <T style={{ fontSize: 10, fontWeight: '700', color: 'rgba(74,56,38,0.65)' }}>{handle ? `@${handle} · ` : ''}plan your seoul trip</T>
          </View>
        </LinearGradient>
      </View>
    );
  },
);

// ─── 🌇 CLASSIC place card (original hero) ────────────────────────────────
export const PlaceShareCard = forwardRef<View, { place: PlaceShareData; handle?: string; bg?: BgKey }>(
  function PlaceShareCard({ place, handle, bg = 'night' }, ref) {
    const g = SHARE_BGS[bg];
    const heroH = SHARE_H - 36 - 42 - 80;
    return (
      <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: g.grad[1] }}>
        <LinearGradient colors={g.grad} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={{ flex: 1, padding: 18 }}>
          <T style={{ fontSize: 12, fontWeight: '800', letterSpacing: 2, color: CREAM_DIM, marginBottom: 12 }}>🇰🇷  A SEOUL SPOT I LOVE</T>
          <View style={{ height: heroH, borderRadius: 22, overflow: 'hidden' }}>
            <Photo uri={place.photoUrl} swatch={place.swatch ?? ['#c98a5e', '#a8512f']} height={heroH} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 }}>
              {!!place.category && (
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 }}>
                    <T style={{ fontSize: 11.5, fontWeight: '800', color: '#fff' }}>
                      {place.category}{place.neighborhood ? ` · ${place.neighborhood}` : ''}{place.rating != null ? ` · ★ ${place.rating}` : ''}
                    </T>
                  </View>
                </View>
              )}
              <H style={{ fontSize: 30, lineHeight: 34, color: '#fff' }} numberOfLines={2}>{place.name}</H>
              {!!place.nameKo && <T style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.86)', marginTop: 2 }}>{place.nameKo}</T>}
              {!!place.tags?.length && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {place.tags.slice(0, 4).map((t, i) => (
                    <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.92)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 }}>
                      <T style={{ fontSize: 11.5, fontWeight: '700', color: INK }}>{t}</T>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          <View style={{ marginTop: 16 }}>
            <BrandFooter handle={handle} />
          </View>
        </LinearGradient>
      </View>
    );
  },
);

// ─── 🎫 PASSPORT, "% of Seoul conquered" flex ────────────────────────────
// A dark "passport" card whose Seoul map glows gold with the districts you've
// collected. Built to make progress braggable ("I've stamped 14/25 districts").
const bareGu = (n: string) => n.replace(/-gu$/, '');
export const PassportShareCard = forwardRef<View, { data: PassportShareData; handle?: string }>(
  function PassportShareCard({ data, handle }, ref) {
    const earned = new Set(data.earnedDistricts);
    const pct = Math.round((data.earned / Math.max(1, data.total)) * 100);
    const GOLD = '#f2a24d';
    return (
      <View ref={ref} collapsable={false} style={{ width: SHARE_W, height: SHARE_H, backgroundColor: '#141021' }}>
        <LinearGradient colors={['#2a2140', '#120e1d']} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 22 }}>
          <T style={{ fontSize: 12, fontWeight: '800', letterSpacing: 2, color: 'rgba(253,243,231,0.6)' }}>🇰🇷  MY SEOUL PASSPORT</T>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 10 }}>
            <H style={{ fontSize: 64, lineHeight: 64, color: GOLD }}>{pct}%</H>
            <T style={{ fontSize: 14, fontWeight: '800', color: CREAM, marginBottom: 10 }}>OF SEOUL{'\n'}CONQUERED</T>
          </View>
          <View style={{ alignSelf: 'flex-start', marginTop: 12, backgroundColor: 'rgba(242,162,77,0.16)', borderWidth: 1, borderColor: 'rgba(242,162,77,0.5)', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 }}>
            <T style={{ fontSize: 13, fontWeight: '800', color: GOLD }}>{data.rankEmoji} {data.rankTitle}</T>
          </View>

          {/* Glowing map */}
          <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 8 }}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${SEOUL_MAP_W} ${SEOUL_MAP_H}`} preserveAspectRatio="xMidYMid meet">
              <G>
                {SEOUL_DISTRICTS.map((d) => {
                  const on = earned.has(bareGu(d.name));
                  return (
                    <Path
                      key={d.name}
                      d={d.path}
                      fill={on ? GOLD : 'rgba(255,255,255,0.07)'}
                      stroke={on ? '#120e1d' : 'rgba(255,255,255,0.10)'}
                      strokeWidth={0.5}
                    />
                  );
                })}
              </G>
            </Svg>
          </View>

          <T style={{ fontSize: 13, fontWeight: '700', color: CREAM_DIM, textAlign: 'center', marginBottom: 14 }}>
            {data.districts}/25 districts · {data.earned}/{data.total} stamps collected
          </T>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <H style={{ fontSize: 24, color: CREAM, letterSpacing: 0.5 }}>BADA</H>
              <T style={{ fontSize: 11, fontWeight: '700', color: CREAM_DIM }}>{handle ? `@${handle} · ` : ''}collect yours on BADA</T>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(242,162,77,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontSize: 22 }}>🎫</T>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  },
);

// ─── Template picker thumbnails ──────────────────────────────────────────
// The picker used emoji (📰 📸 🌇) to stand for each layout. Emoji are the
// wrong tool twice over: they render differently on every OS, and a newspaper
// glyph tells you nothing about what the card will actually look like. These
// are miniature abstractions of the real layouts, so the row previews the
// choice instead of decorating it.
export function TemplateThumb({ kind, on }: { kind: DayTemplate | PlaceTemplate; on: boolean }) {
  const W = 13, H_ = 18, R = 2.5;
  const dim = on ? 1 : 0.72;
  const frame = { width: W, height: H_, borderRadius: R, overflow: 'hidden' as const, opacity: dim };

  if (kind === 'magazine') {
    return (
      <View style={[frame, { backgroundColor: '#6b5a49' }]}>
        <View style={{ height: 5, backgroundColor: '#fff', margin: 2, borderRadius: 1 }} />
        <View style={{ position: 'absolute', left: 2, right: 5, bottom: 2, height: 2.5, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 1 }} />
      </View>
    );
  }
  if (kind === 'fourcuts') {
    return (
      <View style={[frame, { backgroundColor: '#141210', padding: 2, gap: 1.5 }]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, backgroundColor: i === 3 ? '#4a4038' : '#9c7f63', borderRadius: 1 }} />
        ))}
      </View>
    );
  }
  if (kind === 'polaroid') {
    return (
      <View style={[frame, { backgroundColor: '#cdb493', alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ width: 11, height: 14, backgroundColor: '#fffdf7', padding: 1.5, paddingBottom: 4 }}>
          <View style={{ flex: 1, backgroundColor: '#8f7255' }} />
        </View>
      </View>
    );
  }
  if (kind === 'ticket') {
    return (
      <View style={[frame, { backgroundColor: '#22253f', padding: 2, justifyContent: 'center' }]}>
        <View style={{ backgroundColor: '#f8f1e2', borderRadius: 1.5, height: 14, justifyContent: 'center' }}>
          <View style={{ height: 1, backgroundColor: '#cbbba2', marginHorizontal: 1.5 }} />
        </View>
      </View>
    );
  }
  // classic: gradient ground with a rounded hero inset
  return (
    <View style={[frame, { backgroundColor: '#3b4168', padding: 2 }]}>
      <View style={{ flex: 1, backgroundColor: '#9c7f63', borderRadius: 2 }} />
      <View style={{ height: 4 }} />
      <View style={{ position: 'absolute', left: 2, bottom: 1.5, width: 7, height: 2, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 1 }} />
    </View>
  );
}
