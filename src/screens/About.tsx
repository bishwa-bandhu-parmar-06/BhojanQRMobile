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
import { useNavigation } from "@react-navigation/native";

const AboutPage = () => {
  const navigation = useNavigation<any>();

  const features = [
    { icon: "qrcode", title: "QR Code Gen", description: "Generate unique QR codes for each table instantly." },
    { icon: "book-open", title: "Digital Menu", description: "Upload and manage your restaurant menu digitally." },
    { icon: "mobile-alt", title: "Scan & Order", description: "Customers order directly from their smartphones." },
    { icon: "users", title: "Table Management", description: "Efficiently manage tables and track orders." },
  ];

  const stats = [
    { icon: "award", value: "50+", label: "Restaurants" },
    { icon: "user-friends", value: "10k+", label: "Happy Customers" },
    { icon: "clock", value: "24/7", label: "Support" },
    { icon: "shield-alt", value: "100%", label: "Secure" },
  ];

  const milestones = [
    { year: "2023", event: "BhojanQR Founded", description: "Started with a vision to revolutionize dining." },
    { year: "2024", event: "First 10 Restaurants", description: "Reached milestone of 10 restaurant partners." },
    { year: "2025", event: "10K Customers", description: "Served over 10,000 happy customers." },
    { year: "2026", event: "Pan-India Expansion", description: "Expanded services across major cities." },
  ];

  const values = [
    { icon: "heart", title: "Customer First", description: "We prioritize customer satisfaction in everything we do." },
    { icon: "chart-line", title: "Innovation", description: "Constantly evolving to bring the best technology." },
    { icon: "shield-alt", title: "Trust & Security", description: "Your data security is our top priority." },
    { icon: "globe", title: "Accessibility", description: "Making dining accessible for everyone." },
  ];

  return (
    <LinearGradient
      colors={["#f0fdf4", "#fff7ed", "#f0fdf4"]}
      style={styles.globalGradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* HERO SECTION */}
          <View style={styles.heroSection}>
            <View style={[styles.topBadge, styles.premiumShadow]}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>About BhojanQR</Text>
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.titleGreen}>Revolutionizing</Text>
              <Text style={styles.titleOrange}>Dining</Text>
              <View style={styles.titleUnderline} />
            </View>

            <Text style={styles.heroSubtext}>
              A digital solution that connects restaurants with customers through seamless QR code technology.
            </Text>
          </View>

          {/* MISSION STATEMENT BANNER */}
          <LinearGradient
            colors={["#16a34a", "#ea580c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.missionBanner, styles.premiumShadow]}
          >
            <Text style={styles.missionTitle}>Our Mission</Text>
            <Text style={styles.missionText}>
              To transform the traditional dining experience by providing restaurants with a seamless digital platform that enhances customer convenience and streamlines operations.
            </Text>
          </LinearGradient>

          {/* STATS SECTION (2x2 Grid) */}
          <View style={styles.sectionContainer}>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <View key={index} style={[styles.statCard, styles.premiumShadow]}>
                  <FontAwesome5 name={stat.icon} size={24} color="#16a34a" style={styles.statIcon} />
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* CORE VALUES SECTION */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderCenter}>
              <Text style={styles.sectionHeader}>Our Core <Text style={{ color: '#ea580c' }}>Values</Text></Text>
              <Text style={styles.sectionSubtext}>The principles that guide everything we do</Text>
            </View>

            <View style={styles.valuesGrid}>
              {values.map((value, index) => (
                <View key={index} style={[styles.valueCard, styles.premiumShadow]}>
                  <View style={styles.valueIconBox}>
                    <FontAwesome5 name={value.icon} size={20} color="#16a34a" />
                  </View>
                  <Text style={styles.valueTitle}>{value.title}</Text>
                  <Text style={styles.valueDescription}>{value.description}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* JOURNEY TIMELINE */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderCenter}>
              <Text style={styles.sectionHeader}>Our <Text style={{ color: '#ea580c' }}>Journey</Text></Text>
              <Text style={styles.sectionSubtext}>The milestones that shaped BhojanQR</Text>
            </View>

            <View style={styles.timelineContainer}>
              <View style={styles.timelineLine} />
              {milestones.map((item, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={[styles.timelineCard, styles.premiumShadow]}>
                    <View style={styles.timelineYearBadge}>
                      <Text style={styles.timelineYearText}>{item.year}</Text>
                    </View>
                    <Text style={styles.timelineTitle}>{item.event}</Text>
                    <Text style={styles.timelineDesc}>{item.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* HOW IT WORKS (Split Cards) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderCenter}>
              <Text style={styles.sectionHeader}>How <Text style={{ color: '#ea580c' }}>BhojanQR</Text> Works</Text>
              <Text style={styles.sectionSubtext}>Simple process for everyone</Text>
            </View>

            {/* Restaurant Card */}
            <LinearGradient
              colors={["#15803d", "#166534"]}
              style={[styles.processCard, styles.premiumShadow]}
            >
              <View style={styles.processHeaderRow}>
                <View style={styles.processIconWrapper}>
                  <FontAwesome5 name="store" size={24} color="#ffffff" />
                </View>
                <View style={styles.processNumberCircle}>
                  <Text style={styles.processNumberTextGreen}>1</Text>
                </View>
              </View>
              <Text style={styles.processTitle}>For Restaurants</Text>
              {[
                "Register your restaurant on BhojanQR",
                "Upload and list your complete menu",
                "Generate unique QR codes for each table",
                "Receive and manage orders in real-time",
              ].map((item, idx) => (
                <View key={idx} style={styles.processListItem}>
                  <FontAwesome5 name="check" size={12} color="#ffffff" style={styles.processCheck} />
                  <Text style={styles.processListText}>{item}</Text>
                </View>
              ))}
            </LinearGradient>

            {/* Customer Card */}
            <LinearGradient
              colors={["#ea580c", "#c2410c"]}
              style={[styles.processCard, styles.premiumShadow, { marginTop: 24 }]}
            >
              <View style={styles.processHeaderRow}>
                <View style={styles.processIconWrapper}>
                  <FontAwesome5 name="users" size={24} color="#ffffff" />
                </View>
                <View style={styles.processNumberCircle}>
                  <Text style={styles.processNumberTextOrange}>2</Text>
                </View>
              </View>
              <Text style={styles.processTitle}>For Customers</Text>
              {[
                "Scan the QR code on your table",
                "Browse the digital menu instantly",
                "Select dishes and place your order",
                "Order directly from your table",
              ].map((item, idx) => (
                <View key={idx} style={styles.processListItem}>
                  <FontAwesome5 name="check" size={12} color="#ffffff" style={styles.processCheck} />
                  <Text style={styles.processListText}>{item}</Text>
                </View>
              ))}
            </LinearGradient>
          </View>

          {/* CTA SECTION */}
          <View style={styles.ctaContainer}>
            <LinearGradient
              colors={["#16a34a", "#ea580c"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.ctaBanner, styles.premiumShadow]}
            >
              <View style={styles.ctaTextContainer}>
                <Text style={styles.ctaTitle}>Ready to get started?</Text>
                <Text style={styles.ctaSubtext}>Join BhojanQR today and transform your restaurant</Text>
              </View>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => navigation.navigate("Login/Signup")}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaButtonText}>Get Started Now</Text>
                <FontAwesome5 name="bolt" size={14} color="#166534" />
              </TouchableOpacity>
            </LinearGradient>
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  // Global
  globalGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  premiumShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 5 },
    }),
  },

  // Hero Section
  heroSection: {
    paddingTop: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  topBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleGreen: {
    fontSize: 40,
    fontWeight: '900',
    color: '#166534',
    marginBottom: -4,
    letterSpacing: -1,
  },
  titleOrange: {
    fontSize: 40,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: -1,
  },
  titleUnderline: {
    height: 4,
    width: 120,
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
    paddingHorizontal: 10,
  },

  // Mission Banner
  missionBanner: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 40,
  },
  missionTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 12,
  },
  missionText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },

  // Shared Section Styles
  sectionContainer: {
    marginBottom: 48,
    paddingHorizontal: 24,
  },
  sectionHeaderCenter: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 28,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  sectionSubtext: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#16a34a',
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#166534',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Core Values Grid
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  valueCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
  },
  valueIconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 8,
  },
  valueDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Timeline
  timelineContainer: {
    paddingLeft: 16,
  },
  timelineLine: {
    position: 'absolute',
    left: 23,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ea580c',
    opacity: 0.3,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineDot: {
    width: 16,
    height: 16,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#16a34a',
    borderRadius: 8,
    marginTop: 24,
    marginRight: 16,
    zIndex: 1,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
  },
  timelineYearBadge: {
    backgroundColor: '#dcfce7',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 12,
  },
  timelineYearText: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 12,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  timelineDesc: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },

  // How It Works Cards
  processCard: {
    padding: 32,
    borderRadius: 32,
  },
  processHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  processIconWrapper: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  processNumberCircle: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processNumberTextGreen: {
    color: '#166534',
    fontSize: 20,
    fontWeight: '900',
  },
  processNumberTextOrange: {
    color: '#ea580c',
    fontSize: 20,
    fontWeight: '900',
  },
  processTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 20,
  },
  processListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  processCheck: {
    marginTop: 4,
    marginRight: 12,
  },
  processListText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    flex: 1,
  },

  // CTA Section
  ctaContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  ctaBanner: {
    borderRadius: 28,
    padding: 32,
  },
  ctaTextContainer: {
    marginBottom: 24,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
  },
  ctaSubtext: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 100,
  },
  ctaButtonText: {
    color: '#166534',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
  },
});

export default AboutPage;