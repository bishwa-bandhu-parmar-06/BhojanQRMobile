import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import {
  LayoutDashboard,
  UtensilsCrossed,
  User,
  Settings,
  LogOut,
  Store,
  QrCode,
  ShoppingBag,
} from "lucide-react-native";

// FIX 1: Define the exact types expected for the SidebarItem props
interface SidebarItemProps {
  icon: any; // Using 'any' here prevents strict prop-type clashes with Lucide icons
  label: string;
  isActive: boolean;
  onClick: () => void;
}

// Sub-component specifically for the Sidebar
const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, isActive, onClick }) => (
  <TouchableOpacity
    onPress={onClick}
    style={[
      styles.sidebarItem,
      isActive ? styles.sidebarItemActive : styles.sidebarItemInactive,
    ]}
  >
    <Icon
      size={20}
      color={isActive ? "#ea580c" : "#9ca3af"} // orange-600 vs gray-400
    />
    <Text
      style={[
        styles.sidebarItemText,
        isActive ? styles.sidebarItemTextActive : styles.sidebarItemTextInactive,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// FIX 2: Define the exact types expected for the RestaurantSidebar props
interface RestaurantSidebarProps {
  restaurantName?: string; // The '?' means this prop is optional
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleLogout: () => void;
}

const RestaurantSidebar: React.FC<RestaurantSidebarProps> = ({
  restaurantName,
  activeTab,
  setActiveTab,
  handleLogout,
}) => {
  return (
    <View style={styles.sidebarContainer}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Store size={24} color="#ea580c" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text 
            style={styles.restaurantName} 
            numberOfLines={1} // Translates to 'truncate'
          >
            {restaurantName || "Restaurant"}
          </Text>
          <Text style={styles.subtitle}>Restaurant Panel</Text>
        </View>
      </View>

      {/* NAVIGATION SECTION */}
      <ScrollView 
        style={styles.nav}

        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        <SidebarItem
          icon={LayoutDashboard}
          label="Overview"
          isActive={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
        />
        <SidebarItem
          icon={ShoppingBag}
          label="Live Orders"
          isActive={activeTab === "orders"}
          onClick={() => setActiveTab("orders")}
        />
        <SidebarItem
          icon={UtensilsCrossed}
          label="Manage Menu"
          isActive={activeTab === "menu"}
          onClick={() => setActiveTab("menu")}
        />
        <SidebarItem
          icon={QrCode}
          label="Table QR Codes"
          isActive={activeTab === "qr"}
          onClick={() => setActiveTab("qr")}
        />
        <SidebarItem
          icon={User}
          label="Profile Details"
          isActive={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
        />
        <SidebarItem
          icon={Settings}
          label="Settings"
          isActive={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        />
      </ScrollView>

      {/* FOOTER SECTION */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <LogOut size={20} color="#dc2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Tailwind CSS to React Native StyleSheet translation
const styles = StyleSheet.create({
  sidebarContainer: {
    width: 256, // w-64
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb", // border-gray-200
    flexDirection: "column",
    flex: 1, // Allows it to fill the height in the parent flex row
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    padding: 24, // p-6
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6", // border-gray-100
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#ffedd5", // orange-100
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1, // Ensures text can truncate properly without overflowing
  },
  restaurantName: {
    fontWeight: "bold",
    color: "#1f2937", // gray-800
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280", // gray-500
    marginTop: 2,
  },
  nav: {
    flex: 1,
    paddingHorizontal: 16, // p-4 (horizontal part)
  },
  navContent: {
    paddingVertical: 16, // p-4 (vertical part)
    gap: 4, // space-y-1
  },
  sidebarItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sidebarItemActive: {
    backgroundColor: "#fff7ed", // bg-orange-50
  },
  sidebarItemInactive: {
    backgroundColor: "transparent",
  },
  sidebarItemText: {
    fontWeight: "500",
    fontSize: 16,
  },
  sidebarItemTextActive: {
    color: "#ea580c", // text-orange-600
  },
  sidebarItemTextInactive: {
    color: "#4b5563", // text-gray-600
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutText: {
    color: "#dc2626", // text-red-600
    fontWeight: "500",
    fontSize: 16,
  },
});

export default RestaurantSidebar;