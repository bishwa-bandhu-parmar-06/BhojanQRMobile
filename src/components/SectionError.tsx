import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

// Generic "this section failed to load" inline state with a Retry button.
// The website has no equivalent - failed section fetches there are
// toast-only and the user is left with a stale/empty view - but the mobile
// UX-improvement phase explicitly calls for retry affordances, so this is a
// mobile-only addition, not a parity port. Stays inline (not a full-screen
// takeover like ErrorBoundary/OfflineScreen) so the rest of the page chrome
// (headers, tabs) remains visible and usable.
interface SectionErrorProps {
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
}

const SectionError = ({ message = 'Something went wrong while loading this.', onRetry, retrying = false }: SectionErrorProps) => (
  <View style={styles.container}>
    <AlertCircle size={36} color="#f87171" strokeWidth={1.75} />
    <Text style={styles.message}>{message}</Text>
    <TouchableOpacity style={styles.retryBtn} onPress={onRetry} disabled={retrying}>
      <RefreshCw size={16} color="#fff" />
      <Text style={styles.retryBtnText}>{retrying ? 'Retrying...' : 'Retry'}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 12 },
  message: { fontSize: 14, fontWeight: '600', color: '#6b7280', textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f97316', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

export default SectionError;
