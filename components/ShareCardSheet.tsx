import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, Pressable, Platform, ActivityIndicator, ScrollView, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/theme';
import { haptic } from '@/lib/haptics';
import { T, H, Button } from './base';
import { Icon } from './Icon';
import {
  ShareCard, PlaceShareCard, FourCutsCard, TicketCard, MagazineCard, PolaroidCard, PassportShareCard,
  PlaceFourCutsCard, TemplateThumb,
  ShareStop, PlaceShareData, PassportShareData, BgKey, SHARE_BGS,
  DayTemplate, PlaceTemplate, DAY_TEMPLATES, PLACE_TEMPLATES,
  SHARE_W, SHARE_H,
} from './ShareCard';
import { useToast } from './Toast';
import { GlassView } from 'expo-glass-effect';
import { GLASS_ON } from './glass';

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
  passport,
  handle,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  stops?: ShareStop[];
  place?: PlaceShareData;
  passport?: PassportShareData;
  handle?: string;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [bg, setBg] = useState<BgKey>('night');
  const [dayTpl, setDayTpl] = useState<DayTemplate>('fourcuts');
  const [placeTpl, setPlaceTpl] = useState<PlaceTemplate>('magazine');
  // A photo the user picked for this card, overriding the catalogue shot.
  const [myPhoto, setMyPhoto] = useState<string | undefined>(undefined);
  // Four Cuts fills per cell instead, Instagram Layout-style.
  const [cutPhotos, setCutPhotos] = useState<(string | undefined)[]>([]);
  // Editing affordances (the dashed "+" on empty cells) are part of the live
  // preview, not the artwork — captureRef photographs this very view, so they
  // have to come off for the moment of capture.
  const [capturing, setCapturing] = useState(false);
  const isWeb = Platform.OS === 'web';
  const isPlace = !!place;

  // Lead with the most striking template each time the sheet opens.
  useEffect(() => {
    if (visible) { setDayTpl('fourcuts'); setPlaceTpl('magazine'); setBg('night'); setMyPhoto(undefined); setCutPhotos([]); }
  }, [visible]);

  // `slot` set → fill that Four Cuts cell; otherwise replace the whole card's
  // photo. The crop aspect follows the shape the photo will actually occupy.
  const pickPhoto = async (slot?: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast('Photo access is needed to use your own shot'); return; }
    await new Promise<void>((resolve) => InteractionManager.runAfterInteractions(() => resolve()));
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: slot == null ? [9, 16] : [2, 3],
      quality: 0.9,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });
    if (r.canceled || !r.assets[0]) return;
    haptic.tick();
    if (slot == null) { setMyPhoto(r.assets[0].uri); return; }
    setCutPhotos((prev) => {
      const n = [...prev];
      n[slot] = r.assets[0].uri;
      return n;
    });
  };

  const share = async () => {
    if (isWeb) { showToast('Sharing to Instagram works in the BADA app', '📱'); return; }
    setBusy(true);
    setCapturing(true);
    try {
      // Also gives the hint overlays a frame to disappear before the shot.
      await new Promise((r) => setTimeout(r, 350)); // let remote images settle
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1920 });
      if (!(await Sharing.isAvailableAsync())) { showToast("Sharing isn't available on this device"); return; }
      haptic.success();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Seoul find', UTI: 'public.png' });
    } catch (e) {
      showToast("Couldn't create the image, try again");
      console.warn('share capture failed', e);
    } finally {
      setBusy(false);
      setCapturing(false);
    }
  };

  const isPassport = !!passport;
  const previewScale = 0.78;
  const showBgRow = !isPassport && (isPlace ? placeTpl : dayTpl) === 'classic';
  const showTemplateRow = !isPassport; // passport has a single signature look

  const renderCard = () => {
    if (isPassport && passport) return <PassportShareCard ref={cardRef} data={passport} handle={handle} />;
    if (isPlace && place) {
      const p = myPhoto ? { ...place, photoUrl: myPhoto } : place;
      if (placeTpl === 'magazine') return <MagazineCard ref={cardRef} place={p} handle={handle} />;
      if (placeTpl === 'fourcuts') {
        return (
          <PlaceFourCutsCard
            ref={cardRef}
            place={p}
            handle={handle}
            photos={cutPhotos}
            onPickSlot={isWeb ? undefined : (i) => pickPhoto(i)}
            showHints={!capturing}
          />
        );
      }
      if (placeTpl === 'polaroid') return <PolaroidCard ref={cardRef} place={p} handle={handle} />;
      return <PlaceShareCard ref={cardRef} place={p} handle={handle} bg={bg} />;
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
        <View style={{ backgroundColor: GLASS_ON ? 'transparent' : c.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: insets.bottom + 16, overflow: 'hidden' }}>
          {GLASS_ON && <GlassView glassEffectStyle="regular" pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginTop: 10, marginBottom: 6 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 }}>
            <H style={{ fontSize: 20 }}>{isPassport ? 'Share your passport' : isPlace ? 'Share this spot' : 'Share your day'}</H>
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
          {showTemplateRow && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingTop: 12, flexGrow: 1, justifyContent: 'center' }}>
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
                    paddingVertical: 6, paddingHorizontal: 9, borderRadius: 999,
                    backgroundColor: on ? c.ink : c.surface, borderWidth: 1, borderColor: on ? c.ink : c.line,
                  }}
                >
                  <TemplateThumb kind={k as DayTemplate | PlaceTemplate} on={on} />
                  <T style={{ fontSize: 11.5, fontWeight: '700', color: on ? c.paper : c.inkSoft }}>{v.label}</T>
                </Pressable>
              );
            })}
          </ScrollView>
          )}

          {/* Own photo. Places only: a day card draws one photo per stop, so a
              single replacement has nowhere sensible to go. */}
          {isPlace && !isWeb && placeTpl === 'fourcuts' && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingTop: 10 }}>
              <T style={{ fontSize: 12.5, fontWeight: '600', color: c.muted }}>Tap a frame to use your own photo</T>
              {cutPhotos.some(Boolean) && (
                <Pressable onPress={() => { haptic.tick(); setCutPhotos([]); }} accessibilityRole="button" accessibilityLabel="Clear my photos" hitSlop={8} style={{ paddingVertical: 7 }}>
                  <T style={{ fontSize: 12.5, fontWeight: '800', color: c.accent }}>Reset</T>
                </Pressable>
              )}
            </View>
          )}

          {isPlace && !isWeb && placeTpl !== 'fourcuts' && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 10 }}>
              <Pressable
                onPress={() => pickPhoto()}
                accessibilityRole="button"
                accessibilityLabel="Use my own photo"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: myPhoto ? c.accent : c.line, backgroundColor: myPhoto ? c.accent50 : c.surface }}
              >
                <Icon name="plus" size={14} stroke={myPhoto ? c.accent : c.inkSoft} sw={2.2} />
                <T style={{ fontSize: 12.5, fontWeight: '700', color: myPhoto ? c.accent : c.inkSoft }}>
                  {myPhoto ? 'My photo' : 'Use my photo'}
                </T>
              </Pressable>
              {!!myPhoto && (
                <Pressable onPress={() => { haptic.tick(); setMyPhoto(undefined); }} accessibilityRole="button" accessibilityLabel="Use the original photo" hitSlop={8} style={{ paddingVertical: 7, paddingHorizontal: 8 }}>
                  <T style={{ fontSize: 12.5, fontWeight: '700', color: c.muted }}>Undo</T>
                </Pressable>
              )}
            </View>
          )}

          {/* Background moods. Classic template only */}
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
              <View style={{ backgroundColor: c.gold50, borderRadius: 10, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <T style={{ fontSize: 15 }}>📱</T>
                <T style={{ flex: 1, fontSize: 12.5, color: c.gold700, fontWeight: '600', lineHeight: 17 }}>
                  Open BADA on your phone to share this straight to Instagram.
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
