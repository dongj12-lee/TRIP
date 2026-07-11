import React, { useRef, useState } from 'react';
import { View, Modal, Pressable, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/theme/theme';
import { haptic } from '@/lib/haptics';
import { T, H, Button } from './base';
import { Icon } from './Icon';
import { ShareCard, ShareStop, SHARE_W, SHARE_H } from './ShareCard';
import { useToast } from './Toast';

// Renders the shareable card, captures it at story resolution (1080×1920), and
// hands it to the native share sheet (→ Instagram, Messages, etc.). Web can't
// share a local file (Web Share API limits) and view-shot needs html2canvas
// there, so on web we show the preview and nudge to the app.
export function ShareCardSheet({
  visible,
  onClose,
  title,
  subtitle,
  stops,
  handle,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  stops: ShareStop[];
  handle?: string;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const isWeb = Platform.OS === 'web';

  const share = async () => {
    if (isWeb) { showToast('Sharing to Instagram works in the TRIP app', '📱'); return; }
    setBusy(true);
    try {
      // Give remote place images a beat to settle before the snapshot.
      await new Promise((r) => setTimeout(r, 350));
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1920 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { showToast("Sharing isn't available on this device"); return; }
      haptic.success();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Seoul day', UTI: 'public.png' });
    } catch (e) {
      showToast("Couldn't create the image — try again");
      console.warn('share capture failed', e);
    } finally {
      setBusy(false);
    }
  };

  // Scale the card down to fit the sheet while capturing at full res.
  const previewScale = 0.82;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.scrim }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: insets.bottom + 16 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginTop: 10, marginBottom: 6 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 }}>
            <H style={{ fontSize: 20 }}>Share your day</H>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Icon name="close" size={22} stroke={c.inkSoft} sw={2} />
            </Pressable>
          </View>

          {/* Preview (scaled) */}
          <ScrollView
            horizontal={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center', height: SHARE_H * previewScale + 16 }}
          >
            <View style={{ height: SHARE_H * previewScale, width: SHARE_W * previewScale }}>
              <View style={{ transform: [{ scale: previewScale }], transformOrigin: 'top left' } as any}>
                <ShareCard ref={cardRef} title={title} subtitle={subtitle} stops={stops} handle={handle} />
              </View>
            </View>
          </ScrollView>

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
