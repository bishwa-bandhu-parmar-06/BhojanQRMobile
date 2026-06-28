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
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { loginSuccess } from '../../Features/AuthSlice';
import { registerCustomer, loginCustomer, googleAuthCustomer } from '../../API/customerApi';
import { setToken } from '../../utils/tokenStorage';

const CustomerAuth = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });

  // Same success handling for password and Google sign-in/up - both land the
  // customer on their dashboard with a stored token and Redux session.
  const completeAuth = (responseData: any, successMessage: string) => {
    if (responseData.token) {
      setToken(responseData.token);
    }
    if (responseData.data) {
      dispatch(loginSuccess({ user: responseData.data }));
    }
    Toast.show({ type: 'success', text1: successMessage });
    navigation.navigate('CustomerDashboard');
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // User backed out of the Google chooser - not an error.
        return;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        Toast.show({ type: 'error', text1: 'Could not get a Google credential. Please try again.' });
        return;
      }

      const apiResponse = await googleAuthCustomer(idToken);
      if (apiResponse.data.success) {
        completeAuth(apiResponse.data, 'Welcome!');
      }
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.IN_PROGRESS) {
          // Another sign-in flow is already running - ignore.
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Toast.show({ type: 'error', text1: 'Google Play Services is not available on this device' });
        } else {
          Toast.show({ type: 'error', text1: 'Google sign-in failed', text2: error.message });
        }
      } else {
        const errorMsg = error.response?.data?.message || 'Google sign-in failed';
        Toast.show({ type: 'error', text1: 'Error', text2: errorMsg });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.email || !form.password) {
      Toast.show({ type: 'error', text1: 'Email and Password are required' });
      return false;
    }
    if (!isLogin && !form.name) {
      Toast.show({ type: 'error', text1: 'Please enter your name' });
      return false;
    }
    if (form.password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = isLogin
        ? await loginCustomer({ email: form.email, password: form.password })
        : await registerCustomer(form);

      if (response.data.success) {
        completeAuth(response.data, isLogin ? 'Welcome back!' : 'Account created!');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Authentication failed';
      Toast.show({ type: 'error', text1: 'Error', text2: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setForm({ name: '', email: '', mobile: '', password: '' });
    setShowPassword(false);
  };

  return (
    <LinearGradient colors={["#f0fdf4", "#fff7ed", "#f0fdf4"]} style={styles.globalGradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="user-circle" size={32} color="#ea580c" />
              </View>
              <Text style={styles.mainTitle}>BhojanQR</Text>
              <Text style={styles.subTitle}>
                Track your orders, bills, and spending across every BhojanQR restaurant.
              </Text>
            </View>

            <View style={styles.authCard}>
              <Text style={styles.cardTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
              <Text style={styles.cardSubtitle}>
                {isLogin ? 'Sign in to your customer account' : 'Sign up to save your orders'}
              </Text>

              <View style={styles.formContainer}>
                {!isLogin && (
                  <View style={styles.inputWrapper}>
                    <FontAwesome5 name="user" size={16} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Full Name *"
                      placeholderTextColor="#9ca3af"
                      value={form.name}
                      onChangeText={val => handleChange('name', val)}
                    />
                  </View>
                )}

                <View style={styles.inputWrapper}>
                  <FontAwesome5 name="envelope" size={16} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email Address *"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={val => handleChange('email', val)}
                  />
                </View>

                {!isLogin && (
                  <View style={styles.inputWrapper}>
                    <FontAwesome5 name="phone-alt" size={16} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Mobile Number (optional)"
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                      value={form.mobile}
                      onChangeText={val => handleChange('mobile', val)}
                    />
                  </View>
                )}

                <View style={styles.inputWrapper}>
                  <FontAwesome5 name="lock" size={16} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Password *"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={form.password}
                    onChangeText={val => handleChange('password', val)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={16} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                {isLogin && (
                  <TouchableOpacity
                    style={styles.forgotLink}
                    onPress={() => navigation.navigate('ForgotPassword', { role: 'customer' })}
                  >
                    <Text style={styles.forgotLinkText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.googleButton, isGoogleLoading && styles.submitDisabled]}
                  onPress={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  activeOpacity={0.8}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator color="#ea580c" size="small" />
                  ) : (
                    <>
                      <FontAwesome5 name="google" size={16} color="#ea580c" />
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.toggleContainer}>
                <Text style={styles.toggleText}>
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}
                </Text>
                <TouchableOpacity onPress={toggleMode}>
                  <Text style={styles.toggleTextBold}>
                    {isLogin ? ' Sign up' : ' Sign in instead'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  globalGradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  headerSection: { alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 72, height: 72, backgroundColor: '#ffedd5', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  mainTitle: { fontSize: 28, fontWeight: '900', color: '#ea580c', marginBottom: 8 },
  subTitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  authCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  formContainer: { gap: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, height: 52, paddingHorizontal: 16 },
  inputIcon: { width: 24 },
  textInput: { flex: 1, fontSize: 15, color: '#1f2937', fontWeight: '500', height: '100%' },
  eyeIcon: { padding: 8 },
  forgotLink: { alignSelf: 'flex-end', marginTop: -4 },
  forgotLinkText: { fontSize: 13, fontWeight: '700', color: '#ea580c' },
  submitButton: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: '#ea580c' },
  submitDisabled: { backgroundColor: '#9ca3af' },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16, marginTop: 16, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#fed7aa' },
  googleButtonText: { color: '#1f2937', fontSize: 15, fontWeight: '700' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  toggleText: { fontSize: 14, color: '#6b7280' },
  toggleTextBold: { fontSize: 14, fontWeight: 'bold', color: '#ea580c' },
});

export default CustomerAuth;
