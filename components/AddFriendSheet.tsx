import React, { useState } from 'react';
import { View, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { findProfileByHandle, addFriend, LeaderRow } from '@/data/remote';
import { haptic } from '@/lib/haptics';
import { T, H, Button } from './base';
import { useToast } from './Toast';

// Add a friend by exact @handle to compare passports. Looks up the public
// profile, shows a preview, and links them (directional — no request needed).
export function AddFriendSheet({ visible, onClose, onAdded }: { visible: boolean; onClose: () => void; onAdded: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<LeaderRow | null>(null);
  const [searched, setSearched] = useState(false);

  const reset = () => { setHandle(''); setFound(null); setSearched(false); setBusy(false); };

  const search = async () => {
    const clean = handle.trim().replace(/^@/, '');
    if (!clean) return;
    setBusy(true); setSearched(false);
    try {
      const r = await findProfileByHandle(clean);
      setFound(r);
      setSearched(true);
    } catch {
      setFound(null); setSearched(true);
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!found) return;
    setBusy(true);
    try {
      await addFriend(found.id);
      haptic.success();
      showToast(`Added ${found.name}`, '👥');
      onAdded();
      reset();
      onClose();
    } catch {
      showToast("Couldn't add friend — try again");
    } finally {
      setBusy(false);
    }
  };

  const field = {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 12,
    paddingHorizontal: 13, paddingVertical: 12, fontSize: 16, color: c.ink, fontFamily: 'Jakarta',
  } as const;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginBottom: 16 }} />
          <H style={{ fontSize: 21, marginBottom: 4 }}>Add a friend</H>
          <T style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>Enter their @handle to compare passports.</T>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <T style={{ fontSize: 16, color: c.muted, fontWeight: '700', position: 'absolute', left: 13, zIndex: 1 }}>@</T>
              <TextInput
                value={handle}
                onChangeText={(v) => { setHandle(v); setSearched(false); }}
                onSubmitEditing={search}
                placeholder="handle"
                placeholderTextColor={c.muted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={[field, { flex: 1, paddingLeft: 26 }]}
              />
            </View>
            <Pressable onPress={search} disabled={busy} style={{ paddingHorizontal: 18, borderRadius: 12, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
              {busy ? <ActivityIndicator size="small" color={c.paper} /> : <T style={{ color: c.paper, fontWeight: '800', fontSize: 14 }}>Find</T>}
            </Pressable>
          </View>

          {/* Result */}
          {searched && !found && (
            <T style={{ fontSize: 13, color: c.rose, fontWeight: '600', marginTop: 14 }}>No traveler with that handle.</T>
          )}
          {found && (
            <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 13 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T style={{ fontSize: 15, fontWeight: '800' }} numberOfLines={1}>{found.name}</T>
                  {!!found.country && <T style={{ fontSize: 14 }}>{found.country}</T>}
                </View>
                <T style={{ fontSize: 12, color: c.muted, fontWeight: '600', marginTop: 1 }}>{found.stamps} stamps · {found.districts}/25 districts</T>
              </View>
              <Button label="Add" onPress={add} disabled={busy} style={{ height: 40, paddingHorizontal: 20 } as any} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
