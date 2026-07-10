import React, { useState } from 'react';
import { View, Modal, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/lib/auth';
import { fileReport, setBlocked, friendlyError } from '@/data/remote';
import { T, Button } from './base';

const REASONS = ['Spam', 'Harassment or hate', 'Scam or tourist-trap pricing', 'Inappropriate content', 'Something else'];

type Target = { type: 'post' | 'comment' | 'buddy' | 'profile'; id: string; authorId?: string };

// Reusable report/block bottom sheet, required for UGC surfaces per App Store
// Guideline 1.2. Mount once per screen and control via `visible`/`onClose`.
export function ReportSheet({ visible, onClose, target }: { visible: boolean; onClose: () => void; target: Target }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { configured, session } = useAuth();
  const [busy, setBusy] = useState(false);

  const requireAuth = () => {
    if (!configured || !session) {
      Alert.alert('Sign in required', 'Sign in to report or block content.');
      return false;
    }
    return true;
  };

  const submitReport = async (reason: string) => {
    if (!requireAuth()) return;
    setBusy(true);
    try {
      await fileReport(target.type, target.id, reason);
      onClose();
      Alert.alert('Report submitted', "Thanks — we'll review this.");
    } catch (e) {
      Alert.alert('Could not submit report', friendlyError(e, (e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const blockAuthor = async () => {
    if (!requireAuth()) return;
    if (!target.authorId) return;
    setBusy(true);
    try {
      await setBlocked(target.authorId, true);
      onClose();
      Alert.alert('Blocked', "You won't see this person's posts anymore.");
    } catch (e) {
      Alert.alert('Could not block', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: insets.bottom + 20 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginBottom: 16 }} />
        <T style={{ fontSize: 16, fontWeight: '800', marginBottom: 4 }}>Report this content</T>
        <T style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>Your report is anonymous to other users.</T>
        <View style={{ gap: 8 }}>
          {REASONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => submitReport(r)}
              disabled={busy}
              style={{ paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}
            >
              <T style={{ fontSize: 14.5, fontWeight: '600' }}>{r}</T>
            </Pressable>
          ))}
        </View>
        {target.authorId && (
          <Button label="Block this person" variant="soft" style={{ marginTop: 16 }} onPress={blockAuthor} disabled={busy} />
        )}
      </View>
    </Modal>
  );
}
