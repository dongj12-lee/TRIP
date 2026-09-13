import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/lib/auth';
import { useRequireAuth } from '@/lib/requireAuth';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createPost, friendlyError } from '@/data/remote';
import { POST_TYPES } from '@/data';
import { PostType } from '@/data/types';
import { T, Screen, DetailHeader, Button } from '@/components/base';
import { PhotoAttach } from '@/components/PhotoAttach';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptics';

// Was also a "New buddy plan" form (kind=buddy), reached from the Buddy tab.
// Buddy is currently unshipped (see app/(tabs)/_layout.tsx) with no entry
// point left that could reach that branch, so it was removed here rather than
// kept as dead code with no way to trigger or test it. The original is still
// intact in _disabled-routes/ if Buddy comes back.
export default function Compose() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const requireAuth = useRequireAuth();
  const { profile } = useStore();
  const { addLocalPost } = useRemoteContent();
  const { showToast } = useToast();

  const [type, setType] = useState<PostType>('post');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const canSubmit = isSupabaseConfigured && !!session;

  const field = {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: c.ink, fontFamily: 'Pretendard',
  } as const;

  const canSubmitForm = title.trim().length > 0;

  const submit = async () => {
    if (!canSubmitForm) return;
    if (isSupabaseConfigured && !requireAuth('publish this post')) return;
    if (!canSubmit) return;
    setBusy(true);
    try {
      const created = await createPost({
        type,
        title: title.trim(),
        body: body.trim(),
        imageUrl,
        authorName: profile.displayName || 'You',
        authorCountry: profile.country,
      });
      addLocalPost(created);
      haptic.success();
      showToast('Posted to the community', '🎉');
      router.replace('/(tabs)/feed');
    } catch (e) {
      Alert.alert('Could not publish', friendlyError(e, (e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <DetailHeader title="New post" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 8, marginTop: 4 }}>TYPE</T>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {/* Route posts come from the itinerary-share flow (they carry
                route data), so the composer only offers Post vs Question. */}
            {Object.entries(POST_TYPES).filter(([k]) => k !== 'route').map(([k, v]) => {
              const on = type === k;
              return (
                <Pressable key={k} onPress={() => setType(k as PostType)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent50 : c.surface }}>
                  <T style={{ fontSize: 13, fontWeight: '700', color: on ? c.accent : c.inkSoft }}>{v.emoji} {v.label}</T>
                </Pressable>
              );
            })}
          </View>

          <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6 }}>TITLE</T>
          <TextInput value={title} onChangeText={setTitle} placeholder="A clear, helpful title" style={field} placeholderTextColor={c.muted} />

          <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6, marginTop: 14 }}>BODY</T>
          <TextInput value={body} onChangeText={setBody} placeholder="Share the details…" multiline style={[field, { minHeight: 140, textAlignVertical: 'top' }]} placeholderTextColor={c.muted} />

          <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6, marginTop: 14 }}>PHOTO</T>
          <PhotoAttach value={imageUrl} onChange={setImageUrl} canUpload={canSubmit} />

          {!canSubmit && (
            <Pressable
              disabled={!isSupabaseConfigured}
              onPress={() => requireAuth('publish this post')}
              style={{ marginTop: 16, backgroundColor: c.gold50, borderRadius: 10, padding: 12 }}
            >
              <T style={{ fontSize: 12.5, color: c.gold700, lineHeight: 18, fontWeight: '600' }}>
                {isSupabaseConfigured ? 'Sign in to publish. Tap here.' : "Backend isn't connected yet, publishing is disabled until Supabase is configured."}
              </T>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingBottom: insets.bottom + 12, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button label={busy ? 'Publishing…' : 'Post'} disabled={!canSubmitForm || busy} onPress={submit} />
      </View>
    </Screen>
  );
}
