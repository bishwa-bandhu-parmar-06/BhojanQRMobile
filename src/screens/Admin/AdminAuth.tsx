import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  Phone,
  User,
  Lock,
  Shield,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react-native';

import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../Features/AuthSlice';

import { registerAdmin, loginAdmin } from '../../API/adminApi';

const AdminAuth = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
  });

  const handleChange = (name: string, value: string) => {
    setAdminData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    const { email, password, name, mobile } = adminData;
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Email and Password are required' });
      return false;
    }
    if (!isLogin && (!name || !mobile)) {
      Toast.show({ type: 'error', text1: 'Please fill all fields for registration' });
      return false;
    }
    if (password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let response;
      if (isLogin) {
        response = await loginAdmin({
          email: adminData.email,
          password: adminData.password,
        });
      } else {
        response = await registerAdmin(adminData);
      }

      const { data } = response;

      if (data.success) {
        if (data.token) {
          await AsyncStorage.setItem('adminToken', data.token);
        }

        const userData = data.admin || data.user || data.data;
        if (userData) {
          dispatch(loginSuccess({ user: userData }));
        }

        Toast.show({
          type: 'success',
          text1: isLogin ? 'Welcome back!' : 'Account created successfully!',
        });

        setTimeout(() => {
          navigation.navigate('MainApp', { screen: 'AdminDashboard' });
        }, ); 
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
    setAdminData({ name: '', email: '', mobile: '', password: '' });
    setShowPassword(false);
  };

  return (
    <LinearGradient
      colors={['#dcfce7', '#ffffff', '#ffedd5']} 
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* HERO SECTION */}
            <View style={styles.heroSection}>
              {/* Note: Update this path to your actual local image asset */}
              {/* <Image source={require('../../assets/fro')} style={styles.heroImage} /> */}
              
              <Text style={styles.title}>BhojanQR Control Center</Text>
              <Text style={styles.subtitle}>
                Your centralized hub for managing menus, kitchen operations, and restaurant growth.
              </Text>

              <View style={styles.badgeContainer}>
                <View style={styles.badgeGreen}>
                  <Shield size={12} color="#15803d" />
                  <Text style={styles.badgeTextGreen}>Enterprise Secure</Text>
                </View>
                <View style={styles.badgeOrange}>
                  <Clock size={12} color="#c2410c" />
                  <Text style={styles.badgeTextOrange}>Real-time Sync</Text>
                </View>
              </View>
            </View>

            {/* FORM CARD */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  {isLogin ? (
                    <Lock size={32} color="#16a34a" />
                  ) : (
                    <User size={32} color="#f97316" />
                  )}
                </View>
                <Text style={styles.formTitle}>
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {isLogin
                    ? 'Please sign in to continue'
                    : 'Start managing your restaurant today'}
                </Text>
              </View>

              <View style={styles.form}>
                {!isLogin && (
                  <>
                    <View style={styles.inputWrapper}>
                      <User size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        placeholderTextColor="#9ca3af"
                        value={adminData.name}
                        onChangeText={(val) => handleChange('name', val)}
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <Phone size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Mobile Number"
                        placeholderTextColor="#9ca3af"
                        keyboardType="phone-pad"
                        value={adminData.mobile}
                        onChangeText={(val) => handleChange('mobile', val)}
                      />
                    </View>
                  </>
                )}

                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={adminData.email}
                    onChangeText={(val) => handleChange('email', val)}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={adminData.password}
                    onChangeText={(val) => handleChange('password', val)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#9ca3af" />
                    ) : (
                      <Eye size={20} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* SUBMIT BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    isLogin ? styles.btnGreen : styles.btnOrange,
                    isLoading && styles.btnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.submitBtnText}>Processing...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {isLogin ? 'Sign In' : 'Register Now'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* TOGGLE FOOTER */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {isLogin ? "Don't have an account? " : 'Already registered? '}
                </Text>
                <TouchableOpacity onPress={toggleMode}>
                  <Text style={styles.footerLink}>
                    {isLogin ? 'Create one here' : 'Sign in instead'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

// --- STYLESHEET ---
const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  heroImage: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#166534', // green-800
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563', // gray-600
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  badgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeTextGreen: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeTextOrange: {
    color: '#c2410c',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Card
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 64,
    height: 64,
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    transform: [{ rotate: '12deg' }],
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1f2937',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },

  // Form
  form: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },

  // Buttons
  submitBtn: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnGreen: {
    backgroundColor: '#16a34a',
    shadowColor: '#16a34a',
  },
  btnOrange: {
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
  },
  btnDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
  },
  footerLink: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AdminAuth;