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
import { useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Toast from 'react-native-toast-message';

import { loginSuccess } from '../../Features/AuthSlice';
import { resetPasswordCustomer } from '../../API/customerApi';
import { resetPasswordRestaurant } from '../../API/restaurentApi';
import { resetPasswordAdmin } from '../../API/adminApi';
import { setToken } from '../../utils/tokenStorage';
import { navigateToScreen } from '../../utils/navigation';

type Role = 'customer' | 'restaurant' | 'admin';

const ROLE_COPY: Record<Role, { title: string; loginScreen: string; dashboard: string }> = {
  customer: { title: 'Customer Account', loginScreen: 'CustomerAuth', dashboard: 'CustomerDashboard' },
  restaurant: { title: 'Restaurant Partner', loginScreen: 'Login/Signup', dashboard: 'RestaurantDashboard' },
  admin: { title: 'Admin Account', loginScreen: 'AdminAuth', dashboard: 'AdminDashboard' },
};

const sendResetPassword = (role: Role, token: string, password: string) => {
  if (role === 'customer') return resetPasswordCustomer(token, password);
  if (role === 'restaurant') return resetPasswordRestaurant(token, password);
  return resetPasswordAdmin(token, password);
};

const ResetPassword = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const role: Role = route.params?.role || 'customer';
  const copy = ROLE_COPY[role];

  const [token, setToken_] = useState(route.params?.token || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!token.trim()) {
      Toast.show({ type: 'error', text1: 'Paste the reset token from your email' });
      return;
    }
    if (password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: "Passwords don't match" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await sendResetPassword(role, token.trim(), password);
      if (response.data?.success) {
        Toast.show({ type: 'success', text1: 'Password reset! You are now signed in.' });

        if (response.data.token) {
          await setToken(response.data.token);
          const userData =
            response.data.data || response.data.admin || response.data.restaurant || response.data.user;
          if (userData) {
            dispatch(loginSuccess({ user: userData }));
          }
          navigateToScreen(navigation, copy.dashboard);
        } else {
          navigateToScreen(navigation, copy.loginScreen);
        }
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || 'Reset link is invalid or has expired. Please request a new one.';
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
              <FontAwesome5 name="lock-open" size={28} color="#ea580c" />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {copy.title} · Paste the token from your reset email and choose a new password.
            </Text>

            <View style={styles.card}>
              <View style={styles.inputWrapper}>
                <FontAwesome5 name="key" size={16} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Reset Token (from email)"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  value={token}
                  onChangeText={setToken_}
                />
              </View>

              <View style={styles.inputWrapper}>
                <FontAwesome5 name="lock" size={16} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <FontAwesome5 name="lock" size={16} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                onPress={handleReset}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { role })}>
              <Text style={styles.loginLink}>Need a new reset link?</Text>
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
  eyeIcon: { padding: 8 },
  primaryBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ea580c' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  loginLink: { marginTop: 24, color: '#16a34a', fontSize: 14, fontWeight: 'bold' },
});

export default ResetPassword;
