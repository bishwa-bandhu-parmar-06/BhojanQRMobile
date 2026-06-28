import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import RNShare from 'react-native-share';
import RNFS from 'react-native-fs';
import Toast from 'react-native-toast-message';

const FreeQrGenerator = () => {
  const navigation = useNavigation<any>();
  const [text, setText] = useState('');
  const previewRef = useRef<View>(null);
  const hasValue = text.trim().length > 0;

  const handleDownload = async () => {
    if (!hasValue) return;
    try {
      const uri = await captureRef(previewRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const fileName = 'bhojanqr-qr-code.png';
      const destPath = Platform.OS === 'android'
        ? `${RNFS.DownloadDirectoryPath}/${fileName}`
        : `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.copyFile(uri, destPath);
      if (Platform.OS === 'android') await RNFS.scanFile(destPath);
      Toast.show({ type: 'success', text1: 'Saved to Downloads folder!' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to download QR code.' });
    }
  };

  const handleShare = async () => {
    if (!hasValue) return;
    try {
      const uri = await captureRef(previewRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await RNShare.open({ url: uri, title: 'QR Code', message: 'Here is your QR code' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to share QR code.' });
    }
  };

  return (
    <LinearGradient colors={['#fff7ed', '#ffffff']} style={styles.globalGradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>

            <View style={styles.heroSection}>
              <View style={[styles.topBadge, styles.premiumShadow]}>
                <FontAwesome5 name="bolt" size={11} color="#ea580c" style={{ marginRight: 6 }} />
                <Text style={styles.badgeText}>100% Free, No Signup Required</Text>
              </View>
              <Text style={styles.title}>Free QR Code Generator</Text>
              <Text style={styles.heroSubtext}>Paste any URL or text, generate a QR code instantly, and download it as a PNG.</Text>
            </View>

            <View style={styles.sectionContainer}>
              <View style={[styles.inputCard, styles.premiumShadow]}>
                <Text style={styles.fieldLabel}>Enter a URL or text</Text>
                <TextInput
                  style={styles.textArea}
                  value={text}
                  onChangeText={setText}
                  placeholder="https://yourmenu.com"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                />
                <Text style={styles.hintText}>Tip: paste your menu link, Google Maps link, or social page to generate a scannable code.</Text>
              </View>

              <View style={[styles.previewCard, styles.premiumShadow]}>
                <View ref={previewRef} collapsable={false} style={styles.qrBox}>
                  {hasValue ? (
                    <QRCode value={text} size={200} />
                  ) : (
                    <FontAwesome5 name="qrcode" size={64} color="#d1d5db" />
                  )}
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, !hasValue && styles.actionBtnDisabled]}
                    onPress={handleDownload}
                    disabled={!hasValue}
                  >
                    <FontAwesome5 name="download" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Download</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtnOutline, !hasValue && styles.actionBtnDisabled]}
                    onPress={handleShare}
                    disabled={!hasValue}
                  >
                    <FontAwesome5 name="share-alt" size={14} color="#ea580c" />
                    <Text style={styles.actionBtnOutlineText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* PITCH */}
            <View style={styles.pitchSection}>
              <Text style={styles.pitchTitle}>This QR code just links to a URL.{'\n'}Want it to open a real digital menu instead?</Text>
              <Text style={styles.pitchSubtext}>
                BhojanQR turns this same QR code into a full digital menu with live ordering and a kitchen-ready POS - no printing, no reprints when prices change.
              </Text>
              <TouchableOpacity style={styles.pitchBtn} onPress={() => navigation.navigate('Login/Signup')}>
                <Text style={styles.pitchBtnText}>Try BhojanQR Free</Text>
                <FontAwesome5 name="arrow-right" size={13} color="#fff" />
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default FreeQrGenerator;

const styles = StyleSheet.create({
  globalGradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  premiumShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 5 },
    }),
  },

  heroSection: { paddingTop: 40, paddingHorizontal: 24, alignItems: 'center', marginBottom: 24 },
  topBadge: { backgroundColor: '#ffedd5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  badgeText: { color: '#ea580c', fontSize: 12, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '900', color: '#1f2937', textAlign: 'center', letterSpacing: -0.5 },
  heroSubtext: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 10, lineHeight: 21 },

  sectionContainer: { paddingHorizontal: 24, gap: 20 },
  inputCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '800', color: '#1f2937', marginBottom: 10 },
  textArea: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 14, fontSize: 14, color: '#1f2937', backgroundColor: '#f9fafb', minHeight: 100, textAlignVertical: 'top' },
  hintText: { fontSize: 11, color: '#9ca3af', marginTop: 10 },

  previewCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, alignItems: 'center' },
  qrBox: { width: 224, height: 224, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ea580c', paddingVertical: 14, borderRadius: 100 },
  actionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff7ed', paddingVertical: 14, borderRadius: 100, borderWidth: 1, borderColor: '#fed7aa' },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  actionBtnOutlineText: { color: '#ea580c', fontWeight: '800', fontSize: 13 },

  pitchSection: { backgroundColor: '#111827', borderRadius: 28, marginHorizontal: 24, marginTop: 32, padding: 28, alignItems: 'center' },
  pitchTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 26 },
  pitchSubtext: { color: '#d1d5db', fontSize: 13, textAlign: 'center', marginTop: 14, lineHeight: 20 },
  pitchBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ea580c', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 100, marginTop: 20 },
  pitchBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});
