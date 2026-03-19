import React from "react";
import { View, Text, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";

const Footer = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.footerContainer}>
      {/* Top Gradient Accent Line */}
      <LinearGradient
        colors={["#fb923c", "#22c55e", "#fb923c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topGradientLine}
      />

      <View style={styles.contentContainer}>
        
        {/* Brand Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.brandContainer}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.8}
          >
            <View style={styles.brandIconBox}>
              <FontAwesome5 name="store" size={16} color="#ea580c" />
            </View>
            <Text style={styles.brandText}>
              Bhojan<Text style={{ color: '#16a34a' }}>QR</Text>
            </Text>
          </TouchableOpacity>
          <Text style={styles.brandDescription}>
            Revolutionizing the dining experience with smart, contactless digital menus and seamless ordering for restaurants and customers alike.
          </Text>
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("Home")}>
            <View style={styles.linkDotOrange} />
            <Text style={styles.linkText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("TrackOrder")}>
            <View style={styles.linkDotOrange} />
            <Text style={styles.linkText}>Track Order</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("Login/Signup")}>
            <View style={styles.linkDotOrange} />
            <Text style={styles.linkText}>Partner with Us</Text>
          </TouchableOpacity>
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("About")}>
            <View style={styles.linkDotGreen} />
            <Text style={styles.linkText}>About Us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("Help")}>
            <View style={styles.linkDotGreen} />
            <Text style={styles.linkText}>Help & FAQs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("PrivacyPolicy")}>
            <View style={styles.linkDotGreen} />
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          
          <TouchableOpacity 
            style={styles.contactRow}
            onPress={() => Linking.openURL("mailto:bhojanqr@gmail.com")}
          >
            <FontAwesome5 name="envelope" size={14} color="#fb923c" style={styles.contactIcon} />
            <Text style={styles.contactText}>bhojanqr@gmail.com</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactRow}
            onPress={() => Linking.openURL("tel:+919142364660")}
          >
            <FontAwesome5 name="phone-alt" size={14} color="#22c55e" style={styles.contactIcon} />
            <Text style={styles.contactText}>+91 91423 64660</Text>
          </TouchableOpacity>

          <View style={styles.contactRow}>
            <FontAwesome5 name="map-marker-alt" size={14} color="#fb923c" style={styles.contactIcon} />
            <Text style={styles.contactText}>Gaya, Bihar, India</Text>
          </View>
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} <Text style={styles.copyrightBold}>BhojanQR</Text>. All rights reserved.
          </Text>

          <View style={styles.madeWithContainer}>
            <Text style={styles.madeWithText}>Built with</Text>
            <FontAwesome5 name="heart" size={12} color="#ef4444" solid style={{ marginHorizontal: 6 }} />
            <Text style={styles.madeWithText}>by</Text>
            <Text style={styles.creatorName}> Bishwa Bandhu Parmar</Text>
          </View>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: '#ffffff',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  topGradientLine: {
    height: 4,
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandIconBox: {
    padding: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    marginRight: 10,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: -0.5,
  },
  brandDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  linkDotOrange: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fdba74',
    marginRight: 12,
  },
  linkDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#86efac',
    marginRight: 12,
  },
  linkText: {
    fontSize: 15,
    color: '#4b5563',
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactIcon: {
    width: 20,
    textAlign: 'center',
    marginRight: 12,
  },
  contactText: {
    fontSize: 15,
    color: '#4b5563',
    fontWeight: '500',
  },
  bottomBar: {
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  copyrightBold: {
    fontWeight: 'bold',
    color: '#374151',
  },
  madeWithContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  madeWithText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  creatorName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ea580c',
  },
});

export default Footer;