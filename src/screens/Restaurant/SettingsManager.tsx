import React, { useEffect, useMemo, useState } from "react";
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
  BackHandler,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  Store,
  User,
  Phone,
  MapPin,
  Map,
  Navigation,
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
  ArrowLeft,
  ChevronRight,
  Check,
  Pencil,
} from "lucide-react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { pick, types } from "@react-native-documents/picker";
import { useDispatch, useSelector } from "react-redux";
import { updateUser } from "../../Features/AuthSlice";
import BhojanQRLoader from "../../components/BhojanQRLoader";
import CustomModal from "../../components/CustomModal";
import {
  getRestaurantProfile,
  updateRestaurantProfile,
  addRestaurantAddress,
  updateRestaurantAddress,
  deleteRestaurantAddress,
  updateRestaurantEmail,
  changeRestaurantPassword,
  uploadRestaurantLogo,
  deleteRestaurantLogo,
  addRestaurantDocument,
  updateRestaurantDocument,
  deleteRestaurantDocument,
} from "../../API/restaurentApi";
import SectionError from "../../components/SectionError";

const ID_TYPES = ["FSSAI", "GSTIN", "PAN", "Aadhar"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

const EMPTY_ADDRESS = { street: "", area: "", landmark: "", city: "", state: "", pincode: "" };

// The main screen is a read-only account summary. Everything that CHANGES
// something happens on one of these, opened from the header's settings icon,
// so the page you land on is never a wall of editable fields.
type SubScreen = null | "manage" | "basic" | "email" | "password" | "address" | "document";

type ConfirmState = {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
} | null;

export type ProfileAction = "manage";

type SettingsManagerProps = {
  autoOpenAddDoc?: boolean;
  onAutoOpenConsumed?: () => void;
  onSubScreenChange?: (open: boolean) => void;
  // Set by the settings icon on the section bar; opens the manage list.
  pendingAction?: ProfileAction | null;
  onActionConsumed?: () => void;
};

/* ---------------------------------------------------------------------------
   Building blocks, declared at module scope so they keep a stable component
   identity. Defining them inside the screen would make each render a new type
   and remount the subtree - on a text field that loses focus per keystroke.
--------------------------------------------------------------------------- */

const Section = ({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    <View style={styles.card}>{children}</View>
  </View>
);

// Read-only key/value row used all over the summary.
const DataRow = ({
  icon: Icon,
  label,
  value,
  isLast,
}: {
  icon: any;
  label: string;
  value?: string | null;
  isLast?: boolean;
}) => (
  <View style={[styles.row, !isLast && styles.rowDivider]}>
    <View style={styles.rowIcon}>
      <Icon size={17} color="#ea580c" />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, !value && styles.rowValueEmpty]} numberOfLines={2}>
        {value || "Not added yet"}
      </Text>
    </View>
  </View>
);

const Field = ({
  label,
  icon: Icon,
  hint,
  rightAccessory,
  ...inputProps
}: {
  label: string;
  icon?: any;
  hint?: string;
  rightAccessory?: React.ReactNode;
  [key: string]: any;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrap}>
      {Icon ? <Icon size={17} color="#9ca3af" /> : null}
      <TextInput
        style={styles.input}
        placeholderTextColor="#b8bec9"
        cursorColor="#ea580c"
        selectionColor="#fdba74"
        {...inputProps}
      />
      {rightAccessory}
    </View>
    {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
  </View>
);

const SaveButton = ({
  label,
  onPress,
  saving,
  disabled,
}: {
  label: string;
  onPress: () => void;
  saving: boolean;
  disabled: boolean;
}) => (
  <TouchableOpacity
    style={[styles.saveBtn, (disabled || saving) && styles.saveBtnDisabled]}
    onPress={onPress}
    disabled={disabled || saving}
    activeOpacity={0.85}
  >
    {saving ? (
      <ActivityIndicator size="small" color="#ffffff" />
    ) : (
      <Check size={17} color={disabled ? "#9ca3af" : "#ffffff"} />
    )}
    <Text style={[styles.saveBtnText, disabled && !saving && styles.saveBtnTextDisabled]}>
      {saving ? "Saving…" : label}
    </Text>
  </TouchableOpacity>
);

const SubBar = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <TouchableOpacity style={styles.subBar} onPress={onBack} activeOpacity={0.7}>
    <ArrowLeft size={18} color="#374151" />
    <Text style={styles.subBarText}>{title}</Text>
  </TouchableOpacity>
);

