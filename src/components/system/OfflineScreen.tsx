import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WifiOff, RotateCcw } from 'lucide-react-native';

const formatLastOnline = (timestamp: number | null) => {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface OfflineScreenProps {
  onRetry: () => void;
  lastOnlineAt: number | null;
}

// Mirrors the website's OfflineScreen.jsx - same copy, same single
// "Retry Connection" action (no "Refresh Page" equivalent on native).
const OfflineScreen = ({ onRetry, lastOnlineAt }: OfflineScreenProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.topBar} />
        <View style={styles.iconWrap}>
          <WifiOff size={56} color="#fb923c" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.subtitle}>Your internet connection appears to be unavailable.</Text>
        <Text style={styles.subtitle}>Please check your WiFi or mobile data connection and try again.</Text>

        {lastOnlineAt && (
          <Text style={styles.lastOnline}>Last connected at {formatLastOnline(lastOnlineAt)}</Text>
        )}

        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <RotateCcw size={18} color="#fff" />
          <Text style={styles.retryBtnText}>Retry Connection</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          BhojanQR will automatically reconnect as soon as your internet is back.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 420, alignItems: 'center', elevation: 4, overflow: 'hidden' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: '#f97316' },
  iconWrap: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', fontWeight: '500', textAlign: 'center', marginBottom: 4 },
  lastOnline: { fontSize: 12, color: '#9ca3af', marginTop: 16 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f97316', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 14, marginTop: 24, width: '100%' },
  retryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  footerText: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 18 },
});

export default OfflineScreen;
