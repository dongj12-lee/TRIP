import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useRemoteContent } from '@/lib/remoteData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createBuddy, createPost } from '@/data/remote';
import { POST_TYPES } from '@/data';
import { PostType } from '@/data/types';
import { T, H, Screen, DetailHeader, Button } from '@/components/base';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptics';

export default function Compose() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useStore();
  const { addLocalPost, addLocalBuddy } = useRemoteContent();
  const { showToast } = useToast();

  const isBuddy = kind === 'buddy';
  const [type, setType] = useState<PostType>('tip');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [when, setWhen] = useState('');
  const [groupSize, setGroupSize] = useState('4');
  const [emoji, setEmoji] = useState('🧭');
  const [busy, setBusy] = useState(false);

  const canSubmit = isSupabaseConfigured && !!session;

  const field = {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: c.ink, fontFamily: 'Jakarta',
  } as const;

  const submit = async () => {
    if (!title.trim()) return;
    if (!canSubmit) {
      Alert.alert('Sign in required', 'Connect a Supabase backend and sign in to publish.');
      return;
    }
    setBusy(true);
    try {
      if (isBuddy) {
        const created = await createBuddy({
          activity: title.trim(),
          emoji: emoji.trim() || '🧭',
          whenText: when.trim() || 'Soon',
          groupSize: Number(groupSize) || 2,
          note: body.trim(),
          authorName: profile.displayName || 'You',
          authorCountry: profile.country,
        });
        addLocalBuddy(created);
        haptic.success();
        showToast('Buddy plan posted', '🙌');
        router.replace('/(tabs)/buddy');
      } else {
        const created = await createPost({
          type,
          title: title.trim(),
          body: body.trim(),
          authorName: profile.displayName || 'You',
          authorCountry: profile.country,
        });
        addLocalPost(created);
        haptic.success();
        showToast('Posted to the community', '🎉');
        router.replace('/(tabs)/feed');
      }
    } catch (e) {
      Alert.alert('Could not publish', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <DetailHeader title={isBuddy ? 'New buddy plan' : 'New post'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          {!isBuddy && (
            <>
              <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 8, marginTop: 4 }}>TYPE</T>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {Object.entries(POST_TYPES).filter(([k]) => k !== 'review').map(([k, v]) => {
                  const on = type === k;
                  return (
                    <Pressable key={k} onPress={() => setType(k as PostType)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent50 : c.surface }}>
                      <T style={{ fontSize: 13, fontWeight: '700', color: on ? c.accent : c.inkSoft }}>{v.emoji} {v.label}</T>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6 }}>{isBuddy ? 'ACTIVITY' : 'TITLE'}</T>
          <TextInput value={title} onChangeText={setTitle} placeholder={isBuddy ? 'e.g. Fried chicken + beer tonight' : 'A clear, helpful title'} style={field} placeholderTextColor={c.muted} />

          <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6, marginTop: 14 }}>{isBuddy ? 'DETAILS' : 'BODY'}</T>
          <TextInput value={body} onChangeText={setBody} placeholder="Share the details…" multiline style={[field, { minHeight: 140, textAlignVertical: 'top' }]} placeholderTextColor={c.muted} />

          {isBuddy && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 2 }}>
                <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6 }}>WHEN</T>
                <TextInput value={when} onChangeText={setWhen} placeholder="Tonight, 8pm" style={field} placeholderTextColor={c.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6 }}>GROUP</T>
                <TextInput value={groupSize} onChangeText={setGroupSize} placeholder="4" keyboardType="number-pad" style={field} placeholderTextColor={c.muted} />
              </View>
              <View style={{ width: 64 }}>
                <T style={{ fontSize: 12, fontWeight: '700', color: c.muted, marginBottom: 6 }}>EMOJI</T>
                <TextInput value={emoji} onChangeText={setEmoji} style={[field, { textAlign: 'center' }]} placeholderTextColor={c.muted} />
              </View>
            </View>
          )}

          {!canSubmit && (
            <View style={{ marginTop: 16, backgroundColor: c.gold50, borderRadius: 12, padding: 12 }}>
              <T style={{ fontSize: 12.5, color: c.gold700, lineHeight: 18, fontWeight: '600' }}>
                {isSupabaseConfigured ? 'Sign in to publish.' : "Backend isn't connected yet — publishing is disabled until Supabase is configured."}
              </T>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingBottom: insets.bottom + 12, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button label={busy ? 'Publishing…' : 'Post'} disabled={!title.trim() || busy} onPress={submit} />
      </View>
    </Screen>
  );
}
