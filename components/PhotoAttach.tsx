import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/theme/theme';
import { uploadPostImage } from '@/data/remote';
import { haptic } from '@/lib/haptics';
import { T } from './base';
import { Icon } from './Icon';
import { useToast } from './Toast';

// Shared photo-attach control for composers. Handles pick → upload → preview,
// and reports the uploaded public URL up via onChange. `canUpload` gates on
// auth/backend so it degrades to a friendly nudge when offline.
export function PhotoAttach({
  value,
  onChange,
  canUpload,
  compact,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  canUpload: boolean;
  compact?: boolean;
}) {
  const { c } = useTheme();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    if (!canUpload) { showToast('Sign in to add a photo', '🔒'); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast('Photo access is needed to attach an image'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const url = await uploadPostImage(result.assets[0].uri);
      onChange(url);
      haptic.success();
    } catch (e) {
      showToast("Couldn't upload that photo — try again");
      console.warn('uploadPostImage failed', e);
    } finally {
      setUploading(false);
    }
  };

  // Preview with a remove button once an image is attached.
  if (value) {
    return (
      <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
        <Image source={{ uri: value }} style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: 14, backgroundColor: c.surface2 }} contentFit="cover" />
        <Pressable
          onPress={() => { haptic.tick(); onChange(undefined); }}
          accessibilityRole="button"
          accessibilityLabel="Remove photo"
          hitSlop={8}
          style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 999, backgroundColor: 'rgba(20,16,12,0.55)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="close" size={16} stroke="#fff" sw={2.4} />
        </Pressable>
        {uploading && (
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 14 }}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>
    );
  }

  // The add-photo affordance.
  return (
    <Pressable
      onPress={uploading ? undefined : pick}
      accessibilityRole="button"
      accessibilityLabel="Add a photo"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: compact ? 6 : 8, paddingHorizontal: compact ? 11 : 13, borderRadius: 999,
        backgroundColor: c.surface, borderWidth: 1, borderColor: c.line,
      }}
    >
      {uploading ? <ActivityIndicator size="small" color={c.accent} /> : <T style={{ fontSize: 14 }}>🖼️</T>}
      <T style={{ fontSize: 12.5, fontWeight: '700', color: c.inkSoft }}>{uploading ? 'Uploading…' : 'Photo'}</T>
    </Pressable>
  );
}
