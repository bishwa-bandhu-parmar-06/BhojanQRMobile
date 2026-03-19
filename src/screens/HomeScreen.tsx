import React, { useState , useCallback} from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  Dimensions, 
  StyleSheet,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";

import { useDispatch } from "react-redux";
import { clearCart } from "../Features/CartSlice";


import ContactForm from "../components/ContactForm";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.65;

const Home = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();


  const [showContactForm, setShowContactForm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(clearCart());
    }, [dispatch])
  );
  
  const steps = [
    { icon: "qrcode", title: "Scan", subtitle: "QR Code" },
    { icon: "book-open", title: "Browse", subtitle: "Digital Menu" },
    { icon: "concierge-bell", title: "Place", subtitle: "Your Order" },
    { icon: "utensils", title: "Enjoy", subtitle: "Fresh Food" },
  ];

  const features = [
    { icon: "users-slash", title: "No Queue", description: "Order right from your table without waiting.", lightColor: "#dcfce7", textColor: "#16a34a" },
    { icon: "shield-alt", title: "Easy & Safe", description: "100% cashless and secure ordering.", lightColor: "#ffedd5", textColor: "#ea580c" },
    { icon: "bolt", title: "Realtime", description: "Track your order status instantly.", lightColor: "#dcfce7", textColor: "#16a34a" },
    { icon: "wifi", title: "Offline-Ready", description: "Works perfectly without internet.", lightColor: "#ffedd5", textColor: "#ea580c" },
  ];

  const contactLinks = [
    { icon: "envelope", text: "bhojanqr@gmail.com", action: () => Linking.openURL("mailto:bhojanqr@gmail.com?subject=Inquiry about BhojanQR") },
    { icon: "phone-alt", text: "+91 - 9142364660", action: () => Linking.openURL("tel:+9142364660") },
    { icon: "info-circle", text: "About BhojanQR", action: () => navigation.navigate("About") },
    { icon: "user-shield", text: "Privacy Policy", action: () => navigation.navigate("PrivacyPolicy") },
    {
    icon: "question-circle",
    text: "Help",
    action: () => navigation.navigate("Help"),
  },
  ];

  return (
    <LinearGradient
      colors={["#f0fdf4", "#fff7ed", "#f0fdf4"]} 
      style={styles.globalGradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          
          {/* HERO SECTION */}
          <View style={styles.heroSection}>
            {/* Top Badge */}
            <View style={[styles.topBadge, styles.premiumShadow]}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>New: Contactless Dining</Text>
            </View>

            {/* Main Typography */}
            <View style={styles.titleContainer}>
              <Text style={styles.titleGreen}>Order Food</Text>
              <Text style={styles.titleOrange}>With QR Code</Text>
              <View style={styles.titleUnderline} />
            </View>

            {/* Subtext */}
            <Text style={styles.heroSubtext}>
              Scan the QR code to view our digital menu and place your order instantly.
            </Text>

            <View style={styles.heroTagsContainer}>
              <Text style={styles.heroTags}>No app needed</Text>
              <View style={styles.tagDot} />
              <Text style={styles.heroTags}>Contactless</Text>
              <View style={styles.tagDot} />
              <Text style={styles.heroTags}>Secure</Text>
            </View>

            {/* Stats Dashboard */}
            <View style={styles.statsWrapper}>
              <View style={styles.statColumn}>
                <Text style={styles.statValue}>500<Text style={styles.statPlus}>+</Text></Text>
                <Text style={styles.statLabel}>Happy{"\n"}Customers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumn}>
                <Text style={styles.statValue}>50<Text style={styles.statPlus}>+</Text></Text>
                <Text style={[styles.statLabel, { marginTop: 14 }]}>Menu Items</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumn}>
                <Text style={styles.statValue}>4.8</Text>
                <View style={styles.ratingRow}>
                  <FontAwesome5 name="star" size={10} color="#f59e0b" solid style={{ marginRight: 4 }} />
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.primaryButton, styles.buttonShadow]}
              onPress={() => navigation.navigate("Login/Signup")} // Updated Navigation
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <FontAwesome5 name="arrow-right" size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* FEATURES SECTION (Horizontal Snap Scroll) */}
          <View style={styles.sectionSpacing}>
            <View style={styles.sectionHeaderCenter}>
              <Text style={styles.sectionHeader}>Why Choose Us?</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollPadding}
              snapToInterval={CARD_WIDTH + 16} 
              decelerationRate="fast"
            >
              {features.map((feature: any, index: number) => (
                <View key={index} style={[styles.cardContainer, styles.premiumShadow, { width: CARD_WIDTH }]}>
                  <View style={[styles.iconBox, { backgroundColor: feature.lightColor }]}>
                    <FontAwesome5 name={feature.icon} size={24} color={feature.textColor} />
                  </View>
                  <Text style={styles.cardTitle}>{feature.title}</Text>
                  <Text style={styles.cardDescription}>{feature.description}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* HOW IT WORKS (Now Matches Horizontal Scroll) */}
          <View style={styles.sectionSpacing}>
            <View style={styles.sectionHeaderCenter}>
              <Text style={styles.processSubHeader}>Simple Process</Text>
              <Text style={styles.sectionHeader}>How It Works</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollPadding}
              snapToInterval={CARD_WIDTH + 16} 
              decelerationRate="fast"
            >
              {steps.map((step: any, index: number) => (
                <View key={index} style={[styles.cardContainer, styles.premiumShadow, { width: CARD_WIDTH }]}>
                  <View style={[styles.iconBox, { backgroundColor: index % 2 === 0 ? '#dcfce7' : '#ffedd5' }]}>
                    <FontAwesome5 name={step.icon} size={24} color={index % 2 === 0 ? '#16a34a' : '#ea580c'} />
                  </View>
                  <Text style={styles.cardTitle}>{step.title}</Text>
                  <Text style={styles.cardDescription}>{step.subtitle}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* CONTACT SECTION */}
          <View style={styles.contactWrapper}>
            <Text style={[styles.sectionHeader, { marginBottom: 20, textAlign: 'center' }]}>Get in Touch</Text>
            
            <View style={[styles.contactCard, styles.premiumShadow]}>
              {contactLinks.map((link: any, index: number) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={link.action}
                  style={[
                    styles.contactRow, 
                    index !== contactLinks.length - 1 && styles.contactBorder
                  ]}
                  activeOpacity={0.6}
                >
                  <View style={styles.contactIconSquare}>
                    <FontAwesome5 name={link.icon} size={16} color="#16a34a" />
                  </View>
                  <Text style={styles.contactText}>{link.text}</Text>
                  <FontAwesome5 name="chevron-right" size={14} color="#d1d5db" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Support Button */}
            <TouchableOpacity
              style={[styles.secondaryButton, styles.premiumShadow]}
              onPress={() => setShowContactForm(true)}
              activeOpacity={0.85}
            >
              <FontAwesome5 name="headset" size={16} color="white" />
              <Text style={styles.secondaryButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          {/* GLOBAL FOOTER */}
          <View style={styles.footerContainer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerLogoText}>Bhojan<Text style={{color: '#ea580c'}}>QR</Text></Text>
            <Text style={styles.footerText}>Made with ❤️ for modern dining</Text>
            <Text style={styles.footerCopyright}>© {new Date().getFullYear()} BhojanQR. All Rights Reserved.</Text>
          </View>

        </ScrollView>

        {/* MODAL */}
        {showContactForm && (
          <ContactForm onClose={() => setShowContactForm(false)} />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  // Global & Layout
  globalGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionSpacing: {
    marginTop: 40,
  },
  sectionHeaderCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: '900',
    color: '#166534', // Made headings match the green theme
    letterSpacing: -0.5,
  },
  processSubHeader: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  // Shadows
  premiumShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 5 },
    }),
  },
  buttonShadow: {
    ...Platform.select({
      ios: { shadowColor: '#ea580c', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8, shadowColor: '#ea580c' },
    }),
  },

  // Hero Section
  heroSection: {
    paddingTop: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  topBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 36,
  },
  badgeDot: {
    width: 8,
    height: 8,
    backgroundColor: '#16a34a',
    borderRadius: 4,
    marginRight: 10,
  },
  badgeText: {
    color: '#ea580c',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titleGreen: {
    fontSize: 42,
    fontWeight: '900',
    color: '#166534',
    marginBottom: -4,
    letterSpacing: -1,
  },
  titleOrange: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: -1,
  },
  titleUnderline: {
    height: 4,
    width: 140,
    backgroundColor: '#ea580c',
    borderRadius: 4,
    marginTop: 12,
  },
  heroSubtext: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  heroTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  heroTags: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tagDot: {
    width: 4,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    marginHorizontal: 8,
  },

  // Stats
  statsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 40,
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  statValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: -1,
  },
  statPlus: {
    fontSize: 24,
    color: '#16a34a',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  // Buttons
  primaryButton: {
    width: '100%',
    backgroundColor: '#ea580c',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 12,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginTop: 24,
    backgroundColor: '#16a34a',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
  },

  // Universal Horizontal Cards (Centered)
  horizontalScrollPadding: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 28,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', // Centers everything horizontally
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20, // Squircle shape
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Contact Links
  contactWrapper: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  contactBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactIconSquare: {
    backgroundColor: '#dcfce7',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contactText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },

  // Footer
  footerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  footerLine: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 24,
  },
  footerLogoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  footerCopyright: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '400',
  },
});

export default Home;