const SettingsManager = ({
  autoOpenAddDoc,
  onAutoOpenConsumed,
  onSubScreenChange,
  pendingAction,
  onActionConsumed,
}: SettingsManagerProps) => {
  const dispatch = useDispatch();
  const authUser = useSelector((state: any) => state.auth?.user);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [isLogoMenuOpen, setLogoMenuOpen] = useState(false);

  const [profileData, setProfileData] = useState<any>({ restaurantName: "", ownerName: "", mobile: "" });
  const [profileBaseline, setProfileBaseline] = useState<any>({ restaurantName: "", ownerName: "", mobile: "" });
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [savingAddress, setSavingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<any>(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [addressBaseline, setAddressBaseline] = useState<any>(EMPTY_ADDRESS);

  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [savingEmail, setSavingEmail] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showEmailPwd, setShowEmailPwd] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const [isLogoPreviewOpen, setIsLogoPreviewOpen] = useState(false);

  const [documents, setDocuments] = useState<any[]>([]);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({ idType: "FSSAI", idNumber: "" });
  const [docBaseline, setDocBaseline] = useState({ idType: "FSSAI", idNumber: "" });
  const [docAsset, setDocAsset] = useState<any>(null);
  const [savingDoc, setSavingDoc] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  /* ----------------------------- dirty tracking ---------------------------- */

  const isProfileDirty = useMemo(
    () =>
      profileData.restaurantName !== profileBaseline.restaurantName ||
      profileData.ownerName !== profileBaseline.ownerName ||
      profileData.mobile !== profileBaseline.mobile,
    [profileData, profileBaseline],
  );
  const isEmailReady = !!emailForm.newEmail.trim() && !!emailForm.currentPassword;
  const isPasswordReady =
    !!passwordForm.currentPassword &&
    passwordForm.newPassword.length >= 8 &&
    passwordForm.newPassword === passwordForm.confirmPassword;
  const isAddressDirty = useMemo(
    () => JSON.stringify(addressForm) !== JSON.stringify(addressBaseline),
    [addressForm, addressBaseline],
  );
  const isDocDirty = useMemo(
    () => !!docAsset || docForm.idNumber !== docBaseline.idNumber || docForm.idType !== docBaseline.idType,
    [docAsset, docForm, docBaseline],
  );

  /* ------------------------------ data loading ----------------------------- */

  const loadProfile = async () => {
    try {
      setLoadError(false);
      const res = await getRestaurantProfile();
      const data = res.data.data;
      const basics = {
        restaurantName: data.restaurantName || "",
        ownerName: data.ownerName || "",
        mobile: data.mobile || "",
      };
      setProfileData(basics);
      setProfileBaseline(basics);
      setEmail(data.email || authUser?.email || "");
      setAddresses(Array.isArray(data.address) ? data.address : data.address ? [data.address] : []);
      setLogoUrl(data.logoUrl || data.logo || null);
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load profile" });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onSubScreenChange?.(subScreen !== null);
  }, [subScreen, onSubScreenChange]);

  useEffect(() => () => onSubScreenChange?.(false), [onSubScreenChange]);

  // Back steps out of a form to the manage list, and out of the manage list to
  // the summary - one level at a time, rather than dumping you off the section.
  useEffect(() => {
    if (!subScreen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setSubScreen(subScreen === "manage" ? null : "manage");
      return true;
    });
    return () => sub.remove();
  }, [subScreen]);

  const openAddDoc = () => {
    setEditingDocId(null);
    setDocForm({ idType: "FSSAI", idNumber: "" });
    setDocBaseline({ idType: "FSSAI", idNumber: "" });
    setDocAsset(null);
    setSubScreen("document");
  };

  useEffect(() => {
    if (autoOpenAddDoc) {
      openAddDoc();
      onAutoOpenConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAddDoc]);

  useEffect(() => {
    if (!pendingAction) return;
    setSubScreen("manage");
    onActionConsumed?.();
  }, [pendingAction, onActionConsumed]);

  /* -------------------------------- actions -------------------------------- */

  const handleProfileSubmit = async () => {
    if (!profileData.restaurantName || !profileData.ownerName || !profileData.mobile) {
      Toast.show({ type: "error", text1: "Please fill all basic details." });
      return;
    }
    setSavingProfile(true);
    try {
      await updateRestaurantProfile(profileData);
      dispatch(updateUser({ ...profileData, name: profileData.restaurantName }));
      setProfileBaseline(profileData);
      Toast.show({ type: "success", text1: "Profile updated" });
      // Straight back to the summary, where the new values are on screen -
      // that IS the confirmation, so no extra step is needed.
      setSubScreen(null);
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to update profile" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEmailSubmit = async () => {
    setSavingEmail(true);
    try {
      const res = await updateRestaurantEmail(emailForm.newEmail.trim(), emailForm.currentPassword);
      setEmail(emailForm.newEmail.trim());
      Toast.show({ type: "success", text1: res.data?.message || "Email updated" });
      setEmailForm({ newEmail: "", currentPassword: "" });
      setSubScreen(null);
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to update email" });
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setSavingPassword(true);
    try {
      await changeRestaurantPassword(passwordForm.currentPassword, passwordForm.newPassword);
      Toast.show({ type: "success", text1: "Password updated" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSubScreen(null);
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to update password" });
    } finally {
      setSavingPassword(false);
    }
  };

  // Pick and upload in one go. Splitting it into "choose" then "upload" left a
  // half-done state on screen where the avatar showed an image that was not
  // actually saved yet.
  const handleReplaceLogo = async () => {
    setLogoMenuOpen(false);
    const result = await launchImageLibrary({ mediaType: "photo", quality: 0.8 });
    if (result.didCancel || !result.assets?.length) return;
    const asset = result.assets[0];

    setSavingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", {
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        name: asset.fileName || "logo.jpg",
      } as any);
      const res = await uploadRestaurantLogo(formData);
      setLogoUrl(res.data?.data?.logoUrl || null);
      Toast.show({ type: "success", text1: "Logo updated" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to upload logo" });
    } finally {
      setSavingLogo(false);
    }
  };

  const removeLogo = async () => {
    setSavingLogo(true);
    try {
      await deleteRestaurantLogo();
      setLogoUrl(null);
      Toast.show({ type: "success", text1: "Logo removed" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to remove logo" });
    } finally {
      setSavingLogo(false);
    }
  };

  const confirmRemoveLogo = () => {
    setLogoMenuOpen(false);
    setConfirmState({
      title: "Remove logo?",
      message:
        "Your menu page will fall back to showing the first letter of your restaurant's name until you upload a new one.",
      confirmText: "Remove logo",
      onConfirm: removeLogo,
    });
  };

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm(EMPTY_ADDRESS);
    setAddressBaseline(EMPTY_ADDRESS);
    setSubScreen("address");
  };

  const openEditAddress = (addr: any) => {
    const form = {
      street: addr.street || "",
      area: addr.area || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
    };
    setEditingAddressId(addr._id);
    setAddressForm(form);
    setAddressBaseline(form);
    setSubScreen("address");
  };

  const handleAddressSubmit = async () => {
    if (!addressForm.street || !addressForm.city || !addressForm.state || !addressForm.pincode) {
      Toast.show({ type: "error", text1: "Please fill all required address fields." });
      return;
    }
    setSavingAddress(true);
    try {
      const res = editingAddressId
        ? await updateRestaurantAddress(editingAddressId, addressForm)
        : await addRestaurantAddress(addressForm);
      if (res.data.data) setAddresses(res.data.data);
      Toast.show({ type: "success", text1: editingAddressId ? "Location updated" : "Location added" });
      setSubScreen(null);
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to save address" });
    } finally {
      setSavingAddress(false);
    }
  };

  const deleteAddress = async (id: string) => {
    setDeletingAddressId(id);
    try {
      await deleteRestaurantAddress(id);
      setAddresses((prev: any[]) => prev.filter((addr: any) => addr._id !== id));
      Toast.show({ type: "success", text1: "Location deleted" });
      setSubScreen(null);
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to delete address" });
    } finally {
      setDeletingAddressId(null);
    }
  };

  const confirmDeleteAddress = (addr: any) =>
    setConfirmState({
      title: "Delete this location?",
      message: `${addr.street}${addr.city ? `, ${addr.city}` : ""} will be removed from your profile. This cannot be undone.`,
      confirmText: "Delete location",
      onConfirm: () => deleteAddress(addr._id),
    });

  const openEditDoc = (doc: any) => {
    const form = { idType: doc.idType, idNumber: doc.idNumber || "" };
    setEditingDocId(doc._id);
    setDocForm(form);
    setDocBaseline(form);
    setDocAsset(null);
    setSubScreen("document");
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
      setSubScreen(null);
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to save document" });
    } finally {
      setSavingDoc(false);
    }
  };

  const deleteDoc = async (docId: string) => {
    setDeletingDocId(docId);
    try {
      await deleteRestaurantDocument(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      Toast.show({ type: "success", text1: "Document deleted" });
      setSubScreen(null);
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to delete document" });
    } finally {
      setDeletingDocId(null);
    }
  };

  const confirmDeleteDoc = (doc: any) =>
    setConfirmState({
      title: `Delete ${doc.idType}?`,
      message:
        "The document and its uploaded file will be removed. You may need to re-upload it to keep your account verified.",
      confirmText: "Delete document",
      onConfirm: () => deleteDoc(doc._id),
    });

  const handlePreviewDoc = (doc: any) => {
    if (!doc.documentUrl) return;
    const ext = doc.documentUrl.split(".").pop()?.toLowerCase().split("?")[0];
    if (ext && IMAGE_EXTENSIONS.includes(ext)) {
      setPreviewDocUrl(doc.documentUrl);
    } else {
      Linking.openURL(doc.documentUrl).catch(() =>
        Toast.show({ type: "error", text1: "Unable to open document" }),
      );
    }
  };

  /* -------------------------------- render --------------------------------- */

  if (loading) return <BhojanQRLoader />;

  if (loadError && !profileData.restaurantName && !profileData.ownerName) {
    return (
      <View style={styles.container}>
        <SectionError message="Failed to load profile." onRetry={loadProfile} />
      </View>
    );
  }

  const initial = (profileBaseline.restaurantName || "R").trim().charAt(0).toUpperCase();

  const confirmModal = (
    <CustomModal
      visible={!!confirmState}
      type="logout"
      title={confirmState?.title || ""}
      message={confirmState?.message || ""}
      confirmText={confirmState?.confirmText || "Delete"}
      cancelText="Keep"
      onConfirm={() => {
        confirmState?.onConfirm();
        setConfirmState(null);
      }}
      onCancel={() => setConfirmState(null)}
    />
  );

  const wrap = (title: string, body: React.ReactNode) => (
    <View style={styles.container}>
      <SubBar title={title} onBack={() => setSubScreen("manage")} />
      <ScrollView
        contentContainerStyle={styles.subContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
      {confirmModal}
    </View>
  );

  if (subScreen === "manage") {
    const manageRows = [
      { key: "logo", icon: ImageIcon, label: "Restaurant logo", hint: logoUrl ? "Replace the current logo" : "Add a logo", onPress: () => setLogoMenuOpen(true) },
      { key: "basic", icon: Store, label: "Basic details", hint: "Name, owner, mobile", onPress: () => setSubScreen("basic") },
      { key: "email", icon: Mail, label: "Change email", hint: email || "Login email", onPress: () => setSubScreen("email") },
      { key: "password", icon: Lock, label: "Change password", hint: "Update your login password", onPress: () => setSubScreen("password") },
      { key: "address", icon: MapPin, label: "Add location", hint: `${addresses.length} saved`, onPress: openAddAddress },
      { key: "document", icon: FileText, label: "Add document", hint: `${documents.length} uploaded`, onPress: openAddDoc },
    ];

    return (
      <View style={styles.container}>
        <SubBar title="Manage Profile" onBack={() => setSubScreen(null)} />
        <ScrollView contentContainerStyle={styles.subContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {manageRows.map(({ key, icon: Icon, label, hint, onPress }, index) => (
              <TouchableOpacity
                key={key}
                style={[styles.row, index !== manageRows.length - 1 && styles.rowDivider]}
                onPress={onPress}
                activeOpacity={0.7}
              >
                <View style={styles.rowIcon}>
                  <Icon size={17} color="#ea580c" />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowHint} numberOfLines={1}>
                    {hint}
                  </Text>
                </View>
                <ChevronRight size={17} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        {confirmModal}
        {logoMenu()}
      </View>
    );
  }

  if (subScreen === "basic") {
    return wrap(
      "Basic Details",
      <View style={styles.card}>
        <View style={styles.cardPad}>
          <Field
            label="Restaurant name"
            icon={Store}
            value={profileData.restaurantName}
            onChangeText={(t: string) => setProfileData({ ...profileData, restaurantName: t })}
          />
          <Field
            label="Owner name"
            icon={User}
            value={profileData.ownerName}
            onChangeText={(t: string) => setProfileData({ ...profileData, ownerName: t })}
          />
          <Field
            label="Mobile number"
            icon={Phone}
            keyboardType="phone-pad"
            value={profileData.mobile}
            onChangeText={(t: string) => setProfileData({ ...profileData, mobile: t })}
          />
          <SaveButton
            label="Save changes"
            onPress={handleProfileSubmit}
            saving={savingProfile}
            disabled={!isProfileDirty}
          />
        </View>
      </View>,
    );
  }

  if (subScreen === "email") {
    return wrap(
      "Change Email",
      <View style={styles.card}>
        <View style={styles.cardPad}>
          <Text style={styles.currentValue}>Current: {email || "—"}</Text>
          <Field
            label="New email address"
            icon={Mail}
            placeholder="you@restaurant.com"
            autoCapitalize="none"
            keyboardType="email-address"
            importantForAutofill="no"
            autoComplete="off"
            value={emailForm.newEmail}
            onChangeText={(t: string) => setEmailForm({ ...emailForm, newEmail: t })}
          />
          <Field
            label="Current password"
            icon={Lock}
            placeholder="Confirm it's you"
            importantForAutofill="no"
            autoComplete="off"
            secureTextEntry={!showEmailPwd}
            value={emailForm.currentPassword}
            onChangeText={(t: string) => setEmailForm({ ...emailForm, currentPassword: t })}
            rightAccessory={
              <TouchableOpacity onPress={() => setShowEmailPwd(!showEmailPwd)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showEmailPwd ? <EyeOff size={17} color="#9ca3af" /> : <Eye size={17} color="#9ca3af" />}
              </TouchableOpacity>
            }
          />
          <SaveButton label="Update email" onPress={handleEmailSubmit} saving={savingEmail} disabled={!isEmailReady} />
        </View>
      </View>,
    );
  }

  if (subScreen === "password") {
    return wrap(
      "Change Password",
      <View style={styles.card}>
        <View style={styles.cardPad}>
          <Field
            label="Current password"
            icon={Lock}
            importantForAutofill="no"
            autoComplete="off"
            secureTextEntry={!showPwd}
            value={passwordForm.currentPassword}
            onChangeText={(t: string) => setPasswordForm({ ...passwordForm, currentPassword: t })}
            rightAccessory={
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showPwd ? <EyeOff size={17} color="#9ca3af" /> : <Eye size={17} color="#9ca3af" />}
              </TouchableOpacity>
            }
          />
          <Field
            label="New password"
            icon={Lock}
            placeholder="At least 8 characters"
            importantForAutofill="no"
            autoComplete="off"
            secureTextEntry={!showPwd}
            value={passwordForm.newPassword}
            onChangeText={(t: string) => setPasswordForm({ ...passwordForm, newPassword: t })}
          />
          <Field
            label="Confirm new password"
            icon={Lock}
            importantForAutofill="no"
            autoComplete="off"
            secureTextEntry={!showPwd}
            value={passwordForm.confirmPassword}
            onChangeText={(t: string) => setPasswordForm({ ...passwordForm, confirmPassword: t })}
            hint={
              passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
                ? "Passwords don't match yet"
                : undefined
            }
          />
          <SaveButton
            label="Update password"
            onPress={handlePasswordSubmit}
            saving={savingPassword}
            disabled={!isPasswordReady}
          />
        </View>
      </View>,
    );
  }

  if (subScreen === "address") {
    return wrap(
      editingAddressId ? "Edit Location" : "Add Location",
      <>
        <View style={styles.card}>
          <View style={styles.cardPad}>
            <Field
              label="Street address *"
              icon={MapPin}
              placeholder="Shop no, building"
              value={addressForm.street}
              onChangeText={(t: string) => setAddressForm({ ...addressForm, street: t })}
            />
            <Field
              label="Area / locality"
              icon={Map}
              placeholder="e.g. Connaught Place"
              value={addressForm.area}
              onChangeText={(t: string) => setAddressForm({ ...addressForm, area: t })}
            />
            <Field
              label="Nearby landmark"
              icon={Navigation}
              placeholder="e.g. near the metro"
              value={addressForm.landmark}
              onChangeText={(t: string) => setAddressForm({ ...addressForm, landmark: t })}
            />
            <Field
              label="City *"
              icon={Building}
              value={addressForm.city}
              onChangeText={(t: string) => setAddressForm({ ...addressForm, city: t })}
            />
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Field
                  label="State *"
                  value={addressForm.state}
                  onChangeText={(t: string) => setAddressForm({ ...addressForm, state: t })}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Field
                  label="Pincode *"
                  keyboardType="number-pad"
                  value={addressForm.pincode}
                  onChangeText={(t: string) => setAddressForm({ ...addressForm, pincode: t })}
                />
              </View>
            </View>
            <SaveButton
              label={editingAddressId ? "Save changes" : "Add location"}
              onPress={handleAddressSubmit}
              saving={savingAddress}
              disabled={!isAddressDirty}
            />
          </View>
        </View>

        {editingAddressId && (
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => {
              const addr = addresses.find((a) => a._id === editingAddressId);
              if (addr) confirmDeleteAddress(addr);
            }}
            disabled={deletingAddressId === editingAddressId}
            activeOpacity={0.8}
          >
            {deletingAddressId === editingAddressId ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Trash2 size={17} color="#ef4444" />
            )}
            <Text style={styles.dangerBtnText}>Delete this location</Text>
          </TouchableOpacity>
        )}
      </>,
    );
  }

  if (subScreen === "document") {
    const editingDoc = documents.find((d) => d._id === editingDocId);
    return wrap(
      editingDocId ? "Edit Document" : "Add Document",
      <>
        <View style={styles.card}>
          <View style={styles.cardPad}>
            {!editingDocId && (
              <View style={styles.field}>
                <Text style={styles.label}>Document type *</Text>
                <View style={styles.chipRow}>
                  {ID_TYPES.map((t) => {
                    const active = docForm.idType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setDocForm({ ...docForm, idType: t })}
                        style={[styles.chip, active && styles.chipActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <Field
              label={`ID number${editingDocId ? "" : " *"}`}
              icon={FileText}
              placeholder="Document ID number"
              value={docForm.idNumber}
              onChangeText={(t: string) => setDocForm({ ...docForm, idNumber: t })}
            />

            <View style={styles.field}>
              <Text style={styles.label}>{editingDocId ? "Replace file" : "Upload file *"}</Text>
              <TouchableOpacity style={styles.filePicker} onPress={handlePickDoc} activeOpacity={0.8}>
                <FileText size={17} color="#ea580c" />
                <Text style={styles.filePickerText} numberOfLines={1}>
                  {docAsset ? docAsset.name || "File selected" : "Choose a PDF or image"}
                </Text>
              </TouchableOpacity>
            </View>

            <SaveButton
              label={editingDocId ? "Save changes" : "Add document"}
              onPress={handleDocSubmit}
              saving={savingDoc}
              disabled={!isDocDirty}
            />
          </View>
        </View>

        {editingDoc && !editingDoc.isPrimary && (
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => confirmDeleteDoc(editingDoc)}
            disabled={deletingDocId === editingDoc._id}
            activeOpacity={0.8}
          >
            {deletingDocId === editingDoc._id ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Trash2 size={17} color="#ef4444" />
            )}
            <Text style={styles.dangerBtnText}>Delete this document</Text>
          </TouchableOpacity>
        )}
        {editingDoc?.isPrimary && (
          <Text style={styles.dangerNote}>
            This is your primary document and cannot be deleted. Replace the file instead.
          </Text>
        )}
      </>,
    );
  }

  /* ------------------------------ summary view ----------------------------- */

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.identity}>
          <View>
            <TouchableOpacity
              style={styles.avatar}
              activeOpacity={logoUrl ? 0.7 : 1}
              onPress={() => logoUrl && setIsLogoPreviewOpen(true)}
            >
              {savingLogo ? (
                <ActivityIndicator color="#ea580c" />
              ) : logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.avatarImg} />
              ) : (
                // No logo: the restaurant's initial on the brand tint reads as
                // a deliberate monogram rather than a broken image slot.
                <Text style={styles.avatarInitial}>{initial}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarEdit}
              onPress={() => setLogoMenuOpen(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change logo"
            >
              <Pencil size={13} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.identityName} numberOfLines={1}>
            {profileBaseline.restaurantName || "Your restaurant"}
          </Text>
          {!!profileBaseline.ownerName && (
            <Text style={styles.identityOwner} numberOfLines={1}>
              {profileBaseline.ownerName}
            </Text>
          )}
        </View>

        <Section title="Restaurant">
          <DataRow icon={Store} label="Restaurant name" value={profileBaseline.restaurantName} />
          <DataRow icon={User} label="Owner name" value={profileBaseline.ownerName} />
          <DataRow icon={Phone} label="Mobile number" value={profileBaseline.mobile} />
          <DataRow icon={Mail} label="Login email" value={email} isLast />
        </Section>

        <Section title="Locations" caption={`${addresses.length} saved`}>
          {addresses.length === 0 ? (
            <View style={styles.emptyRow}>
              <Building size={22} color="#d1d5db" />
              <Text style={styles.emptyRowText}>No locations yet</Text>
            </View>
          ) : (
            addresses.map((addr: any, index: number) => (
              <TouchableOpacity
                key={addr._id || index}
                style={[styles.row, index !== addresses.length - 1 && styles.rowDivider]}
                onPress={() => openEditAddress(addr)}
                activeOpacity={0.7}
              >
                <View style={styles.rowIcon}>
                  <MapPin size={17} color="#ea580c" />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {addr.street}
                  </Text>
                  <Text style={styles.rowHint} numberOfLines={1}>
                    {[addr.area, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
                  </Text>
                </View>
                <ChevronRight size={17} color="#cbd5e1" />
              </TouchableOpacity>
            ))
          )}
        </Section>

        <Section title="Documents" caption="Government ID used to verify your account.">
          {documents.length === 0 ? (
            <View style={styles.emptyRow}>
              <FileText size={22} color="#d1d5db" />
              <Text style={styles.emptyRowText}>No documents uploaded</Text>
            </View>
          ) : (
            documents.map((doc: any, index: number) => (
              <View key={doc._id} style={[styles.row, index !== documents.length - 1 && styles.rowDivider]}>
                <View style={styles.rowIcon}>
                  <FileText size={17} color="#ea580c" />
                </View>
                <TouchableOpacity style={styles.rowText} onPress={() => openEditDoc(doc)} activeOpacity={0.7}>
                  <View style={styles.docTitleRow}>
                    <Text style={styles.rowLabel}>{doc.idType}</Text>
                    {doc.isPrimary && (
                      <View style={styles.primaryPill}>
                        <ShieldCheck size={10} color="#16a34a" />
                        <Text style={styles.primaryPillText}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rowHint} numberOfLines={1}>
                    {doc.documentUrl ? doc.idNumber : `${doc.idNumber} · no file uploaded`}
                  </Text>
                </TouchableOpacity>
                {doc.documentUrl ? (
                  <TouchableOpacity
                    onPress={() => handlePreviewDoc(doc)}
                    hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                    style={styles.rowAction}
                  >
                    <Eye size={16} color="#2563eb" />
                  </TouchableOpacity>
                ) : null}
                <ChevronRight size={17} color="#cbd5e1" />
              </View>
            ))
          )}
        </Section>
      </ScrollView>

      {confirmModal}
      {logoMenu()}

      <Modal visible={isLogoPreviewOpen} transparent animationType="fade" onRequestClose={() => setIsLogoPreviewOpen(false)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setIsLogoPreviewOpen(false)}>
            <X size={26} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: logoUrl || undefined }} style={styles.previewFull} resizeMode="contain" />
        </View>
      </Modal>

      <Modal visible={!!previewDocUrl} transparent animationType="fade" onRequestClose={() => setPreviewDocUrl(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewDocUrl(null)}>
            <X size={26} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: previewDocUrl || undefined }} style={styles.previewFull} resizeMode="contain" />
        </View>
      </Modal>
    </View>
  );

  // Declared after the returns purely so both the summary and the manage list
  // can render the same sheet without duplicating it.
  function logoMenu() {
    return (
      <Modal visible={isLogoMenuOpen} transparent animationType="fade" onRequestClose={() => setLogoMenuOpen(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setLogoMenuOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <Text style={styles.sheetTitle}>Restaurant logo</Text>

            <TouchableOpacity style={styles.sheetRow} onPress={handleReplaceLogo} activeOpacity={0.7}>
              <View style={styles.rowIcon}>
                <ImageIcon size={17} color="#ea580c" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{logoUrl ? "Replace logo" : "Upload logo"}</Text>
                <Text style={styles.rowHint}>Choose an image from this device</Text>
              </View>
            </TouchableOpacity>

            {/* No "View logo" row: tapping the avatar itself already opens the
                full-size preview, so this would have been a second door onto
                the same thing. */}
            {logoUrl ? (
              <TouchableOpacity style={styles.sheetRow} onPress={confirmRemoveLogo} activeOpacity={0.7}>
                <View style={[styles.rowIcon, styles.rowIconDanger]}>
                  <Trash2 size={17} color="#ef4444" />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, styles.rowLabelDanger]}>Remove logo</Text>
                  <Text style={styles.rowHint}>Fall back to the name's initial</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.sheetCancel} onPress={() => setLogoMenuOpen(false)} activeOpacity={0.8}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }
};

export default SettingsManager;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 40 },
  subContent: { padding: 16, paddingBottom: 48 },

  subBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
  },
  subBarText: { fontSize: 16, fontWeight: "800", color: "#1f2937" },

  identity: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarInitial: { fontSize: 38, fontWeight: "900", color: "#ea580c" },
  // Sits on the avatar's edge with a white ring, so it reads as attached to
  // the image rather than floating over it.
  avatarEdit: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  identityName: { fontSize: 19, fontWeight: "800", color: "#1f2937", marginTop: 16 },
  identityOwner: { fontSize: 13, color: "#6b7280", marginTop: 2 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#9ca3af",
  },
  sectionCaption: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
    marginTop: 10,
  },
  cardPad: { padding: 16 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDanger: { backgroundColor: "#fef2f2" },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  rowLabelDanger: { color: "#ef4444" },
  rowHint: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  rowValue: { fontSize: 13, color: "#4b5563", marginTop: 2, fontWeight: "600" },
  rowValueEmpty: { color: "#b8bec9", fontWeight: "500", fontStyle: "italic" },
  rowAction: { padding: 4 },
  docTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  primaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  primaryPillText: { fontSize: 9, fontWeight: "800", color: "#16a34a" },

  emptyRow: { alignItems: "center", gap: 8, paddingVertical: 28 },
  emptyRowText: { fontSize: 13, color: "#9ca3af", fontWeight: "600" },

  field: { marginBottom: 16 },
  fieldRow: { flexDirection: "row", gap: 12 },
  fieldHalf: { flex: 1 },
  label: { fontSize: 12, fontWeight: "700", color: "#6b7280", marginBottom: 7 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  input: { flex: 1, fontSize: 15, color: "#1f2937", fontWeight: "500", padding: 0 },
  fieldHint: { fontSize: 11, color: "#ef4444", marginTop: 6, fontWeight: "600" },
  currentValue: { fontSize: 12, color: "#9ca3af", fontWeight: "600", marginBottom: 14 },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#ea580c",
    marginTop: 4,
  },
  saveBtnDisabled: { backgroundColor: "#f1f5f9" },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
  saveBtnTextDisabled: { color: "#9ca3af" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#fff7ed", borderColor: "#ea580c" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  chipTextActive: { color: "#ea580c" },

  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#fdba74",
  },
  filePickerText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#ea580c" },

  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  dangerBtnText: { fontSize: 14, fontWeight: "800", color: "#ef4444" },
  dangerNote: {
    fontSize: 12,
    lineHeight: 18,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 16,
  },

  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 8,
  },
  sheetGrip: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#9ca3af",
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  sheetCancel: {
    marginTop: 6,
    marginHorizontal: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCancelText: { fontSize: 14, fontWeight: "800", color: "#4b5563" },

  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  previewCloseBtn: { position: "absolute", top: 40, right: 20, zIndex: 10, padding: 10 },
  previewFull: { width: "90%", height: "70%" },
});
