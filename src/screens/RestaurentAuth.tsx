import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Toast from "react-native-toast-message";
import { pick, types } from "@react-native-documents/picker";
import LegalDocModal from "../components/LegalDocModal";
import { PLATFORM_FEE_PERCENT, type LegalDocId } from "../constants/legalDocs";
import { useDispatch } from "react-redux";

// Make sure these paths are correct for your React Native project structure
import { loginSuccess } from "../Features/AuthSlice";
import { registerRestaurant, loginRestaurant } from "../API/restaurentApi";
import { setToken } from "../utils/tokenStorage";
import { emailFieldProps } from "../utils/emailInput";

// Kept in step with server/config/cloudinary.js. The server rejects anything
// outside these anyway; duplicating them here is what turns a failed
// registration into an immediate, specific message at the moment of picking.
const MAX_DOCUMENT_MB = 2;
const MAX_DOCUMENT_BYTES = MAX_DOCUMENT_MB * 1024 * 1024;
const DOCUMENT_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];
const DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];

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

  // Hidden admin entry: five taps on the brand icon, each within a second of
  // the last. Held in refs rather than state because nothing renders from
  // them - using state would re-render the whole form on every tap.
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const handleLogoTap = () => {
    const now = Date.now();
    tapCountRef.current = now - lastTapRef.current < 1000 ? tapCountRef.current + 1 : 1;
    lastTapRef.current = now;

    if (tapCountRef.current === 5) {
      tapCountRef.current = 0;
      navigation.navigate('AdminAuth');
    }
  };

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

  // Consent is deliberately NOT part of restaurantData: it is not a profile
  // field and must never be posted as one. It gates registration only.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [openDoc, setOpenDoc] = useState<LegalDocId | null>(null);

  const handleChange = (name: string, value: string) => {
    setRestaurantData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async () => {
    try {
      const [file] = await pick({
        type: [types.images, types.pdf],
        // Copies out of the provider's sandbox into a path this app can read.
        // Without it a file picked from Drive or Downloads yields a content://
        // URI that FormData cannot open, and the upload fails at submit time -
        // long after the point where it could be explained.
        copyTo: "cachesDirectory",
      } as any);

      if (!file) return;

      const name = file.name || "document";
      const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
      const mime = file.type || "";

      // The same allow-list the server enforces (config/cloudinary.js:
      // DOCUMENT_EXTENSIONS / DOCUMENT_MIME_TYPES). Checked here so a wrong
      // file is rejected while the picker is still in mind, rather than
      // failing the whole registration after every other field is filled in.
      if (
        !DOCUMENT_EXTENSIONS.includes(extension) ||
        (mime && !DOCUMENT_MIME_TYPES.includes(mime))
      ) {
        Toast.show({
          type: "error",
          text1: "Unsupported file type",
          text2: "Upload a JPG, PNG or PDF",
        });
        return;
      }

      if (typeof file.size === "number" && file.size > MAX_DOCUMENT_BYTES) {
        Toast.show({
          type: "error",
          text1: "File is too large",
          text2: `Maximum ${MAX_DOCUMENT_MB}MB - this one is ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        });
        return;
      }

      // fileCopyUri is the readable path produced by copyTo; uri is the
      // original, which may not be openable.
      setGovtIdDocument({
        uri: (file as any).fileCopyUri || file.uri,
        type: mime || "application/octet-stream",
        name,
        size: file.size,
      });

      Toast.show({ type: "success", text1: "Document attached", text2: name });
    } catch (error: any) {
      // Backing out of the picker is not an error worth reporting. The
      // library signals it either by code or by message depending on
      // platform, so both are checked.
      const cancelled =
        error?.code === "DOCUMENT_PICKER_CANCELED" ||
        /cancel/i.test(error?.message || "");
      if (cancelled) return;

      Toast.show({
        type: "error",
        text1: "Could not open the file picker",
        text2: error?.message || "Please try again",
      });
    }
  };

  const validateForm = () => {
    const { email, password, restaurantName, ownerName, mobile, idNumber } = restaurantData;

    if (!email || !password) {
      Toast.show({ type: "error", text1: "Validation Error", text2: "Email and Password are required" });
      return false;
    }
    if (!isLogin && !acceptedTerms) {
      Toast.show({
        type: "error",
        text1: "Please accept the terms",
        text2: "Tick the box to confirm you agree before registering",
      });
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
          if (response.data.token) {
            await setToken(response.data.token);
          }
          const userData = response.data.data || response.data.restaurant;
          if (userData) {
            dispatch(loginSuccess({ user: userData }));
          }
          Toast.show({ type: "success", text1: "Welcome back!" });
          // Pending owners can log in (only rejected/suspended are blocked
          // server-side) but shouldn't see the dashboard yet - mirrors the
          // website's ProtectedRoute redirect to /restaurant/pending-approval.
          const destination = userData?.status === "pending" ? "PendingApproval" : "RestaurantDashboard";
          // reset, not navigate: this screen must not stay underneath in the
          // stack, or the back gesture would drop a signed-in owner straight
          // back onto the login form. Signing out is the only way back here,
          // and the dashboards' logout handlers navigate here explicitly.
          setTimeout(
            () => navigation.reset({ index: 0, routes: [{ name: destination }] }),
            1500,
          );
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
        // The server records this with a timestamp and IP; it is required and
        // registration is rejected without it. Sent as a string because
        // multipart carries everything as text.
        formData.append("termsAccepted", "true");

        if (govtIdDocument) {
          // Only the three keys RN's FormData understands for a file part.
          // `size` is kept on state for the label but is not a file field,
          // and passing extra keys through is how a multipart part ends up
          // malformed on some Android versions.
          formData.append("govtIdDocument", {
            uri: govtIdDocument.uri,
            type: govtIdDocument.type,
            name: govtIdDocument.name,
          } as any);
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
    setAcceptedTerms(false);
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
        keyboardShouldPersistTaps="handled"
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.container}>
            
            {/* HEADER SECTION */}
            <View style={styles.headerSection}>
              {/* Five quick taps here open the hidden admin login. This used
                  to live on the app header's logo, but the header is no
                  longer on every screen and this auth screen is now the
                  landing screen - so the shortcut lives where an operator
                  will actually be. Nothing marks it: it is meant to be
                  discoverable only by someone who already knows. */}
              <TouchableOpacity
                onPress={handleLogoTap}
                activeOpacity={1}
                accessibilityRole="image"
                accessibilityLabel="BhojanQR"
              >
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../../assets/bhojanqr-icon.png')}
                    style={styles.brandIcon}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
              <Text style={styles.mainTitle}>Bhojan<Text style={{ color: '#166534' }}>QR</Text> Partner</Text>
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
                      <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                        style={styles.textInput}
                        placeholder="Restaurant Name *"
                        placeholderTextColor="#9ca3af"
                        value={restaurantData.restaurantName}
                        onChangeText={(val) => handleChange("restaurantName", val)}
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <FontAwesome5 name="user" size={16} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                        style={styles.textInput}
                        placeholder="Owner Full Name *"
                        placeholderTextColor="#9ca3af"
                        value={restaurantData.ownerName}
                        onChangeText={(val) => handleChange("ownerName", val)}
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <FontAwesome5 name="phone-alt" size={16} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
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
                    <ScrollView  keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
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
                      <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                        style={styles.textInput}
                        placeholder={`${restaurantData.idType} Number *`}
                        placeholderTextColor="#9ca3af"
                        value={restaurantData.idNumber}
                        onChangeText={(val) => handleChange("idNumber", val)}
                      />
                    </View>

                    {/* File Upload Button */}
                    <Text style={[styles.inputLabel, { marginTop: 8 }]}>Upload Document (Optional)</Text>
                    <TouchableOpacity
                      style={[styles.uploadButton, govtIdDocument && styles.uploadButtonFilled]}
                      onPress={handleFileChange}
                      activeOpacity={0.75}
                    >
                      <FontAwesome5
                        name={govtIdDocument ? "file-alt" : "cloud-upload-alt"}
                        size={20}
                        color="#ea580c"
                        style={{ marginRight: 10 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.uploadButtonText} numberOfLines={1}>
                          {govtIdDocument
                            ? govtIdDocument.name
                            : `JPG, PNG or PDF - up to ${MAX_DOCUMENT_MB}MB`}
                        </Text>
                        {/* Size shown once attached: the server rejects
                            anything over the cap, so seeing it here is the
                            difference between knowing now and finding out
                            when the form is submitted. */}
                        {!!govtIdDocument?.size && (
                          <Text style={styles.uploadButtonMeta}>
                            {(govtIdDocument.size / 1024).toFixed(0)} KB · tap to replace
                          </Text>
                        )}
                      </View>

                      {/* Optional field, so removing an attachment has to be
                          possible - otherwise a mis-picked file can only be
                          swapped, never cleared. */}
                      {!!govtIdDocument && (
                        <TouchableOpacity
                          onPress={() => setGovtIdDocument(null)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={styles.uploadClear}
                        >
                          <FontAwesome5 name="times" size={14} color="#9ca3af" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>

                    <View style={styles.divider} />
                  </>
                )}

                <View style={styles.inputWrapper}>
                  <FontAwesome5 name="envelope" size={16} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                    style={styles.textInput}
                    placeholder="Email Address *"
                    placeholderTextColor="#9ca3af"
                    {...emailFieldProps}
                    value={restaurantData.email}
                    onChangeText={(val) => handleChange("email", val)}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <FontAwesome5 name="lock" size={16} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
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

                {isLogin && (
                  <TouchableOpacity
                    style={styles.forgotLink}
                    onPress={() => navigation.navigate("ForgotPassword", { role: "restaurant" })}
                  >
                    <Text style={styles.forgotLinkText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                {!isLogin && (
                  <View style={styles.consentRow}>
                    <TouchableOpacity
                      style={[styles.checkbox, acceptedTerms && styles.checkboxOn]}
                      onPress={() => setAcceptedTerms((v) => !v)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: acceptedTerms }}
                      accessibilityLabel="Accept terms and policies"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {acceptedTerms && <View style={styles.checkboxTick} />}
                    </TouchableOpacity>

                    {/* Each policy opens full screen over the form and closes
                        back to it, so a half-filled registration survives
                        someone actually reading what they are agreeing to. */}
                    <Text style={styles.consentText}>
                      I have read and agree to the{" "}
                      <Text style={styles.consentLink} onPress={() => setOpenDoc("terms")}>
                        Terms &amp; Conditions
                      </Text>
                      ,{" "}
                      <Text style={styles.consentLink} onPress={() => setOpenDoc("privacy")}>
                        Privacy Policy
                      </Text>{" "}
                      and{" "}
                      <Text style={styles.consentLink} onPress={() => setOpenDoc("refund")}>
                        Refund Policy
                      </Text>
                      , including the {PLATFORM_FEE_PERCENT}% platform fee on each
                      transaction.
                    </Text>
                  </View>
                )}

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

              {isLogin && (
                <TouchableOpacity
                  style={styles.staffLoginLink}
                  onPress={() => navigation.navigate("StaffAuth")}
                >
                  <FontAwesome5 name="user-tie" size={12} color="#16a34a" style={{ marginRight: 6 }} />
                  <Text style={styles.staffLoginLinkText}>Staff member? Sign in here</Text>
                </TouchableOpacity>
              )}

            </View>
          </View>
        </ScrollView>
        <LegalDocModal docId={openDoc} onClose={() => setOpenDoc(null)} />
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
  // No background tint any more: the asset is a circular badge with its own
  // pale ground, so the old peach rounded square framed it with a second,
  // clashing shape.
  iconContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandIcon: {
    width: 96,
    height: 96,
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  staffLoginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  staffLoginLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
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
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 11, marginTop: 4, marginBottom: 16 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: "#ea580c", borderColor: "#ea580c" },
  checkboxTick: { width: 9, height: 9, borderRadius: 2, backgroundColor: "#ffffff" },
  consentText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: "#6b7280" },
  consentLink: { color: "#ea580c", fontWeight: "800", textDecorationLine: "underline" },
  uploadButtonFilled: { borderStyle: "solid", borderColor: "#fed7aa", backgroundColor: "#fff7ed" },
  uploadButtonMeta: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  uploadClear: { padding: 6 },
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