import React, { useCallback, useEffect, useState } from "react";
import { 
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { logout, updateUser } from "../../Features/AuthSlice";
import { getRestaurantProfile, logoutRestaurant } from "../../API/restaurentApi";
import { logoutStaff } from "../../API/staffApi";
import { canAccessTab, getDefaultTab } from "../../constants/dashboardTabs";
import type { Permission } from "../../constants/permissions";

import CustomModal from "../../components/CustomModal";
import BhojanQRLoader from "../../components/BhojanQRLoader";

// Icons for our new Mobile Tab Navigation
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  QrCode,
  User,
  Settings,
  LogOut,
  LayoutGrid,
  Users,
  Sparkles,
  Bell,
  AlertTriangle,
} from "lucide-react-native";

// IMPORT MANAGERS
import OverviewManager from "./OverviewManager";
import MenuManager from "./MenuManager";
import SettingsManager from "./SettingsManager";
import QRManager from "./QRManager";
import OrderManager from "./OrderManager";
import ProfileDetails from "./ProfileDetails";
import ActiveTablesManager from "./ActiveTablesManager";
import StaffManager from "./StaffManager";
import HappyHoursManager from "./HappyHoursManager";
import NotificationManager from "./NotificationManager";

const RestaurantDashboard = () => {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // MODAL STATES
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isSessionExpiredModalVisible, setSessionExpiredModalVisible] = useState(false); //  Added this missing state

  // REFRESH STATES
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // When the owner taps "Add Documents" on the suspension warning banner
  // (shown on every tab), we jump to Settings and ask it to auto-open the
  // add-document modal so they land directly on the form instead of having
  // to scroll and find it themselves.
  const [autoOpenAddDoc, setAutoOpenAddDoc] = useState(false);

  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);

  // A staff login (role: "staff") has its own JWT, but /restaurants/profile
  // is hard-restricted to the owner on the backend (authorize("restaurant")
  // - see restaurantRoutes.js) and 403s for staff regardless of permissions.
  // Calling it unconditionally here would log every staff member straight
  // back out the moment their dashboard loaded.
  const isOwner = user?.role === "restaurant";
  const staffPermissions: Permission[] = isOwner ? [] : user?.permissions || [];
  const can = (...perms: Permission[]) => perms.some((p) => staffPermissions.includes(p));

  const fetchProfile = async () => {
    if (!isOwner) {
      // Staff don't have their own restaurant profile. The login response
      // (server/utils/sendTokenResponse.js) flattens the owning restaurant's
      // name straight onto the user object as `restaurantName` - there is no
      // nested `user.restaurant` object, just a separate `restaurantId`.
      setRestaurant({ restaurantName: user?.restaurantName });
      return;
    }
    try {
      const res = await getRestaurantProfile();
      // Covers a persisted session resuming straight into this screen
      // without going through RestaurentAuth's login handler again - a
      // still-pending owner should never see the dashboard itself.
      if (res.data.data?.status === "pending") {
        dispatch(updateUser({ status: "pending" }));
        navigation.navigate("PendingApproval");
        return;
      }
      setRestaurant(res.data.data);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        dispatch(logout());
        setSessionExpiredModalVisible(true); // Ye ab error nahi dega
      }
    }
  };

  // Initial Load - intentionally mount-only, like the tab-default effect
  // below; fetchProfile/isOwner/user are all settled by the time PersistGate
  // finishes rehydrating, before this ever mounts.
  useEffect(() => {
    fetchProfile().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, dispatch]);

  // Land on the first tab this user (owner or staff) is actually allowed to
  // see, rather than always assuming "overview" (which needs view_reports -
  // a staff member without it would otherwise open onto a blank tab).
  useEffect(() => {
    setActiveTab(getDefaultTab({ isOwner, can }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, user?.permissions]);

  useEffect(() => {
    if (!user) return;
    setRestaurant((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        restaurantName: user.restaurantName || user.name || prev?.restaurantName,
        ownerName: user.ownerName || prev?.ownerName,
        mobile: user.mobile || prev?.mobile,
      };
    });
  }, [user]);

  // Intentionally mount-stable - see Initial Load effect above.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshKey(prev => prev + 1);
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await (isOwner ? logoutRestaurant() : logoutStaff());
      dispatch(logout());
      navigation.navigate("Home");
    } catch (error: any) {
      console.log("Error logging out", error);
    }
  };

  if (isLoading) {
    return <BhojanQRLoader message="Loading Dashboard..." />;
  }

  // Only the primary document is guaranteed to exist (captured at
  // registration as idType/idNumber with no file required) - the banner
  // should only disappear once an actual file has been uploaded for it.
  const hasUploadedDocument = Array.isArray(restaurant?.documents) && restaurant.documents.some((d: any) => d.documentUrl);
  const showDocumentWarning = isOwner && !!restaurant && !hasUploadedDocument;

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
      
      <CustomModal
        visible={isLogoutModalVisible}
        title="Log Out?"
        message="Are you sure you want to securely log out of your dashboard?"
        type="logout"
        confirmText="Yes, Log Out"
        cancelText="Cancel"
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
     
      <CustomModal 
        visible={isSessionExpiredModalVisible}
        type="error"
        title="Session Expired"
        message="Your login session has expired for security reasons. Please log in again to continue."
        confirmText="Log In Again"
        onConfirm={() => {
           setSessionExpiredModalVisible(false);
           navigation.navigate(isOwner ? "Login/Signup" : "StaffAuth");
        }}
      />

      {/* 1. MOBILE HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {restaurant?.restaurantName || "Restaurant Partner"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setLogoutModalVisible(true)} style={styles.logoutButton}>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* 2. MOBILE SCROLLABLE TAB MENU */}
      <View style={styles.tabContainer}>
        <ScrollView  keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollTabs} >
          {canAccessTab("overview", { isOwner, can }) && <TabButton id="overview" label="Overview" icon={LayoutDashboard} />}
          {canAccessTab("orders", { isOwner, can }) && <TabButton id="orders" label="Orders" icon={ClipboardList} />}
          {canAccessTab("active_tables", { isOwner, can }) && <TabButton id="active_tables" label="Active Tables" icon={LayoutGrid} />}
          {canAccessTab("menu", { isOwner, can }) && <TabButton id="menu" label="Menu" icon={BookOpen} />}
          {canAccessTab("staff", { isOwner, can }) && <TabButton id="staff" label="Staff" icon={Users} />}
          {canAccessTab("marketing", { isOwner, can }) && <TabButton id="marketing" label="Happy Hours" icon={Sparkles} />}
          {canAccessTab("qr", { isOwner, can }) && <TabButton id="qr" label="QR Codes" icon={QrCode} />}
          {canAccessTab("notifications", { isOwner, can }) && <TabButton id="notifications" label="Notifications" icon={Bell} />}
          {canAccessTab("profile", { isOwner, can }) && <TabButton id="profile" label="Profile" icon={User} />}
          {canAccessTab("settings", { isOwner, can }) && <TabButton id="settings" label="Settings" icon={Settings} />}
        </ScrollView>
      </View>

      {/* 3. DOCUMENT SUSPENSION WARNING - shown above every tab until at
          least one government document has an uploaded file. */}
      {showDocumentWarning && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={20} color="#b45309" />
          <Text style={styles.warningText}>
            Upload your government document or your account may be suspended.
          </Text>
          <TouchableOpacity
            style={styles.warningBtn}
            onPress={() => {
              setActiveTab("settings");
              setAutoOpenAddDoc(true);
            }}
          >
            <Text style={styles.warningBtnText}>Add Documents</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MenuManager owns its own full-screen scrolling (MenuList renders a
          FlatList), so it's rendered in a plain flex view instead of the
          pull-to-refresh ScrollView below - nesting a FlatList inside a
          ScrollView of the same orientation breaks virtualization and trips
          React Native's "VirtualizedLists should never be nested" warning. */}
      {activeTab === "menu" && canAccessTab("menu", { isOwner, can }) ? (
        <View style={styles.mainContent}>
          <MenuManager key={refreshKey} />
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.mainContent}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#ea580c"]}
              tintColor="#ea580c"
            />
          }
        >
          {activeTab === "overview" && canAccessTab("overview", { isOwner, can }) && <OverviewManager key={refreshKey} />}
          {activeTab === "orders" && canAccessTab("orders", { isOwner, can }) && <OrderManager key={refreshKey} />}
          {activeTab === "active_tables" && canAccessTab("active_tables", { isOwner, can }) && <ActiveTablesManager key={refreshKey} />}
          {activeTab === "staff" && canAccessTab("staff", { isOwner, can }) && <StaffManager key={refreshKey} />}
          {activeTab === "marketing" && canAccessTab("marketing", { isOwner, can }) && <HappyHoursManager key={refreshKey} />}
          {activeTab === "qr" && canAccessTab("qr", { isOwner, can }) && <QRManager restaurant={restaurant} key={refreshKey} />}
          {activeTab === "notifications" && canAccessTab("notifications", { isOwner, can }) && <NotificationManager key={refreshKey} />}
          {activeTab === "profile" && canAccessTab("profile", { isOwner, can }) && <ProfileDetails restaurant={restaurant} setActiveTab={setActiveTab} key={refreshKey} />}
          {activeTab === "settings" && canAccessTab("settings", { isOwner, can }) && (
            <SettingsManager
              key={refreshKey}
              autoOpenAddDoc={autoOpenAddDoc}
              onAutoOpenConsumed={() => setAutoOpenAddDoc(false)}
            />
          )}
        </ScrollView>
      )}

    </SafeAreaView>
  );
};

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
    backgroundColor: "#ea580c",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#ffffff",
  },

  mainContent: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  // Document Warning Banner
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fffbeb",
    borderBottomWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
  warningBtn: {
    backgroundColor: "#d97706",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warningBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
});

export default RestaurantDashboard;