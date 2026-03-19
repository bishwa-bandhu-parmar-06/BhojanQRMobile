import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  ActivityIndicator, 
  StyleSheet 
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
  Building 
} from "lucide-react-native";
import { useDispatch } from "react-redux";
import { updateUser } from "../../Features/AuthSlice";
import { 
  getRestaurantProfile, 
  updateRestaurantProfile, 
  addRestaurantAddress, 
  updateRestaurantAddress, 
  deleteRestaurantAddress 
} from "../../API/restaurentApi";

const SettingsManager = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getRestaurantProfile();
        const data = res.data.data;
        setProfileData({ 
          restaurantName: data.restaurantName || "", 
          ownerName: data.ownerName || "", 
          mobile: data.mobile || "" 
        });
        setAddresses(Array.isArray(data.address) ? data.address : data.address ? [data.address] : []);
      } catch (error: any) { // FIX: Type error as any
        Toast.show({ type: "error", text1: "Failed to load settings data" });
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

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
    try {
      await deleteRestaurantAddress(id);
      // FIX: Type 'prev' and 'addr'
      setAddresses((prev: any[]) => prev.filter((addr: any) => addr._id !== id));
      Toast.show({ type: "success", text1: "Address deleted!" });
    } catch (error: any) { // FIX: Type error as any
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to delete address" });
    }
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#f97316" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
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
              <ActivityIndicator color="#fff" />
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
                  >
                    <Pencil size={14} color="#4b5563" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDeleteAddress(addr._id)} 
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={14} color="#ef4444" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

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

            <ScrollView style={{ padding: 24 }} contentContainerStyle={{ paddingBottom: 40 }}>
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
                  {savingAddress ? <ActivityIndicator color="#fff" /> : <><Save size={18} color="#fff" /><Text style={styles.primaryBtnText}>Save</Text></>}
                </TouchableOpacity>
              </View>
            </ScrollView>

          </View>
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
  modalSaveBtn: { backgroundColor: "#ea580c", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 }
});

export default SettingsManager;