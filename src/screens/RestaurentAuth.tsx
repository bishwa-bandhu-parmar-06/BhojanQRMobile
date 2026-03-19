import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Toast from "react-native-toast-message";
import { useDispatch } from "react-redux";

// Make sure these paths are correct for your React Native project structure
import { loginSuccess } from "../Features/AuthSlice";
import { registerRestaurant, loginRestaurant } from "../API/restaurentApi";

const RestaurentAuth = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  // Reference for the ScrollView to fix the "scroll to top" issue
  const scrollViewRef = useRef<ScrollView>(null);

  // Automatically scroll to top when coming back to this screen
  useFocusEffect(
    useCallback(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
    }, [])
  );

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [restaurantData, setRestaurantData] = useState({
    restaurantName: "",
    ownerName: "",
    email: "",
    mobile: "",
    password: "",
    idType: "FSSAI",
    idNumber: "",
  });

  const [govtIdDocument, setGovtIdDocument] = useState<any>(null);

  const handleChange = (name: string, value: string) => {
    setRestaurantData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async () => {
    // Note for React Native: You will need to install 'react-native-document-picker'
    Toast.show({
      type: 'info',
      text1: 'File Upload',
      text2: 'Implement react-native-document-picker here.',
    });
  };

  const validateForm = () => {
    const { email, password, restaurantName, ownerName, mobile, idNumber } = restaurantData;

    if (!email || !password) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Email and Password are required" });
      return false;
    }
    if (!isLogin) {
      if (!restaurantName || !ownerName || !mobile || !idNumber) {
        Toast.show({ type: "error", text1: "Validation Error", text2: "Please fill all required fields" });
        return false;
      }
    }
    if (password.length < 8) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Password must be at least 8 characters" });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        const response = await loginRestaurant({
          email: restaurantData.email,
          password: restaurantData.password,
        });

        if (response.data.success) {
          const userData = response.data.data || response.data.restaurant;
          if (userData) {
            dispatch(loginSuccess({ user: userData }));
          }
          Toast.show({ type: "success", text1: "Welcome back!" });
          setTimeout(() => navigation.navigate("RestaurantDashboard"), 1500);
        }
      } else {
        const formData = new FormData();
        formData.append("restaurantName", restaurantData.restaurantName);
        formData.append("ownerName", restaurantData.ownerName);
        formData.append("email", restaurantData.email);
        formData.append("mobile", restaurantData.mobile);
        formData.append("password", restaurantData.password);
        formData.append("idType", restaurantData.idType);
        formData.append("idNumber", restaurantData.idNumber);

        if (govtIdDocument) {
          formData.append("govtIdDocument", govtIdDocument);
        }

        const response = await registerRestaurant(formData as any);

        if (response.data.success) {
          Toast.show({
            type: "success",
            text1: "Registration successful!",
            text2: response.data.message || "Pending admin approval.",
          });
          setTimeout(() => {
            setIsLogin(true);
            setRestaurantData((prev) => ({ ...prev, password: "", idNumber: "" }));
            setGovtIdDocument(null);
          }, 2000);
        }
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Authentication failed";
      Toast.show({ type: "error", text1: "Error", text2: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setRestaurantData({
      restaurantName: "",
      ownerName: "",
      email: "",
      mobile: "",
      password: "",
      idType: "FSSAI",
      idNumber: "",
    });
    setGovtIdDocument(null);
    setShowPassword(false);
  };

  const idTypes = ["FSSAI", "GSTIN", "PAN", "Aadhar"];

  return (
    <LinearGradient
      colors={["#f0fdf4", "#fff7ed", "#f0fdf4"]}
      style={styles.globalGradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.container}>
            
            {/* HEADER SECTION */}
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="store" size={32} color="#ea580c" />
              </View>
              <Text style={styles.mainTitle}>BhojanQR Partner</Text>
              <Text style={styles.subTitle}>
                Grow your restaurant's reach, manage digital menus, and streamline your order pipeline.
              </Text>
              
              <View style={styles.tagsContainer}>
                <View style={styles.tagGreen}>
                  <FontAwesome5 name="shield-alt" size={10} color="#16a34a" style={{ marginRight: 4 }} />
                  <Text style={styles.tagTextGreen}>Secure Access</Text>
                </View>
                <View style={styles.tagOrange}>
                  <FontAwesome5 name="book-open" size={10} color="#ea580c" style={{ marginRight: 4 }} />
                  <Text style={styles.tagTextOrange}>Digital Menu</Text>
                </View>
              </View>
            </View>

            {/* AUTH CARD */}
            <View style={styles.authCard}>
              <Text style={styles.cardTitle}>
                {isLogin ? "Restaurant Login" : "Partner Registration"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isLogin ? "Sign in to manage your restaurant" : "Join BhojanQR and digitize your business"}
              </Text>

              {/* FORM FIELDS */}
              <View style={styles.formContainer}>
                
                {!isLogin && (
                  <>
                    <View style={styles.inputWrapper}>
                      <FontAwesome5 name="store" size={16} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Restaurant Name *"
                        placeholderTextColor="#9ca3af"
                        value={restaurantData.restaurantName}
                        onChangeText={(val) => handleChange("restaurantName", val)}
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <FontAwesome5 name="user" size={16} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Owner Full Name *"
                        placeholderTextColor="#9ca3af"
                        value={restaurantData.ownerName}
                        onChangeText={(val) => handleChange("ownerName", val)}
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <FontAwesome5 name="phone-alt" size={16} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Mobile Number *"
                        placeholderTextColor="#9ca3af"
                        keyboardType="phone-pad"
                        value={restaurantData.mobile}
                        onChangeText={(val) => handleChange("mobile", val)}
                      />
                    </View>

                    <View style={styles.divider} />

                    {/* ID Type Selector (Horizontal Chips) */}
                    <Text style={styles.inputLabel}>Select ID Type *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
                      {idTypes.map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => handleChange("idType", type)}
                          style={[styles.chip, restaurantData.idType === type && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, restaurantData.idType === type && styles.chipTextActive]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <View style={styles.inputWrapper}>
                      <FontAwesome5 name="file-alt" size={16} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder={`${restaurantData.idType} Number *`}
                        placeholderTextColor="#9ca3af"
                        value={restaurantData.idNumber}
                        onChangeText={(val) => handleChange("idNumber", val)}
                      />
                    </View>

                    {/* File Upload Button */}
                    <Text style={[styles.inputLabel, { marginTop: 8 }]}>Upload Document (Optional)</Text>
                    <TouchableOpacity style={styles.uploadButton} onPress={handleFileChange}>
                      <FontAwesome5 name="cloud-upload-alt" size={20} color="#ea580c" style={{ marginRight: 10 }} />
                      <Text style={styles.uploadButtonText}>
                        {govtIdDocument ? govtIdDocument.name || "Document Selected" : "Click to select file (Image/PDF)"}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />
                  </>
                )}

                <View style={styles.inputWrapper}>
                  <FontAwesome5 name="envelope" size={16} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email Address *"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={restaurantData.email}
                    onChangeText={(val) => handleChange("email", val)}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <FontAwesome5 name="lock" size={16} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Password *"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={restaurantData.password}
                    onChangeText={(val) => handleChange("password", val)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <FontAwesome5 name={showPassword ? "eye-slash" : "eye"} size={16} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                {/* SUBMIT BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isLogin ? styles.submitLogin : styles.submitRegister,
                    isLoading && styles.submitDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {isLogin ? "Sign In" : "Submit Application"}
                    </Text>
                  )}
                </TouchableOpacity>

              </View>

              {/* TOGGLE MODE */}
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleText}>
                  {isLogin ? "Want to partner with us?" : "Already an approved partner?"}
                </Text>
                <TouchableOpacity onPress={toggleMode}>
                  <Text style={styles.toggleTextBold}>
                    {isLogin ? " Register here" : " Sign in instead"}
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
  globalGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    backgroundColor: '#ffedd5',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ea580c',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tagGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  tagTextGreen: { color: '#16a34a', fontSize: 12, fontWeight: '700' },
  tagOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  tagTextOrange: { color: '#ea580c', fontSize: 12, fontWeight: '700' },

  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  formContainer: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
  },
  inputIcon: { width: 24 },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#ea580c',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: '#f9fafb',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitLogin: {
    backgroundColor: '#ea580c',
  },
  submitRegister: {
    backgroundColor: '#16a34a',
  },
  submitDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
    color: '#6b7280',
  },
  toggleTextBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ea580c',
  },
});

export default RestaurentAuth;