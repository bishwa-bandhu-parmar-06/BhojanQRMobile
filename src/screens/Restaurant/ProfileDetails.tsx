import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Store, User, Phone, MapPin, FileText, Edit2 } from "lucide-react-native";

// FIX 1: Define types for the ProfileField props
interface ProfileFieldProps {
  label: string;
  value: string | undefined | null;
  icon: any; // 'any' prevents strict type clashing with Lucide-react-native components
}

const ProfileField: React.FC<ProfileFieldProps> = ({ label, value, icon: Icon }) => (
  <View style={styles.fieldContainer}>
    <View style={styles.labelRow}>
      <Icon size={14} color="#9ca3af" />
      <Text style={styles.labelText}>{label}</Text>
    </View>
    <Text style={styles.valueText}>{value}</Text>
  </View>
);

// FIX 2: Define types for the Restaurant object and ProfileDetails props
interface RestaurantData {
  restaurantName?: string;
  ownerName?: string;
  mobile?: string;
  address?: Array<{ street?: string; city?: string }>;
  govtIdDetails?: { idNumber?: string };
  status?: string;
  [key: string]: any; // Allows any other properties without throwing errors
}

interface ProfileDetailsProps {
  restaurant: RestaurantData | null;
  setActiveTab: (tab: string) => void;
}

const ProfileDetails: React.FC<ProfileDetailsProps> = ({ restaurant, setActiveTab }) => {
  if (!restaurant) return null;

  const addressString =
    restaurant.address && restaurant.address.length > 0
      ? `${restaurant.address[0].street || ""}, ${restaurant.address[0].city || ""}`.replace(/^, |, $/g, "")
      : "No address added yet";

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile Details</Text>
        <TouchableOpacity style={styles.editButton} onPress={() => setActiveTab("settings")}>
          <Edit2 size={16} color="#374151" />
          <Text style={styles.editButtonText}>Edit Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          <Store size={48} color="#f97316" />
        </View>
        
        <View style={styles.grid}>
          <ProfileField label="Restaurant Name" value={restaurant.restaurantName} icon={Store} />
          <ProfileField label="Owner Name" value={restaurant.ownerName} icon={User} />
          <ProfileField label="Mobile Number" value={restaurant.mobile} icon={Phone} />
          <ProfileField label="Primary Address" value={addressString} icon={MapPin} />
          <ProfileField label="Govt ID" value={restaurant.govtIdDetails?.idNumber || "N/A"} icon={FileText} />
          
          <View style={[styles.statusBadge, restaurant.status === "approved" ? styles.statusApproved : styles.statusPending]}>
            <Text style={[styles.statusText, restaurant.status === "approved" ? styles.textApproved : styles.textPending]}>
              Status: {restaurant.status?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1f2937" },
  editButton: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  editButtonText: { color: "#374151", fontWeight: "500" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: "#f3f4f6", flexDirection: "column", gap: 24 },
  avatarContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4, alignSelf: "center" },
  grid: { gap: 20 },
  fieldContainer: { marginBottom: 8 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  labelText: { fontSize: 12, color: "#9ca3af", fontWeight: "600", textTransform: "uppercase" },
  valueText: { fontSize: 18, fontWeight: "500", color: "#1f2937" },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  statusApproved: { backgroundColor: "#dcfce7" },
  statusPending: { backgroundColor: "#fef3c7" },
  statusText: { fontSize: 14, fontWeight: "600" },
  textApproved: { color: "#15803d" },
  textPending: { color: "#b45309" }
});

export default ProfileDetails;