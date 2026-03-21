import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";

const PrivacyPolicy = () => {
  const lastUpdated = "February 14, 2026";

  const privacySections = [
    {
      icon: "database",
      title: "Information We Collect",
      content: "We collect information to provide better services to all our users. This includes:",
      points: [
        "Restaurant details (name, address, contact)",
        "Customer information (when provided)",
        "Usage data (QR code scans, interaction)",
        "Device information (IP address, identifiers)",
      ],
    },
    {
      icon: "lock",
      title: "How We Use Information",
      content: "We use the information we collect to:",
      points: [
        "Provide our QR code menu services",
        "Process orders and manage operations",
        "Improve and personalize user experience",
        "Ensure platform security and prevent fraud",
      ],
    },
    {
      icon: "shield-alt",
      title: "Data Protection",
      content: "We implement robust security measures:",
      points: [
        "256-bit SSL encryption for data",
        "Secure servers with firewall protection",
        "Regular security audits",
        "Strict access controls",
      ],
    },
    {
      icon: "cookie",
      title: "Cookies & Tracking",
      content: "We use cookies and similar tech to:",
      points: [
        "Remember preferences and settings",
        "Understand platform usage",
        "Improve website functionality",
      ],
    },
    {
      icon: "globe",
      title: "Information Sharing",
      content: "We do not sell your personal information. We may share:",
      points: [
        "With restaurants to fulfill orders",
        "With trusted service providers",
        "When required by law",
      ],
    },
    {
      icon: "envelope",
      title: "Your Rights",
      content: "You have the right to:",
      points: [
        "Access and review your information",
        "Request corrections or updates",
        "Delete your account",
        "Opt-out of marketing",
      ],
    },
  ];

  const quickFacts = [
    { icon: "shield-alt", text: "256-bit SSL" },
    { icon: "eye", text: "No Data Selling" },
    { icon: "mobile-alt", text: "Secure Access" },
    { icon: "file-alt", text: "GDPR Compliant" },
  ];

  return (
    <LinearGradient
      colors={["#f0fdf4", "#fff7ed", "#f0fdf4"]}
      style={styles.globalGradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView  keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* HERO SECTION */}
          <View style={styles.heroSection}>
            <View style={[styles.topBadge, styles.premiumShadow]}>
              <FontAwesome5 name="shield-alt" size={12} color="#ea580c" style={{ marginRight: 6 }} />
              <Text style={styles.badgeText}>Last Updated: {lastUpdated}</Text>
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.titleGreen}>Privacy</Text>
              <Text style={styles.titleOrange}>Policy</Text>
              <View style={styles.titleUnderline} />
            </View>

            <Text style={styles.heroSubtext}>
              Your privacy matters to us. Learn how we collect, use, and protect your information.
            </Text>
          </View>

          {/* QUICK FACTS */}
          <View style={styles.factsContainer}>
            {quickFacts.map((fact, index) => (
              <View key={index} style={styles.factItem}>
                <FontAwesome5 name={fact.icon} size={16} color="#16a34a" style={{ marginBottom: 6 }} />
                <Text style={styles.factText}>{fact.text}</Text>
              </View>
            ))}
          </View>

          {/* INTRO SECTION */}
          <View style={styles.sectionContainer}>
            <View style={[styles.introCard, styles.premiumShadow]}>
              <View style={styles.introIconBox}>
                <FontAwesome5 name="shield-alt" size={24} color="#16a34a" />
              </View>
              <Text style={styles.introTitle}>Our Commitment to Privacy</Text>
              <Text style={styles.introText}>
                At BhojanQR, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our QR code menu platform.
              </Text>
            </View>
          </View>

          {/* PRIVACY SECTIONS GRID */}
          <View style={styles.sectionContainer}>
            {privacySections.map((section, index) => (
              <View key={index} style={[styles.policyCard, styles.premiumShadow]}>
                <View style={styles.policyHeader}>
                  <View style={[styles.policyIconBox, index % 2 === 0 ? styles.bgGreenLight : styles.bgOrangeLight]}>
                    <FontAwesome5 name={section.icon} size={20} color={index % 2 === 0 ? "#16a34a" : "#ea580c"} />
                  </View>
                  <Text style={styles.policyTitle}>{section.title}</Text>
                </View>
                <Text style={styles.policyContent}>{section.content}</Text>
                {section.points.map((point, idx) => (
                  <View key={idx} style={styles.pointRow}>
                    <FontAwesome5 name="check-circle" size={14} color={index % 2 === 0 ? "#16a34a" : "#ea580c"} style={{ marginTop: 2 }} />
                    <Text style={styles.pointText}>{point}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* CONTACT CTA */}
          <View style={styles.ctaContainer}>
            <LinearGradient colors={["#16a34a", "#ea580c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.ctaBanner, styles.premiumShadow]}>
              <Text style={styles.ctaTitle}>Have Questions?</Text>
              <Text style={styles.ctaSubtext}>Our privacy team is here to help address any concerns.</Text>
              <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
                <FontAwesome5 name="envelope" size={16} color="#166534" style={{ marginRight: 8 }} />
                <Text style={styles.ctaButtonText}>Contact Privacy Team</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default PrivacyPolicy;

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
  
  // Hero
  heroSection: { paddingTop: 40, paddingHorizontal: 24, alignItems: 'center', marginBottom: 32 },
  topBadge: { backgroundColor: '#ffedd5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  badgeText: { color: '#ea580c', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  titleContainer: { alignItems: 'center', marginBottom: 16 },
  titleGreen: { fontSize: 40, fontWeight: '900', color: '#166534', marginBottom: -4, letterSpacing: -1 },
  titleOrange: { fontSize: 40, fontWeight: '900', color: '#ea580c', letterSpacing: -1 },
  titleUnderline: { height: 4, width: 120, backgroundColor: '#ea580c', borderRadius: 4, marginTop: 12 },
  heroSubtext: { fontSize: 16, color: '#4b5563', fontWeight: '500', textAlign: 'center', lineHeight: 26, paddingHorizontal: 10 },

  // Privacy Specific
  factsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 32 },
  factItem: { alignItems: 'center', marginHorizontal: 12, marginVertical: 8, width: 70 },
  factText: { fontSize: 10, color: '#6b7280', fontWeight: '700', textAlign: 'center' },
  introCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 24, alignItems: 'center' },
  introIconBox: { width: 56, height: 56, backgroundColor: '#dcfce7', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  introTitle: { fontSize: 20, fontWeight: '800', color: '#166534', marginBottom: 12, textAlign: 'center' },
  introText: { fontSize: 15, color: '#4b5563', lineHeight: 24, textAlign: 'center', fontWeight: '500' },
  policyCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 24, marginBottom: 20 },
  policyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  policyIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bgGreenLight: { backgroundColor: '#dcfce7' },
  bgOrangeLight: { backgroundColor: '#ffedd5' },
  policyTitle: { fontSize: 18, fontWeight: '800', color: '#166534', flex: 1 },
  policyContent: { fontSize: 14, color: '#4b5563', marginBottom: 16, lineHeight: 22 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  pointText: { fontSize: 14, color: '#4b5563', marginLeft: 12, flex: 1, lineHeight: 20 },

  // Help Specific
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 100, paddingHorizontal: 20, marginTop: 24, width: '100%', height: 56 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#1f2937', fontWeight: '500' },
  categoryBtn: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', marginRight: 12, width: 120 },
  categoryActive: { backgroundColor: '#ea580c' },
  categoryInactive: { backgroundColor: '#ffffff' },
  categoryName: { fontSize: 13, fontWeight: '700', color: '#4b5563', textAlign: 'center' },
  faqCard: { backgroundColor: '#ffffff', borderRadius: 20, marginBottom: 12, overflow: 'hidden' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  faqQuestion: { fontSize: 15, fontWeight: '700', color: '#1f2937', flex: 1, paddingRight: 16 },
  faqAnswerContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  faqAnswer: { fontSize: 14, color: '#6b7280', lineHeight: 22 },
  supportCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 32, alignItems: 'center', marginHorizontal: 24 },
  supportIconBox: { width: 64, height: 64, backgroundColor: '#dcfce7', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  supportTitle: { fontSize: 24, fontWeight: '800', color: '#166534', marginBottom: 8 },
  supportDesc: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  supportBtn: { flexDirection: 'row', backgroundColor: '#ea580c', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 100, alignItems: 'center' },
  supportBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },

  // Shared
  sectionContainer: { marginBottom: 32, paddingHorizontal: 24 }, // <--- Added paddingHorizontal: 24 right here!
  sectionHeaderCenter: { alignItems: 'center', marginBottom: 24 },
  sectionHeader: { fontSize: 26, fontWeight: '900', color: '#166534', letterSpacing: -0.5 },
  ctaContainer: { paddingHorizontal: 24, marginTop: 16 },
  ctaBanner: { borderRadius: 24, padding: 32, alignItems: 'center' },
  ctaTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 8 },
  ctaSubtext: { fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 24 },
  ctaButton: { backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 100 },
  ctaButtonText: { color: '#166534', fontSize: 16, fontWeight: '800' },
});