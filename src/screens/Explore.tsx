import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import { WEBSITE_LINKS } from '../config/socialLinks';

const NATIVE_ITEMS = [
  { key: 'Help', label: 'Help Center', desc: 'FAQs and support articles', icon: 'question-circle', color: '#16a34a', bg: '#dcfce7' },
  { key: 'ContactUs', label: 'Contact Us', desc: 'Reach the team directly', icon: 'envelope', color: '#ea580c', bg: '#ffedd5' },
  { key: 'FreeQrGenerator', label: 'Free QR Generator', desc: 'Create a QR code instantly', icon: 'qrcode', color: '#2563eb', bg: '#dbeafe' },
];

const WEB_ITEMS = [
  { key: 'blog', label: 'Blog', desc: 'Tips, news and updates', icon: 'rss', url: WEBSITE_LINKS.blog },
  { key: 'video', label: 'Video Library', desc: 'Tutorial videos', icon: 'play-circle', url: WEBSITE_LINKS.videoLibrary },
  { key: 'terms', label: 'Terms & Conditions', desc: 'Legal terms of use', icon: 'file-contract', url: WEBSITE_LINKS.terms },
];

const Explore = () => {
  const navigation = useNavigation<any>();

  return (
    <LinearGradient colors={['#f0fdf4', '#ffffff']} style={styles.globalGradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          <View style={styles.heroSection}>
            <Text style={styles.title}>Explore</Text>
            <Text style={styles.subtitle}>Help, tools, and everything else BhojanQR offers</Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>In the App</Text>
            {NATIVE_ITEMS.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[styles.row, styles.premiumShadow]}
                onPress={() => navigation.navigate(item.key)}
              >
                <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                  <FontAwesome5 name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowDesc}>{item.desc}</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>On the Web</Text>
            {WEB_ITEMS.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[styles.row, styles.premiumShadow]}
                onPress={() => Linking.openURL(item.url)}
              >
                <View style={[styles.iconBox, { backgroundColor: '#f3f4f6' }]}>
                  <FontAwesome5 name={item.icon} size={18} color="#6b7280" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowDesc}>{item.desc}</Text>
                </View>
                <FontAwesome5 name="external-link-alt" size={13} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Explore;

const styles = StyleSheet.create({
  globalGradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  premiumShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },

  heroSection: { paddingTop: 40, paddingHorizontal: 24, marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '900', color: '#166534', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 6 },

  sectionContainer: { paddingHorizontal: 24, marginTop: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '800', color: '#1f2937' },
  rowDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
});
