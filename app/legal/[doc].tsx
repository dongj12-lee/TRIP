import React from 'react';
import { View, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, Redirect } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { Screen, DetailHeader } from '@/components/base';
import { legalDocHtml, LEGAL_TITLES, LegalDocKey } from '@/data/legalDocs';

// In-app legal docs (Privacy / Terms / Community Guidelines), rendered from
// bundled self-contained HTML (data/legalDocs.ts) — replaces the old
// claude.ai artifact links. Fully offline, no external dependency.
export default function LegalDoc() {
  const { c } = useTheme();
  const { doc } = useLocalSearchParams<{ doc: string }>();

  if (doc !== 'privacy' && doc !== 'terms' && doc !== 'guidelines') {
    return <Redirect href="/settings" />;
  }
  const key = doc as LegalDocKey;

  return (
    <Screen>
      <DetailHeader title={LEGAL_TITLES[key]} />
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <WebView
          originWhitelist={['*']}
          source={{ html: legalDocHtml(key) }}
          style={{ flex: 1, backgroundColor: c.paper }}
          showsVerticalScrollIndicator={false}
          // Legal docs are static text. Keep the initial html load + in-page
          // anchor scrolls (about:/data:) inside the WebView; send the only
          // real outbound links (mailto: contact addresses) to the mail app.
          onShouldStartLoadWithRequest={(req) => {
            if (req.url.startsWith('about:') || req.url.startsWith('data:')) return true;
            if (req.url.startsWith('mailto:')) {
              Linking.openURL(req.url).catch(() => {});
              return false;
            }
            return false;
          }}
        />
      </View>
    </Screen>
  );
}
