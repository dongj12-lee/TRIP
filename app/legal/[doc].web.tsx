import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, Redirect } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { Screen, DetailHeader } from '@/components/base';
import { legalDocHtml, LEGAL_TITLES, LegalDocKey } from '@/data/legalDocs';

// Web variant — react-native-webview has no web target (same reason
// WebMap.web.tsx exists), so on web we render the bundled legal HTML in a
// real DOM <iframe srcDoc>. Under react-native-web, JSX still compiles to
// React.createElement, so a lowercase 'iframe' renders an actual iframe.
export default function LegalDocWeb() {
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
        <iframe
          title={LEGAL_TITLES[key]}
          srcDoc={legalDocHtml(key)}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%', background: c.paper }}
        />
      </View>
    </Screen>
  );
}
