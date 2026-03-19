import React, { useEffect, useState } from "react";
import { 
  View, 
  Text,
  ActivityIndicator, 
  StyleSheet, 
  Alert,
  TouchableOpacity,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../Features/AuthSlice";
import { getRestaurantProfile, logoutRestaurant } from "../../API/restaurentApi";

// Icons for our new Mobile Tab Navigation
import { 
  LayoutDashboard, 
  ClipboardList, 
  BookOpen, 
  QrCode, 
  User, 
  Settings, 
  LogOut 
} from "lucide-react-native";

// IMPORT MANAGERS
import OverviewManager from "./OverviewManager";
import MenuManager from "./MenuManager";
import SettingsManager from "./SettingsManager";
import QRManager from "./QRManager";
import OrderManager from "./OrderManager";
import ProfileDetails from "./ProfileDetails";

const RestaurantDashboard = () => {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getRestaurantProfile();
        setRestaurant(res.data.data);
      } catch (error: any) { 
        if (error.response?.status === 401 || error.response?.status === 403) {
          dispatch(logout());
          Alert.alert("Session Expired", "Please log in again.");
          navigation.navigate("RestaurentAuth"); 
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [navigation, dispatch]);

  useEffect(() => {
    if (user && restaurant) {
      setRestaurant((prev: any) => ({
        ...(prev || {}),
        restaurantName: user.restaurantName || user.name || prev?.restaurantName,
        ownerName: user.ownerName || prev?.ownerName,
        mobile: user.mobile || prev?.mobile,
      }));
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logoutRestaurant();
      dispatch(logout());
      Alert.alert("Success", "Logged out successfully");
      navigation.navigate("Home"); 
    } catch (error: any) { 
      Alert.alert("Error", "Error logging out");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  // Helper for generating mobile tabs
  const TabButton = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => {
    const isActive = activeTab === id;
    return (
      <TouchableOpacity 
        style={[styles.tabButton, isActive && styles.tabButtonActive]} 
        onPress={() => setActiveTab(id)}
      >
        <Icon size={18} color={isActive ? "#fff" : "#6b7280"} />
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 1. MOBILE HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {restaurant?.restaurantName || "Restaurant Partner"}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* 2. MOBILE SCROLLABLE TAB MENU (Replaces the Sidebar) */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollTabs}>
          <TabButton id="overview" label="Overview" icon={LayoutDashboard} />
          <TabButton id="orders" label="Orders" icon={ClipboardList} />
          <TabButton id="menu" label="Menu" icon={BookOpen} />
          <TabButton id="qr" label="QR Codes" icon={QrCode} />
          <TabButton id="profile" label="Profile" icon={User} />
          <TabButton id="settings" label="Settings" icon={Settings} />
        </ScrollView>
      </View>

      {/* 3. MAIN CONTENT AREA */}
      <View style={styles.mainContent}>
        {activeTab === "overview" && <OverviewManager />}
        {activeTab === "orders" && <OrderManager />}
        {activeTab === "menu" && <MenuManager />}
        {activeTab === "qr" && <QRManager restaurant={restaurant} />}
        {activeTab === "profile" && <ProfileDetails restaurant={restaurant} setActiveTab={setActiveTab} />}
        {activeTab === "settings" && <SettingsManager />}
      </View>

    </SafeAreaView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff", 
  },
  
  // Header Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
  },
  greeting: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1f2937",
    maxWidth: 250,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
  },

  // Tab Menu Styles
  tabContainer: {
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  scrollTabs: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: "#ea580c", // Orange active state
  },
  tabText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#ffffff",
  },

  // Content Area
  mainContent: {
    flex: 1,
    backgroundColor: "#f9fafb", 
  },
});

export default RestaurantDashboard;