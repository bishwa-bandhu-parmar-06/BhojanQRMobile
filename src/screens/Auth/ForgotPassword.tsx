import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Toast from 'react-native-toast-message';

import { forgotPasswordRestaurant } from '../../API/restaurentApi';
import { forgotPasswordAdmin } from '../../API/adminApi';
import { navigateToScreen } from '../../utils/navigation';

// Customer is deliberately absent: the app no longer has a customer login to
// send anyone back to, so a customer reset has to be done on the website.
type Role = 'restaurant' | 'admin';

const ROLE_COPY: Record<Role, { title: string; loginScreen: string }> = {
  restaurant: { title: 'Restaurant Partner', loginScreen: 'Login/Signup' },
  admin: { title: 'Admin Account', loginScreen: 'AdminAuth' },
};

const sendForgotPassword = (role: Role, email: string) => {
  if (role === 'restaurant') return forgotPasswordRestaurant(email);
  return forgotPasswordAdmin(email);
};

const ForgotPassword = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const role: Role = route.params?.role || 'restaurant';
  const copy = ROLE_COPY[role];

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your email address' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await sendForgotPassword(role, email.trim());
      if (response.data?.success) {
        setSent(true);
        Toast.show({
          type: 'success',
          text1: 'Reset link sent',
          text2: 'Check your email for the password reset link.',
        });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Could not send reset email';
      Toast.show({ type: 'error', text1: 'Error', text2: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#f0fdf4', '#fff7ed', '#f0fdf4']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <FontAwesome5 name="arrow-left" size={16} color="#4b5563" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <FontAwesome5 name="key" size={28} color="#ea580c" />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              {copy.title} · Enter the email on your account and we'll send you a reset link.
            </Text>

            <View style={styles.card}>
              {sent ? (
                <View style={styles.successBox}>
                  <FontAwesome5 name="envelope-open-text" size={32} color="#16a34a" style={{ marginBottom: 12 }} />
                  <Text style={styles.successTitle}>Check your inbox</Text>
                  <Text style={styles.successText}>
                    We've sent a password reset link to {email}. Open the email, copy the reset
                    token (or tap the link if you're on your phone), then continue below.
                  </Text>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => navigation.navigate('ResetPassword', { role })}
                  >
                    <Text style={styles.primaryBtnText}>I have my reset token</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSend} disabled={isLoading}>
                    <Text style={styles.resendText}>Didn't get it? Resend email</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.inputWrapper}>
                    <FontAwesome5 name="envelope" size={16} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                      style={styles.input}
                      placeholder="Email Address"
                      placeholderTextColor="#9ca3af"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                    onPress={handleSend}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryLink}
                    onPress={() => navigation.navigate('ResetPassword', { role })}
                  >
                    <Text style={styles.secondaryLinkText}>Already have a reset token?</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity onPress={() => navigateToScreen(navigation, copy.loginScreen)}>
              <Text style={styles.loginLink}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 16 },
  backText: { color: '#4b5563', fontWeight: '600' },
  iconContainer: { width: 64, height: 64, backgroundColor: '#ffedd5', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 12, marginBottom: 24, lineHeight: 20 },
  card: { width: '100%', backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, height: 52, paddingHorizontal: 16, marginBottom: 16 },
  inputIcon: { width: 24 },
  input: { flex: 1, fontSize: 15, color: '#1f2937', fontWeight: '500', height: '100%' },
  primaryBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ea580c' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  secondaryLink: { marginTop: 16, alignItems: 'center' },
  secondaryLinkText: { color: '#ea580c', fontSize: 13, fontWeight: '700' },
  successBox: { alignItems: 'center' },
  successTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  successText: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  resendText: { color: '#6b7280', fontSize: 13, fontWeight: '600', marginTop: 16, textDecorationLine: 'underline' },
  loginLink: { marginTop: 24, color: '#16a34a', fontSize: 14, fontWeight: 'bold' },
});

export default ForgotPassword;
