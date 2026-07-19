import React from 'react';
import { View, Text, Pressable } from 'react-native';

// Last-resort crash screen. Deliberately theme-independent (static colors,
// system font): if rendering blew up, the theme context may be part of what
// broke, and this screen must always be able to paint.
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unrecovered render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#faf9f7', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40 }}>🧭</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#2a221b', marginTop: 14, textAlign: 'center' }}>
          Something went wrong
        </Text>
        <Text style={{ fontSize: 14, color: '#6b5e51', marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
          An unexpected error stopped this screen. Your saved spots and itinerary are safe.
        </Text>
        <Pressable
          onPress={() => this.setState({ error: null })}
          accessibilityRole="button"
          style={({ pressed }) => ({
            marginTop: 22, paddingVertical: 13, paddingHorizontal: 28, borderRadius: 14,
            backgroundColor: '#a36643', opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
