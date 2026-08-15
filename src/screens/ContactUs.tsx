import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Toast from 'react-native-toast-message';

import { submitContactForm } from '../API/contactApi';
import { FOUNDER, CONTACT_LINKS, BUSINESS_HOURS } from '../config/socialLinks';

const FAQ_QUICK_LINKS = [
  'How do I register my restaurant?',
  'How do customers order via QR?',
  'What payment methods are supported?',
  "My QR code won't scan - help",
];

const ContactUs = () => {
  const navigation = useNavigation<any>();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.mobile.trim() || !formData.message.trim()) {
      Toast.show({ type: 'error', text1: 'Please fill in name, email, phone and message' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await submitContactForm(formData);
      if (response.data.success) {
        Toast.show({ type: 'success', text1: "Message sent! We'll get back to you soon." });
        setFormData({ name: '', email: '', mobile: '', subject: '', message: '' });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Something went wrong' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#f0fdf4', '#fff7ed', '#f0fdf4']} style={styles.globalGradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>

            <View style={styles.heroSection}>
              <View style={styles.titleContainer}>
                <Text style={styles.titleGreen}>Contact</Text>
                <Text style={styles.titleOrange}>Bhojan<Text style={{ color: '#166534' }}>QR</Text></Text>
                <View style={styles.titleUnderline} />
              </View>
              <Text style={styles.heroSubtext}>We're here to help restaurant owners and customers.</Text>
            </View>

            {/* FORM */}
            <View style={styles.sectionContainer}>
              <View style={[styles.formCard, styles.premiumShadow]}>
                <Text style={styles.formTitle}>Send a Message</Text>

                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                  style={styles.input}
                  value={formData.name}
                  onChangeText={v => handleChange('name', v)}
                  placeholder="Your name"
                  placeholderTextColor="#9ca3af"
                />

                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                  style={styles.input}
                  value={formData.email}
                  onChangeText={v => handleChange('email', v)}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                  style={styles.input}
                  value={formData.mobile}
                  onChangeText={v => handleChange('mobile', v)}
                  placeholder="Your phone number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />

                <Text style={styles.fieldLabel}>Subject</Text>
                <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                  style={styles.input}
                  value={formData.subject}
                  onChangeText={v => handleChange('subject', v)}
                  placeholder="What's this about?"
                  placeholderTextColor="#9ca3af"
                />

                <Text style={styles.fieldLabel}>Message</Text>
                <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                  style={[styles.input, styles.textArea]}
                  value={formData.message}
                  onChangeText={v => handleChange('message', v)}
                  placeholder="Tell us more..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={5}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <FontAwesome5 name="paper-plane" size={14} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>Send Message</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* FOUNDER CONTACT */}
            <View style={styles.sectionContainer}>
              <View style={[styles.card, styles.premiumShadow]}>
                <Text style={styles.cardTitle}>Talk to the Founder</Text>
                <Text style={styles.cardSubtitle}>{FOUNDER.name} · {FOUNDER.role}</Text>

                <TouchableOpacity
                  style={[styles.contactRow, { backgroundColor: '#ffedd5' }]}
                  onPress={() => Linking.openURL(CONTACT_LINKS.emailWithSubject('Inquiry from BhojanQR App'))}
                >
                  <FontAwesome5 name="envelope" size={14} color="#ea580c" />
                  <Text style={[styles.contactRowText, { color: '#ea580c' }]}>Email Founder</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.contactRow, { backgroundColor: '#dcfce7' }]}
                  onPress={() => Linking.openURL(CONTACT_LINKS.phone)}
                >
                  <FontAwesome5 name="phone-alt" size={14} color="#16a34a" />
                  <Text style={[styles.contactRowText, { color: '#16a34a' }]}>Call Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.contactRow, { backgroundColor: '#dcfce7' }]}
                  onPress={() => Linking.openURL(CONTACT_LINKS.whatsapp)}
                >
                  <FontAwesome5 name="whatsapp" size={16} color="#16a34a" />
                  <Text style={[styles.contactRowText, { color: '#16a34a' }]}>WhatsApp Support</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <FontAwesome5 name="envelope" size={12} color="#9ca3af" />
                  <Text style={styles.infoText}>{FOUNDER.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <FontAwesome5 name="phone" size={12} color="#9ca3af" />
                  <Text style={styles.infoText}>{FOUNDER.phone}</Text>
                </View>
                <View style={styles.infoRow}>
                  <FontAwesome5 name="phone" size={12} color="#9ca3af" />
                  <Text style={styles.infoText}>{FOUNDER.phoneAlt} <Text style={styles.infoTextMuted}>(alternate)</Text></Text>
                </View>
              </View>
            </View>

            {/* BUSINESS HOURS */}
            <View style={styles.sectionContainer}>
              <View style={[styles.card, styles.premiumShadow]}>
                <View style={styles.cardHeaderRow}>
                  <FontAwesome5 name="clock" size={16} color="#ea580c" />
                  <Text style={styles.cardTitle}>Business Hours</Text>
                </View>
                {BUSINESS_HOURS.map(slot => (
                  <View key={slot.day} style={styles.hoursRow}>
                    <Text style={styles.hoursDay}>{slot.day}</Text>
                    <Text style={styles.hoursValue}>{slot.hours}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* FAQ QUICK LINKS */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderCenter}>
                <Text style={styles.sectionHeader}>Quick <Text style={{ color: '#ea580c' }}>Answers</Text></Text>
              </View>
              <View style={{ paddingHorizontal: 24 }}>
                {FAQ_QUICK_LINKS.map(label => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.faqLinkRow, styles.premiumShadow]}
                    onPress={() => navigation.navigate('Help')}
                  >
                    <Text style={styles.faqLinkText}>{label}</Text>
                    <FontAwesome5 name="chevron-right" size={12} color="#ea580c" />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.visitHelpBtn} onPress={() => navigation.navigate('Help')}>
                  <Text style={styles.visitHelpText}>Visit full Help Center</Text>
                  <FontAwesome5 name="chevron-right" size={12} color="#ea580c" />
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ContactUs;

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
  titleContainer: { alignItems: 'center', marginBottom: 16 },
  titleGreen: { fontSize: 36, fontWeight: '900', color: '#166534', marginBottom: -4, letterSpacing: -1 },
  titleOrange: { fontSize: 36, fontWeight: '900', color: '#ea580c', letterSpacing: -1 },
  titleUnderline: { height: 4, width: 120, backgroundColor: '#ea580c', borderRadius: 4, marginTop: 12 },
  heroSubtext: { fontSize: 15, color: '#4b5563', fontWeight: '500', textAlign: 'center', marginTop: 8 },

  sectionContainer: { marginBottom: 24, paddingHorizontal: 24 },
  sectionHeaderCenter: { alignItems: 'center', marginBottom: 20 },
  sectionHeader: { fontSize: 24, fontWeight: '900', color: '#166534', letterSpacing: -0.5 },

  formCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24 },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#166534', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 14, backgroundColor: '#f9fafb', color: '#1f2937' },
  textArea: { height: 120, paddingTop: 12, textAlignVertical: 'top' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ea580c', height: 52, borderRadius: 100, marginTop: 20 },
  submitBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },

  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#166534' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 16 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, marginBottom: 10 },
  contactRowText: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 13, color: '#4b5563', fontWeight: '500' },
  infoTextMuted: { color: '#9ca3af', fontSize: 11 },

  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  hoursDay: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  hoursValue: { fontSize: 13, color: '#1f2937', fontWeight: '700' },

  faqLinkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 10 },
  faqLinkText: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1, paddingRight: 12 },
  visitHelpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  visitHelpText: { fontSize: 14, fontWeight: '800', color: '#ea580c' },
});
