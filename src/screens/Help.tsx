import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const helpCategories = [
    { id: "all", name: "All Help", icon: "question-circle", count: 24 },
    { id: "getting-started", name: "Getting Started", icon: "book-open", count: 6 },
    { id: "for-restaurants", name: "For Restaurants", icon: "utensils", count: 8 },
    { id: "for-customers", name: "For Customers", icon: "users", count: 5 },
    { id: "qr-codes", name: "QR Codes", icon: "qrcode", count: 4 },
    { id: "billing", name: "Billing & Payments", icon: "credit-card", count: 3 },
  ];

  const faqs = [
    { id: 1, category: "getting-started", question: "How do I register my restaurant on BhojanQR?", answer: "Click on 'Admin Login' and select 'Register New Restaurant'. Fill in your details, upload your menu, and complete verification." },
    { id: 2, category: "getting-started", question: "How long does verification take?", answer: "Restaurant verification typically takes 24-48 hours. We'll notify you via email." },
    { id: 3, category: "for-restaurants", question: "How do I generate QR codes?", answer: "Go to the 'QR Codes' section in your dashboard. Click 'Generate New QR Code', enter the table number, and download." },
    { id: 4, category: "for-customers", question: "How do I scan the QR code?", answer: "Use your smartphone camera. Point it at the QR code, and you'll be redirected to the digital menu." },
    { id: 5, category: "qr-codes", question: "What if I lose my QR code?", answer: "You can regenerate QR codes from your dashboard anytime." },
    { id: 6, category: "billing", question: "What payment methods do you accept?", answer: "We accept credit/debit cards, UPI, net banking, and wallets." },
  ];

  const filteredFaqs = activeCategory === "all" ? faqs : faqs.filter((faq) => faq.category === activeCategory);

  return (
    <LinearGradient colors={["#f0fdf4", "#fff7ed", "#f0fdf4"]} style={styles.globalGradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* HERO SECTION & SEARCH */}
            <View style={styles.heroSection}>
              <View style={[styles.topBadge, styles.premiumShadow]}>
                <FontAwesome5 name="headset" size={12} color="#ea580c" style={{ marginRight: 6 }} />
                <Text style={styles.badgeText}>24/7 Support Available</Text>
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.titleGreen}>How Can We</Text>
                <Text style={styles.titleOrange}>Help?</Text>
                <View style={styles.titleUnderline} />
              </View>

              <View style={[styles.searchContainer, styles.premiumShadow]}>
                <FontAwesome5 name="search" size={16} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search articles, FAQs..."
                  placeholderTextColor="#9ca3af"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* CATEGORIES */}
            <View style={styles.sectionContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}>
                {helpCategories.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setActiveCategory(cat.id)}
                      style={[styles.categoryBtn, isActive ? styles.categoryActive : styles.categoryInactive, styles.premiumShadow]}
                    >
                      <FontAwesome5 name={cat.icon} size={20} color={isActive ? "#ffffff" : "#16a34a"} style={{ marginBottom: 8 }} />
                      <Text style={[styles.categoryName, isActive && { color: "#ffffff" }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* FAQs */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderCenter}>
                <Text style={styles.sectionHeader}>Frequently Asked <Text style={{ color: '#ea580c' }}>Questions</Text></Text>
              </View>

              <View style={{ paddingHorizontal: 24 }}>
                {filteredFaqs.map((faq) => {
                  const isOpen = activeFaq === faq.id;
                  return (
                    <View key={faq.id} style={[styles.faqCard, styles.premiumShadow]}>
                      <TouchableOpacity
                        style={styles.faqHeader}
                        onPress={() => setActiveFaq(isOpen ? null : faq.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                        <FontAwesome5 name={isOpen ? "chevron-up" : "chevron-down"} size={14} color="#16a34a" />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={styles.faqAnswerContainer}>
                          <Text style={styles.faqAnswer}>{faq.answer}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* STILL NEED HELP CTA */}
            <View style={styles.ctaContainer}>
              <View style={[styles.supportCard, styles.premiumShadow]}>
                <View style={styles.supportIconBox}>
                  <FontAwesome5 name="exclamation-circle" size={32} color="#16a34a" />
                </View>
                <Text style={styles.supportTitle}>Still Need Help?</Text>
                <Text style={styles.supportDesc}>Our support team is here to help you 24/7.</Text>
                <TouchableOpacity style={styles.supportBtn}>
                  <FontAwesome5 name="comment-dots" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.supportBtnText}>Contact Support</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Help;

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
  sectionContainer: { marginBottom: 32 },
  sectionHeaderCenter: { alignItems: 'center', marginBottom: 24 },
  sectionHeader: { fontSize: 26, fontWeight: '900', color: '#166534', letterSpacing: -0.5 },
  ctaContainer: { paddingHorizontal: 24, marginTop: 16 },
  ctaBanner: { borderRadius: 24, padding: 32, alignItems: 'center' },
  ctaTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 8 },
  ctaSubtext: { fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 24 },
  ctaButton: { backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 100 },
  ctaButtonText: { color: '#166534', fontSize: 16, fontWeight: '800' },
});