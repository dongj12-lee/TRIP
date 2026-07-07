import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/theme';
import { useRemoteContent } from '@/lib/remoteData';
import { T } from './base';

// Slim inline banner shown when the initial live fetch failed and the app is
// running on bundled offline content. Disappears once a retry succeeds.
export function OfflineBanner() {
  const { c } = useTheme();
  const { error, refreshAll } = useRemoteContent();
  const [busy, setBusy] = useState(false);
  if (!error) return null;

  const retry = async () => {
    setBusy(true);
    await refreshAll();
    setBusy(false);
  };

  return (
    <View
      style={{
        marginHorizontal: 18, marginBottom: 10, borderRadius: 12,
        backgroundColor: c.gold50, paddingVertical: 9, paddingHorizontal: 12,
        flexDirection: 'row', alignItems: 'center', gap: 8,
      }}
    >
      <T style={{ fontSize: 13 }}>📡</T>
      <T style={{ flex: 1, fontSize: 12.5, lineHeight: 17, color: c.gold700, fontWeight: '600' }}>
        Can't reach the server — showing offline content.
      </T>
      <Pressable
        onPress={busy ? undefined : retry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading content"
        hitSlop={8}
        style={{ paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: c.gold700 }}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <T style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Retry</T>
        )}
      </Pressable>
    </View>
  );
}
