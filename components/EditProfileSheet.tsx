import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { haptic } from '@/lib/haptics';
import { T, H, Button } from './base';

// Lets a signed-in user set their real display name + handle, so the profile
// is theirs instead of the seeded "You / @newtraveler" placeholder.
export function EditProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useStore();

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(profile.displayName ?? '');
      setHandle(profile.handle ?? '');
    }
  }, [visible]);

  const field = {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 12,
    paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, color: c.ink, fontFamily: 'Jakarta',
  } as const;

  const save = async () => {
    setSaving(true);
    const cleanHandle = handle.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '');
    await updateProfile({ displayName: name.trim() || undefined, handle: cleanHandle || undefined });
    setSaving(false);
    haptic.success();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginBottom: 16 }} />
          <H style={{ fontSize: 21, marginBottom: 16 }}>Edit profile</H>

          <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6 }}>DISPLAY NAME</T>
          <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={c.muted} style={field} maxLength={40} />

          <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6, marginTop: 14 }}>HANDLE</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T style={{ fontSize: 16, color: c.muted, fontWeight: '700' }}>@</T>
            <TextInput
              value={handle}
              onChangeText={setHandle}
              placeholder="handle"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              style={[field, { flex: 1 }]}
              maxLength={24}
            />
          </View>

          <Button label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving} style={{ marginTop: 20 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
