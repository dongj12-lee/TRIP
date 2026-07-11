import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, Pressable, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/theme';
import { haptic } from '@/lib/haptics';
import { T, H, Button } from './base';
import { Icon } from './Icon';
import {
  ShareCard, PlaceShareCard, FourCutsCard, TicketCard, MagazineCard, PolaroidCard,
  ShareStop, PlaceShareData, BgKey, SHARE_BGS,
  DayTemplate, PlaceTemplate, DAY_TEMPLATES, PLACE_TEMPLATES,
  SHARE_W, SHARE_H,
} from './ShareCard';
import { useToast } from './Toast';

// Renders a shareable card, captures it at story resolution (1080×1920), and
// hands it to the native share sheet (→ Instagram, Messages, etc.). Web can't
// share a local file (Web Share API limits) and view-shot needs html2canvas
// there, so on web we show the preview and nudge to the app.
//
// Two modes (day route via `stops`, single place via `place`), each with
// swipe-worthy templates: Four Cuts (인생네컷) / Day Pass ticket / gradient
// timeline for days; magazine cover / polaroid / gradient hero for places.
export function ShareCardSheet({
  visible,
  onClose,
  title,
  subtitle,
  stops,
  place,
  handle,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  stops?: ShareStop[];
  place?: PlaceShareData;
  handle?: string;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [bg, setBg] = useState<BgKey>('sunset');
  const [dayTpl, setDayTpl] = useState<DayTemplate>('fourcuts');
  const [placeTpl, setPlaceTpl] = useState<PlaceTemplate>('magazine');
  const isWeb = Platform.OS === 'web';
  const isPlace = !!place;

  // Lead with the most striking template each time the sheet opens.
  useEffect(() => {
    if (visible) { setDayTpl('fourcuts'); setPlaceTpl('magazine'); setBg('sunset'); }
  }, [visible]);

  const share = async () => {
    if (isWeb) { showToast('Sharing to Instagram works in the TRIP app', '📱'); return; }
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 350)); // let remote images settle
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1920 });
      if (!(await Sharing.isAvailableAsync())) { showToast("Sharing isn't available on this device"); return; }
      haptic.success();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Seoul find', UTI: 'public.png' });
    } catch (e) {
      showToast("Couldn't create the image — try again");
      console.warn('share capture failed', e);
    } finally {
      setBusy(false);
    }
  };

  const previewScale = 0.78;
  const showBgRow = (isPlace ? placeTpl : dayTpl) === 'classic';

  const renderCard = () => {
    if (isPlace && place) {
      if (placeTpl === 'magazine') return <MagazineCard ref={cardRef} place={place} handle={handle} />;
      if (placeTpl === 'polaroid') return <PolaroidCard ref={cardRef} place={place} handle={handle} />;
      return <PlaceShareCard ref={cardRef} place={place} handle={handle} bg={bg} />;
    }
    const t = title ?? 'My Seoul day';
    if (dayTpl === 'fourcuts') return <FourCutsCard ref={cardRef} title={t} stops={stops ?? []} handle={handle} />;
    if (dayTpl === 'ticket') return <TicketCard ref={cardRef} title={t} subtitle={subtitle} stops={stops ?? []} handle={handle} />;
    return <ShareCard ref={cardRef} title={t} subtitle={subtitle} stops={stops ?? []} handle={handle} bg={bg} />;
  };

  const templates: [string, { label: string; emoji: string }][] = isPlace
    ? Object.entries(PLACE_TEMPLATES)
    : Object.entries(DAY_TEMPLATES);
  const activeTpl = isPlace ? placeTpl : dayTpl;
  const setTpl = (k: string) => (isPlace ? setPlaceTpl(k as PlaceTemplate) : setDayTpl(k as DayTemplate));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.scrim }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: insets.bottom + 16 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginTop: 10, marginBottom: 6 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 }}>
            <H style={{ fontSize: 20 }}>{isPlace ? 'Share this spot' : 'Share your day'}</H>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Icon name="close" size={22} stroke={c.inkSoft} sw={2} />
            </Pressable>
          </View>

          {/* Preview (scaled) */}
          <View style={{ alignItems: 'center', height: SHARE_H * previewScale }}>
            <View style={{ height: SHARE_H * previewScale, width: SHARE_W * previewScale }}>
              <View style={{ transform: [{ scale: previewScale }], transformOrigin: 'top left' } as any}>
                {renderCard()}
              </View>
            </View>
          </View>

          {/* Template picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 12, flexGrow: 1, justifyContent: 'center' }}>
            {templates.map(([k, v]) => {
              const on = activeTpl === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => { haptic.tick(); setTpl(k); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${v.label} style`}
                  accessibilityState={{ selected: on }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999,
                    backgroundColor: on ? c.ink : c.surface, borderWidth: 1, borderColor: on ? c.ink : c.line,
                  }}
                >
                  <T style={{ fontSize: 13 }}>{v.emoji}</T>
                  <T style={{ fontSize: 12.5, fontWeight: '700', color: on ? c.paper : c.inkSoft }}>{v.label}</T>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Background moods — Classic template only */}
          {showBgRow && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, paddingTop: 10 }}>
              {(Object.keys(SHARE_BGS) as BgKey[]).map((k) => {
                const on = bg === k;
                const g = SHARE_BGS[k];
                return (
                  <Pressable
                    key={k}
                    onPress={() => { haptic.tick(); setBg(k); }}
                    accessibilityRole="button"
                    accessibilityLabel={`${g.label} background`}
                    accessibilityState={{ selected: on }}
                  >
                    <LinearGradient colors={g.grad} style={{ width: 30, height: 30, borderRadius: 999, borderWidth: on ? 3 : 1, borderColor: on ? c.ink : c.line }} />
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {isWeb ? (
              <View style={{ backgroundColor: c.gold50, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <T style={{ fontSize: 15 }}>📱</T>
                <T style={{ flex: 1, fontSize: 12.5, color: c.gold700, fontWeight: '600', lineHeight: 17 }}>
                  Open TRIP on your phone to share this straight to Instagram.
                </T>
              </View>
            ) : (
              <Button label={busy ? 'Preparing…' : 'Share to Instagram, Messages…'} icon="share" onPress={share} disabled={busy} />
            )}
            {busy && (
              <View style={{ alignItems: 'center', marginTop: 8 }}>
                <ActivityIndicator color={c.accent} />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
