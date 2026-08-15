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

import { loginSuccess } from '../../Features/AuthSlice';
import { loginStaff } from '../../API/staffApi';
import { setToken } from '../../utils/tokenStorage';
import { navigateToScreen } from '../../utils/navigation';

// Standalone login screen for staff accounts (managers/waiters/chefs)
// created by the restaurant owner from the Staff Management tab.
// Deliberately separate from RestaurentAuth.tsx (the owner's own login),
// mirroring the website's pages/Resaturent/StaffAuth.jsx.
const StaffAuth = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Toast.show({ type: 'error', text1: 'Email and Password are required' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await loginStaff({ email: email.trim(), password });
      if (response.data.success) {
        if (response.data.token) {
          await setToken(response.data.token);
        }
        const userData = response.data.data;
        if (userData) {
          dispatch(loginSuccess({ user: userData }));
        }
        Toast.show({ type: 'success', text1: 'Welcome back!' });
        // reset rather than navigateToScreen: StaffAuth is a root-stack
        // screen, so navigating would leave it underneath and the back
        // gesture would return signed-in staff to the login form.
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'RestaurantDashboard' } }],
        });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Invalid credentials';
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
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="user-tie" size={28} color="#ea580c" />
              </View>
              <Text style={styles.mainTitle}>Staff Login</Text>
              <Text style={styles.subTitle}>Sign in with the account your manager set up.</Text>
            </View>

            <View style={styles.authCard}>
              <View style={styles.formContainer}>
                <View style={styles.inputWrapper}>
                  <FontAwesome5 name="envelope" size={16} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="you@example.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <FontAwesome5 name="lock" size={16} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={16} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.toggleContainer}>
                <Text style={styles.toggleText}>Restaurant owner?</Text>
                <TouchableOpacity onPress={() => navigateToScreen(navigation, 'Login/Signup')}>
                  <Text style={styles.toggleTextBold}> Sign in here</Text>
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
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  headerSection: { alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 72, height: 72, backgroundColor: '#ffedd5', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  mainTitle: { fontSize: 28, fontWeight: '900', color: '#ea580c', marginBottom: 8 },
  subTitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  authCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  formContainer: { gap: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, height: 52, paddingHorizontal: 16 },
  inputIcon: { width: 24 },
  textInput: { flex: 1, fontSize: 15, color: '#1f2937', fontWeight: '500', height: '100%' },
  eyeIcon: { padding: 8 },
  submitButton: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: '#ea580c' },
  submitDisabled: { backgroundColor: '#9ca3af' },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  toggleText: { fontSize: 14, color: '#6b7280' },
  toggleTextBold: { fontSize: 14, fontWeight: 'bold', color: '#ea580c' },
});

export default StaffAuth;
