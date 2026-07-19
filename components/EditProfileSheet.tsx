import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { uploadAvatar } from '@/data/remote';
import { haptic } from '@/lib/haptics';
import { T, H, Button } from './base';
import { Avatar } from './Avatar';
import { useToast } from './Toast';

// Lets a signed-in user set their real display name + handle, so the profile
// is theirs instead of the seeded "You / @newtraveler" placeholder.
export function EditProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useStore();
  const { configured, session } = useAuth();
  const { showToast } = useToast();
  const canUpload = isSupabaseConfigured && !!session;

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(profile.displayName ?? '');
      setHandle(profile.handle ?? '');
      setAvatarUrl(profile.avatarUrl);
    }
  }, [visible]);

  const pickAvatar = async () => {
    if (!canUpload) { showToast('Sign in to add a photo', '🔒'); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast('Photo access is needed to set an avatar'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(result.assets[0].uri);
      setAvatarUrl(url);
      haptic.success();
    } catch (e) {
      showToast("Couldn't upload that photo — try again");
      console.warn('uploadAvatar failed', e);
    } finally {
      setUploading(false);
    }
  };

  const field = {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, color: c.ink, fontFamily: 'Pretendard',
  } as const;

  const save = async () => {
    setSaving(true);
    const cleanHandle = handle.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '');
    await updateProfile({
      displayName: name.trim() || undefined,
      handle: cleanHandle || undefined,
      avatarUrl: avatarUrl ?? undefined,
    });
    setSaving(false);
    haptic.success();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginBottom: 16 }} />
          <H style={{ fontSize: 21, marginBottom: 16 }}>Edit profile</H>

          {/* Avatar picker */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Pressable onPress={pickAvatar} accessibilityRole="button" accessibilityLabel="Change profile photo" style={{ position: 'relative' }}>
              <Avatar name={name || 'You'} uri={avatarUrl} size={84} />
              <View style={{ position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.paper }}>
                {uploading ? <ActivityIndicator size="small" color="#fff" /> : <T style={{ fontSize: 15 }}>📷</T>}
              </View>
            </Pressable>
            <T style={{ fontSize: 12, color: c.muted, marginTop: 8 }}>{uploading ? 'Uploading…' : 'Tap to change photo'}</T>
          </View>

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
