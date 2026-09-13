// The "just tell it what you want" layer on the trip planner.
//
// Docked at the bottom of /trip rather than living in a modal, deliberately:
// the whole point is that you watch the itinerary above change as you talk to
// it. A modal would hide the thing being edited. The transcript sits directly
// above the input and stays short, this is a control surface, not a chat app.
import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { T } from './base';
import { haptic } from '@/lib/haptics';

export type ChatBubble = { role: 'user' | 'assistant'; content: string; error?: boolean };

const SUGGESTIONS = [
  'Make day 2 more relaxed',
  'Swap lunch on day 1',
  'Less walking overall',
];

export function TripChatDock({
  messages,
  pending,
  disabled,
  onSend,
}: {
  messages: ChatBubble[];
  pending: boolean;
  disabled?: boolean;
  onSend: (text: string) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const submit = (raw?: string) => {
    const value = (raw ?? text).trim();
    if (!value || pending || disabled) return;
    haptic.tick();
    setText('');
    onSend(value);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.paper, paddingBottom: insets.bottom + 10 }}>
        {messages.length > 0 && (
          <ScrollView
            ref={scrollRef}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            style={{ maxHeight: 168 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 7 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m, i) => (
              <View
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '86%',
                  backgroundColor: m.role === 'user' ? c.accent : c.surface,
                  borderWidth: m.role === 'user' ? 0 : 1,
                  borderColor: c.line,
                  borderRadius: 15,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                <T
                  style={{
                    fontSize: 13.5,
                    lineHeight: 19,
                    color: m.role === 'user' ? c.paper : m.error ? c.rose : c.ink,
                  }}
                >
                  {m.content}
                </T>
              </View>
            ))}
            {pending && (
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 }}>
                <ActivityIndicator size="small" color={c.muted} />
                <T style={{ fontSize: 12.5, color: c.muted }}>Reworking your trip…</T>
              </View>
            )}
          </ScrollView>
        )}

        {messages.length === 0 && !disabled && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingTop: 11 }}
          >
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => submit(s)}
                style={{ paddingVertical: 6.5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}
              >
                <T style={{ fontSize: 12, fontWeight: '700', color: c.inkSoft }}>{s}</T>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10 }}>
          <View style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 20, paddingHorizontal: 14 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => submit()}
              editable={!disabled}
              placeholder="Change something about this trip…"
              placeholderTextColor={c.muted}
              multiline
              returnKeyType="send"
              blurOnSubmit
              accessibilityLabel="Ask to change the trip"
              style={{ fontSize: 14.5, lineHeight: 20, color: c.ink, fontFamily: 'Pretendard', paddingTop: 10, paddingBottom: 10, maxHeight: 96 }}
            />
          </View>
          <Pressable
            onPress={() => submit()}
            disabled={!text.trim() || pending || disabled}
            accessibilityRole="button"
            accessibilityLabel="Send"
            hitSlop={4}
            style={{
              width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
              backgroundColor: text.trim() && !pending && !disabled ? c.accent : c.surface2,
            }}
          >
            <T style={{ fontSize: 16, fontWeight: '800', color: text.trim() && !pending && !disabled ? c.paper : c.muted }}>↑</T>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
