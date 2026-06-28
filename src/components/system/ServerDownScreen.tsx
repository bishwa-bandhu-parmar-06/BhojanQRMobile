import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ServerCrash, RotateCcw } from 'lucide-react-native';

interface ServerDownScreenProps {
  countdown: number;
  retryCount: number;
  onRetryNow: () => void;
}

// Mirrors the website's ServerDownScreen.jsx - same copy, same live
// countdown to the next automatic retry plus a manual "Retry Now".
const ServerDownScreen = ({ countdown, retryCount, onRetryNow }: ServerDownScreenProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.topBar} />
        <View style={styles.iconWrap}>
          <ServerCrash size={56} color="#fb923c" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Server Temporarily Unavailable</Text>
        <Text style={styles.subtitle}>Our servers are currently restarting or undergoing maintenance.</Text>
        <Text style={styles.subtitle}>Please try again in a few moments.</Text>

        <View style={styles.countdownBox}>
          <Text style={styles.countdownText}>
            Retrying automatically in <Text style={styles.countdownNumber}>{countdown}</Text>s...
          </Text>
          {retryCount > 0 && <Text style={styles.retryCountText}>Attempt {retryCount}</Text>}
        </View>

        <TouchableOpacity style={styles.retryBtn} onPress={onRetryNow}>
          <RotateCcw size={18} color="#fff" />
          <Text style={styles.retryBtnText}>Retry Now</Text>
        </TouchableOpacity>
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
  countdownBox: { backgroundColor: '#fff7ed', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginTop: 20, width: '100%', alignItems: 'center' },
  countdownText: { fontSize: 14, fontWeight: '700', color: '#ea580c' },
  countdownNumber: { fontWeight: '900' },
  retryCountText: { fontSize: 11, color: '#fb923c', marginTop: 4 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f97316', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 14, marginTop: 24, width: '100%' },
  retryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default ServerDownScreen;
