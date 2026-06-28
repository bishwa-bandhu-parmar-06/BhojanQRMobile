import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FloatingQRScanner from '../components/FloatingQRScanner';

const ScanScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <View style={styles.iconBox}>
          <FontAwesome5 name="qrcode" size={48} color="#ea580c" />
        </View>
        <Text style={styles.title}>Scan a Table QR Code</Text>
        <Text style={styles.subtitle}>Opening your camera to scan a restaurant's BhojanQR code.</Text>
      </View>
      <FloatingQRScanner autoOpen />
    </SafeAreaView>
  );
};

export default ScanScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconBox: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '900', color: '#1f2937', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 10, lineHeight: 20 },
});
