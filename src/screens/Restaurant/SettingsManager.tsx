import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Image,
  Linking,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  Store,
  User,
  Phone,
  MapPin,
  Map,
  Navigation,
  Save,
  Plus,
  Pencil,
  Trash2,
  X,
  Building,
  Mail,
  Lock,
  Image as ImageIcon,
  FileText,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { pick, types } from "@react-native-documents/picker";
import { useDispatch } from "react-redux";
import { updateUser } from "../../Features/AuthSlice";
import BhojanQRLoader from "../../components/BhojanQRLoader";
import {
  getRestaurantProfile,
  updateRestaurantProfile,
  addRestaurantAddress,
  updateRestaurantAddress,
  deleteRestaurantAddress,
  updateRestaurantEmail,
  changeRestaurantPassword,
  uploadRestaurantLogo,
  addRestaurantDocument,
  updateRestaurantDocument,
  deleteRestaurantDocument,
} from "../../API/restaurentApi";
import SectionError from "../../components/SectionError";

const ID_TYPES = ["FSSAI", "GSTIN", "PAN", "Aadhar"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

type SettingsManagerProps = {
  autoOpenAddDoc?: boolean;
  onAutoOpenConsumed?: () => void;
};

const SettingsManager = ({ autoOpenAddDoc, onAutoOpenConsumed }: SettingsManagerProps) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // FIX: Type the profile data so it doesn't complain about properties
  const [profileData, setProfileData] = useState<any>({ restaurantName: "", ownerName: "", mobile: "" });

  // FIX: Tell TS this is an array of 'any' objects, not 'never[]'
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  
  // FIX: Tell TS this can be a string OR null
  const [editingAddressId, setEditingAddressId] = useState<any>(null);

  const initialAddressForm = { street: "", area: "", landmark: "", city: "", state: "", pincode: "" };
  const [addressForm, setAddressForm] = useState(initialAddressForm);

  // Email / Password
  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [savingEmail, setSavingEmail] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showEmailPwd, setShowEmailPwd] = useState(false);

  // Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoAsset, setLogoAsset] = useState<any>(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const [isLogoPreviewOpen, setIsLogoPreviewOpen] = useState(false);

  // Documents
  const [documents, setDocuments] = useState<any[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({ idType: "FSSAI", idNumber: "" });
  const [docAsset, setDocAsset] = useState<any>(null);
  const [savingDoc, setSavingDoc] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  // Per-row delete spinners (Edit just opens a modal, so it has nothing to
  // load - only Delete and Save make a network call worth showing inline).
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setLoadError(false);
      const res = await getRestaurantProfile();
      const data = res.data.data;
      setProfileData({
        restaurantName: data.restaurantName || "",
        ownerName: data.ownerName || "",
        mobile: data.mobile || ""
      });
      setAddresses(Array.isArray(data.address) ? data.address : data.address ? [data.address] : []);
      setLogoUrl(data.logoUrl || data.logo || null);
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load settings data" });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (autoOpenAddDoc) {
      openAddDocModal();
      onAutoOpenConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAddDoc]);

  const handleEmailSubmit = async () => {
    if (!emailForm.newEmail.trim() || !emailForm.currentPassword) {
      Toast.show({ type: "error", text1: "Enter the new email and your current password" });
      return;
    }
    setSavingEmail(true);
    try {
      const res = await updateRestaurantEmail(emailForm.newEmail.trim(), emailForm.currentPassword);
      Toast.show({ type: "success", text1: res.data?.message || "Email updated successfully" });
      setEmailForm({ newEmail: "", currentPassword: "" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to update email" });
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForm.currentPassword || passwordForm.newPassword.length < 8) {
      Toast.show({ type: "error", text1: "New password must be at least 8 characters" });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Toast.show({ type: "error", text1: "Passwords don't match" });
      return;
    }
    setSavingPassword(true);
    try {
      await changeRestaurantPassword(passwordForm.currentPassword, passwordForm.newPassword);
      Toast.show({ type: "success", text1: "Password updated successfully" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to update password" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePickLogo = async () => {
    const result = await launchImageLibrary({ mediaType: "photo", quality: 0.8 });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      setLogoAsset(result.assets[0]);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoAsset) {
      Toast.show({ type: "error", text1: "Choose an image first" });
      return;
    }
    setSavingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", {
        uri: logoAsset.uri,
        type: logoAsset.type || "image/jpeg",
        name: logoAsset.fileName || "logo.jpg",
      } as any);
      const res = await uploadRestaurantLogo(formData);
      setLogoUrl(res.data?.data?.logoUrl || null);
      setLogoAsset(null);
      Toast.show({ type: "success", text1: "Logo updated successfully" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to upload logo" });
    } finally {
      setSavingLogo(false);
    }
  };

  const openAddDocModal = () => {
    setEditingDocId(null);
    setDocForm({ idType: "FSSAI", idNumber: "" });
    setDocAsset(null);
    setIsDocModalOpen(true);
  };

  const openEditDocModal = (doc: any) => {
    setEditingDocId(doc._id);
    setDocForm({ idType: doc.idType, idNumber: doc.idNumber || "" });
    setDocAsset(null);
    setIsDocModalOpen(true);
  };

  const handlePickDoc = async () => {
    try {
      const [res] = (await pick({ type: [types.allFiles] })) as any;
      setDocAsset(res);
    } catch (error: any) {
      if (error?.code !== "DOCUMENT_PICKER_CANCELED" && error?.code !== "DOCUMENTS_PICKER_CANCELED") {
        Toast.show({ type: "error", text1: "Failed to pick document" });
      }
    }
  };

  const handleDocSubmit = async () => {
    if (!editingDocId && (!docForm.idNumber.trim() || !docAsset)) {
      Toast.show({ type: "error", text1: "Select a document and enter its ID number" });
      return;
    }
    setSavingDoc(true);
    try {
      const formData = new FormData();
      if (editingDocId) {
        if (docForm.idNumber) formData.append("idNumber", docForm.idNumber.trim());
        if (docAsset) {
          formData.append("document", { uri: docAsset.uri, type: docAsset.type, name: docAsset.name } as any);
        }
        const res = await updateRestaurantDocument(editingDocId, formData);
        if (res.data?.data) setDocuments(res.data.data);
        Toast.show({ type: "success", text1: "Document updated" });
      } else {
        formData.append("idType", docForm.idType);
        formData.append("idNumber", docForm.idNumber.trim());
        formData.append("document", { uri: docAsset.uri, type: docAsset.type, name: docAsset.name } as any);
        const res = await addRestaurantDocument(formData);
        if (res.data?.data) setDocuments(res.data.data);
        Toast.show({ type: "success", text1: "Document added" });
      }
      setIsDocModalOpen(false);
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to save document" });
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    setDeletingDocId(docId);
    try {
      await deleteRestaurantDocument(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      Toast.show({ type: "success", text1: "Document deleted" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to delete document" });
    } finally {
      setDeletingDocId(null);
    }
  };

  const handlePreviewDoc = (doc: any) => {
    if (!doc.documentUrl) return;
    const ext = doc.documentUrl.split(".").pop()?.toLowerCase().split("?")[0];
    if (ext && IMAGE_EXTENSIONS.includes(ext)) {
      setPreviewDocUrl(doc.documentUrl);
    } else {
      Linking.openURL(doc.documentUrl).catch(() =>
        Toast.show({ type: "error", text1: "Unable to open document" })
      );
    }
  };

  const handleProfileSubmit = async () => {
    if (!profileData.restaurantName || !profileData.ownerName || !profileData.mobile) {
      Toast.show({ type: "error", text1: "Please fill all basic details." });
      return;
    }

    setSavingProfile(true);
    try {
      await updateRestaurantProfile(profileData);
      dispatch(updateUser({ ...profileData, name: profileData.restaurantName }));
      Toast.show({ type: "success", text1: "Profile updated successfully!" });
    } catch (error: any) { // FIX: Type error as any
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to update profile" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddressSubmit = async () => {
    if (!addressForm.street || !addressForm.city || !addressForm.state || !addressForm.pincode) {
      Toast.show({ type: "error", text1: "Please fill all required address fields." });
      return;
    }

    setSavingAddress(true);
    try {
      let res;
      if (editingAddressId) {
        res = await updateRestaurantAddress(editingAddressId, addressForm);
        Toast.show({ type: "success", text1: "Address updated successfully!" });
      } else {
        res = await addRestaurantAddress(addressForm);
        Toast.show({ type: "success", text1: "Address added successfully!" });
      }
      if (res.data.data) setAddresses(res.data.data);
      setIsAddressModalOpen(false);
    } catch (error: any) { // FIX: Type error as any
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to save address" });
    } finally {
      setSavingAddress(false);
    }
  };

  // FIX: Type the 'id' parameter
  const handleDeleteAddress = async (id: string) => {
    setDeletingAddressId(id);
    try {
      await deleteRestaurantAddress(id);
      // FIX: Type 'prev' and 'addr'
      setAddresses((prev: any[]) => prev.filter((addr: any) => addr._id !== id));
      Toast.show({ type: "success", text1: "Address deleted!" });
    } catch (error: any) { // FIX: Type error as any
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to delete address" });
    } finally {
      setDeletingAddressId(null);
    }
  };

  if (loading) return <BhojanQRLoader />;

  if (loadError && !profileData.restaurantName && !profileData.ownerName) {
    return (
      <View style={styles.container}>
        <SectionError message="Failed to load settings data." onRetry={loadProfile} />
      </View>
    );
  }

  return (
    <ScrollView  keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Restaurant Settings</Text>
        <Text style={styles.subtitle}>Manage your public profile and branch locations.</Text>
      </View>

      {/* SECTION 1: Basic Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Store size={20} color="#f97316" />
          <Text style={styles.cardTitle}>Basic Details</Text>
        </View>
        <View style={styles.cardBody}>
          
          <Text style={styles.label}>Restaurant Name</Text>
          <View style={styles.inputContainer}>
            <Store size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              value={profileData.restaurantName} 
              onChangeText={(t) => setProfileData({ ...profileData, restaurantName: t })} 
            />
          </View>

          <Text style={styles.label}>Owner Name</Text>
          <View style={styles.inputContainer}>
            <User size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              value={profileData.ownerName} 
              onChangeText={(t) => setProfileData({ ...profileData, ownerName: t })} 
            />
          </View>

          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputContainer}>
            <Phone size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              keyboardType="phone-pad" 
              value={profileData.mobile} 
              onChangeText={(t) => setProfileData({ ...profileData, mobile: t })} 
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleProfileSubmit} disabled={savingProfile}>
            {savingProfile ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.primaryBtnText}>Saving...</Text>
              </>
            ) : (
              <>
                <Save size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Update Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* SECTION 2: Address Info */}
      <View style={styles.card}>
        <View style={[styles.cardHeader, { justifyContent: "space-between" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MapPin size={20} color="#f97316" />
            <Text style={styles.cardTitle}>Locations</Text>
          </View>
          <TouchableOpacity 
            onPress={() => { 
              setEditingAddressId(null); 
              setAddressForm(initialAddressForm); 
              setIsAddressModalOpen(true); 
            }} 
            style={styles.addBtn}
          >
            <Plus size={16} color="#ea580c" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          {addresses.length === 0 ? (
            <View style={styles.emptyState}>
              <Building size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No locations added yet.</Text>
            </View>
          ) : (
            // FIX: Type 'addr' explicitly inside map
            addresses.map((addr: any, index: number) => (
              <View key={addr._id || index} style={styles.addressCard}>
                <View style={styles.badge}><Text style={styles.badgeText}>Location {index + 1}</Text></View>
                <Text style={styles.addressTitle}>{addr.street}</Text>
                {addr.area ? <Text style={styles.addressSub}>{addr.area}</Text> : null}
                {addr.landmark ? <Text style={styles.addressItalic}>Landmark: {addr.landmark}</Text> : null}
                <Text style={styles.addressSubBold}>{addr.city}, {addr.state} - {addr.pincode}</Text>
                
                <View style={styles.addressActions}>
                  <TouchableOpacity
                    onPress={() => { setEditingAddressId(addr._id); setAddressForm(addr); setIsAddressModalOpen(true); }}
                    style={styles.editBtn}
                    disabled={deletingAddressId === addr._id}
                  >
                    <Pencil size={14} color="#4b5563" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteAddress(addr._id)}
                    style={styles.deleteBtn}
                    disabled={deletingAddressId === addr._id}
                  >
                    {deletingAddressId === addr._id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <Trash2 size={14} color="#ef4444" />
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* SECTION 3: Logo */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ImageIcon size={20} color="#f97316" />
          <Text style={styles.cardTitle}>Restaurant Logo</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.logoRow}>
            <TouchableOpacity
              style={styles.logoPreviewBox}
              activeOpacity={logoAsset?.uri || logoUrl ? 0.7 : 1}
              onPress={() => { if (logoAsset?.uri || logoUrl) setIsLogoPreviewOpen(true); }}
            >
              {logoAsset?.uri || logoUrl ? (
                <Image source={{ uri: logoAsset?.uri || logoUrl || undefined }} style={styles.logoPreviewImg} />
              ) : (
                <Building size={32} color="#d1d5db" />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TouchableOpacity style={styles.outlineBtn} onPress={handlePickLogo}>
                <Pencil size={14} color="#ea580c" />
                <Text style={styles.outlineBtnText}>Choose Image</Text>
              </TouchableOpacity>
              {logoAsset && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 10, alignSelf: "flex-start" }, savingLogo && { opacity: 0.6 }]}
                  onPress={handleLogoUpload}
                  disabled={savingLogo}
                >
                  {savingLogo ? (
                    <><ActivityIndicator size="small" color="#fff" /><Text style={styles.primaryBtnText}>Uploading...</Text></>
                  ) : (
                    <><Save size={16} color="#fff" /><Text style={styles.primaryBtnText}>Upload</Text></>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* SECTION 4: Email */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Mail size={20} color="#f97316" />
          <Text style={styles.cardTitle}>Change Email</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.label}>New Email Address</Text>
          <View style={styles.inputContainer}>
            <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your new email address"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              importantForAutofill="no"
              autoComplete="off"
              cursorColor="#ea580c"
              selectionColor="#fdba74"
              caretHidden={false}
              value={emailForm.newEmail}
              onChangeText={(t) => setEmailForm({ ...emailForm, newEmail: t })}
            />
          </View>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputContainer}>
            <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your current password"
              placeholderTextColor="#9ca3af"
              importantForAutofill="no"
              autoComplete="off"
              cursorColor="#ea580c"
              selectionColor="#fdba74"
              secureTextEntry={!showEmailPwd}
              value={emailForm.currentPassword}
              onChangeText={(t) => setEmailForm({ ...emailForm, currentPassword: t })}
            />
            <TouchableOpacity onPress={() => setShowEmailPwd(!showEmailPwd)}>
              {showEmailPwd ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleEmailSubmit} disabled={savingEmail}>
            {savingEmail ? (
              <><ActivityIndicator size="small" color="#fff" /><Text style={styles.primaryBtnText}>Updating...</Text></>
            ) : (
              <><Save size={18} color="#fff" /><Text style={styles.primaryBtnText}>Update Email</Text></>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* SECTION 5: Password */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Lock size={20} color="#f97316" />
          <Text style={styles.cardTitle}>Change Password</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputContainer}>
            <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your current password"
              placeholderTextColor="#9ca3af"
              importantForAutofill="no"
              autoComplete="off"
              cursorColor="#ea580c"
              selectionColor="#fdba74"
              secureTextEntry={!showPwd}
              value={passwordForm.currentPassword}
              onChangeText={(t) => setPasswordForm({ ...passwordForm, currentPassword: t })}
            />
            <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
              {showPwd ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputContainer}>
            <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor="#9ca3af"
              importantForAutofill="no"
              autoComplete="off"
              cursorColor="#ea580c"
              selectionColor="#fdba74"
              secureTextEntry={!showPwd}
              value={passwordForm.newPassword}
              onChangeText={(t) => setPasswordForm({ ...passwordForm, newPassword: t })}
            />
            <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
              {showPwd ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputContainer}>
            <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter your new password"
              placeholderTextColor="#9ca3af"
              importantForAutofill="no"
              autoComplete="off"
              cursorColor="#ea580c"
              selectionColor="#fdba74"
              secureTextEntry={!showPwd}
              value={passwordForm.confirmPassword}
              onChangeText={(t) => setPasswordForm({ ...passwordForm, confirmPassword: t })}
            />
            <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
              {showPwd ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handlePasswordSubmit} disabled={savingPassword}>
            {savingPassword ? (
              <><ActivityIndicator size="small" color="#fff" /><Text style={styles.primaryBtnText}>Updating...</Text></>
            ) : (
              <><Save size={18} color="#fff" /><Text style={styles.primaryBtnText}>Update Password</Text></>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* SECTION 6: Documents */}
      <View style={styles.card}>
        <View style={[styles.cardHeader, { justifyContent: "space-between" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FileText size={20} color="#f97316" />
            <Text style={styles.cardTitle}>Government Documents</Text>
          </View>
          {documents.length < 4 && (
            <TouchableOpacity onPress={openAddDocModal} style={styles.addBtn}>
              <Plus size={16} color="#ea580c" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cardBody}>
          {documents.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No documents uploaded yet.</Text>
            </View>
          ) : (
            documents.map((doc: any) => (
              <View key={doc._id} style={styles.addressCard}>
                <View style={styles.docTopRow}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{doc.idType}</Text></View>
                  {doc.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <ShieldCheck size={11} color="#16a34a" />
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressTitle}>{doc.idNumber}</Text>
                <View style={styles.addressActions}>
                  {doc.documentUrl ? (
                    <TouchableOpacity
                      onPress={() => handlePreviewDoc(doc)}
                      style={styles.previewBtn}
                      disabled={deletingDocId === doc._id}
                    >
                      <Eye size={14} color="#2563eb" />
                      <Text style={styles.previewBtnText}>Preview</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => openEditDocModal(doc)}
                    style={styles.editBtn}
                    disabled={deletingDocId === doc._id}
                  >
                    <Pencil size={14} color="#4b5563" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  {!doc.isPrimary && (
                    <TouchableOpacity
                      onPress={() => handleDeleteDoc(doc._id)}
                      style={styles.deleteBtn}
                      disabled={deletingDocId === doc._id}
                    >
                      {deletingDocId === doc._id ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <>
                          <Trash2 size={14} color="#ef4444" />
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                {!doc.documentUrl && (
                  <Text style={styles.docMissingFileText}>No file uploaded yet - tap Edit to add one.</Text>
                )}
              </View>
            ))
          )}
        </View>
      </View>

      {/* Document Modal */}
      <Modal visible={isDocModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <FileText size={20} color="#f97316" />
                <Text style={styles.modalTitle}>{editingDocId ? "Edit Document" : "Add Document"}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDocModalOpen(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ padding: 24 }} contentContainerStyle={{ paddingBottom: 40 }}>
              {!editingDocId && (
                <>
                  <Text style={styles.label}>Document Type *</Text>
                  <View style={styles.row}>
                    {ID_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setDocForm({ ...docForm, idType: t })}
                        style={[styles.idTypeChip, docForm.idType === t && styles.idTypeChipActive]}
                      >
                        <Text style={[styles.idTypeChipText, docForm.idType === t && styles.idTypeChipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>ID Number{editingDocId ? "" : " *"}</Text>
              <TextInput
                style={styles.inputSolo}
                placeholder="Document ID number"
                value={docForm.idNumber}
                onChangeText={(t) => setDocForm({ ...docForm, idNumber: t })}
              />

              <Text style={styles.label}>{editingDocId ? "Replace File (optional)" : "Upload File *"}</Text>
              <TouchableOpacity style={styles.outlineBtn} onPress={handlePickDoc}>
                <FileText size={14} color="#ea580c" />
                <Text style={styles.outlineBtnText}>{docAsset ? (docAsset.name || "File selected") : "Choose PDF or Image"}</Text>
              </TouchableOpacity>

              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={() => setIsDocModalOpen(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleDocSubmit} disabled={savingDoc}>
                  {savingDoc ? (
                    <><ActivityIndicator size="small" color="#fff" /><Text style={styles.primaryBtnText}>Saving...</Text></>
                  ) : (
                    <><Save size={18} color="#fff" /><Text style={styles.primaryBtnText}>Save</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Address Modal */}
      <Modal visible={isAddressModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MapPin size={20} color="#f97316" />
                <Text style={styles.modalTitle}>{editingAddressId ? "Edit Address" : "Add Address"}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddressModalOpen(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView  keyboardShouldPersistTaps="handled" style={{ padding: 24 }} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.label}>Street Address *</Text>
              <TextInput style={styles.inputSolo} placeholder="Shop No, Building..." value={addressForm.street} onChangeText={(t) => setAddressForm({ ...addressForm, street: t })} />
              
              <Text style={styles.label}>Area / Locality</Text>
              <View style={styles.inputContainer}>
                <Map size={16} color="#9ca3af" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="e.g. Connaught Place" value={addressForm.area} onChangeText={(t) => setAddressForm({ ...addressForm, area: t })} />
              </View>

              <Text style={styles.label}>Nearby Landmark</Text>
              <View style={styles.inputContainer}>
                <Navigation size={16} color="#9ca3af" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="e.g. Near Metro" value={addressForm.landmark} onChangeText={(t) => setAddressForm({ ...addressForm, landmark: t })} />
              </View>

              <Text style={styles.label}>City *</Text>
              <TextInput style={styles.inputSolo} value={addressForm.city} onChangeText={(t) => setAddressForm({ ...addressForm, city: t })} />
              
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>State *</Text>
                  <TextInput style={styles.inputSolo} value={addressForm.state} onChangeText={(t) => setAddressForm({ ...addressForm, state: t })} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Pincode *</Text>
                  <TextInput style={styles.inputSolo} keyboardType="number-pad" value={addressForm.pincode} onChangeText={(t) => setAddressForm({ ...addressForm, pincode: t })} />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={() => setIsAddressModalOpen(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddressSubmit} disabled={savingAddress}>
                  {savingAddress ? (
                    <><ActivityIndicator size="small" color="#fff" /><Text style={styles.primaryBtnText}>Saving...</Text></>
                  ) : (
                    <><Save size={18} color="#fff" /><Text style={styles.primaryBtnText}>Save</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

          </View>
        </View>
      </Modal>

      {/* Logo Preview Modal */}
      <Modal visible={isLogoPreviewOpen} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setIsLogoPreviewOpen(false)}>
            <X size={26} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: logoAsset?.uri || logoUrl || undefined }}
            style={styles.logoPreviewFull}
            resizeMode="contain"
          />
        </View>
      </Modal>

      {/* Document Preview Modal (images only - PDFs open externally) */}
      <Modal visible={!!previewDocUrl} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewDocUrl(null)}>
            <X size={26} color="#fff" />
          </TouchableOpacity>
          {previewDocUrl && (
            <Image source={{ uri: previewDocUrl }} style={styles.logoPreviewFull} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#f9fafb" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: "#f3f4f6", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937" },
  cardBody: { padding: 24 },
  label: { fontSize: 14, fontWeight: "bold", color: "#374151", marginBottom: 8 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: "#1f2937" },
  inputSolo: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, fontSize: 16, color: "#1f2937" },
  primaryBtn: { backgroundColor: "#ea580c", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, alignSelf: "flex-end", marginTop: 8 },
  primaryBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff7ed", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#ffedd5" },
  addBtnText: { color: "#ea580c", fontWeight: "bold" },
  emptyState: { alignItems: "center", paddingVertical: 40, backgroundColor: "#f9fafb", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", borderStyle: "dashed" },
  emptyText: { color: "#6b7280", marginTop: 12, fontWeight: "500" },
  addressCard: { padding: 20, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, marginBottom: 16, backgroundColor: "#fff" },
  badge: { backgroundColor: "#ffedd5", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  badgeText: { color: "#c2410c", fontWeight: "bold", fontSize: 12 },
  addressTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937", marginBottom: 4 },
  addressSub: { fontSize: 14, color: "#4b5563", marginBottom: 2 },
  addressItalic: { fontSize: 12, fontStyle: "italic", color: "#6b7280", marginBottom: 4 },
  addressSubBold: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 4 },
  addressActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 16 },
  editBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 },
  editBtnText: { color: "#374151", fontWeight: "600" },
  deleteBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 8 },
  deleteBtnText: { color: "#ef4444", fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", backgroundColor: "#f9fafb", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  cancelBtnText: { color: "#4b5563", fontWeight: "bold", fontSize: 16 },
  modalSaveBtn: { backgroundColor: "#ea580c", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },

  logoRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  logoPreviewBox: { width: 80, height: 80, borderRadius: 16, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logoPreviewImg: { width: "100%", height: "100%" },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", borderWidth: 1, borderColor: "#fdba74", backgroundColor: "#fff7ed", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  outlineBtnText: { color: "#ea580c", fontWeight: "700", fontSize: 13 },
  docTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  primaryBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f0fdf4", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  primaryBadgeText: { color: "#16a34a", fontWeight: "800", fontSize: 11 },
  idTypeChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: "#f3f4f6", marginRight: 8, marginBottom: 8 },
  idTypeChipActive: { backgroundColor: "#ea580c" },
  idTypeChipText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  idTypeChipTextActive: { color: "#fff" },

  previewBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 8 },
  previewBtnText: { color: "#2563eb", fontWeight: "600" },
  docMissingFileText: { fontSize: 12, color: "#9ca3af", fontStyle: "italic", marginTop: 10 },

  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  previewCloseBtn: { position: "absolute", top: 50, right: 24, zIndex: 10, padding: 8 },
  logoPreviewFull: { width: "90%", height: "70%" },
});

export default SettingsManager;