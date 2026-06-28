import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gauge } from 'lucide-react-native';

// Mirrors the website's SlowNetworkBanner.jsx - non-blocking, purely
// informational, never stops interaction.
const SlowNetworkBanner = () => (
  <View style={styles.banner}>
    <Gauge size={14} color="#92400e" />
    <Text style={styles.text}>Slow connection detected - some things may take longer to load.</Text>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  text: { flex: 1, fontSize: 11, fontWeight: '600', color: '#92400e' },
});

export default SlowNetworkBanner;
