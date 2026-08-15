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
  MoreHorizontal,
  ChevronRight,
  ArrowLeft,
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

// The five bottom-bar destinations. Everything not here is reached through
// "More", which keeps the bar readable - five is about the most that fits
// without the labels truncating on a narrow phone.
//
// `id` values are the same activeTab ids the dashboard already used for its
// old horizontal tab strip, so permission gating (canAccessTab) and the
// landing-tab logic (getDefaultTab) keep working untouched.
const BOTTOM_TABS = [
  { id: "overview", label: "Home", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "active_tables", label: "Tables", icon: LayoutGrid },
  { id: "menu", label: "Menu", icon: BookOpen },
  { id: "more", label: "More", icon: MoreHorizontal },
];

// The secondary sections, listed on the More page. Notifications is included
// even though it is not one of the five: it has no bottom-bar slot, so
// leaving it out would make NotificationManager unreachable entirely.
const MORE_SECTIONS = [
  { id: "settings", label: "App Settings", icon: Settings, hint: "Documents, timings, preferences" },
  { id: "staff", label: "Staff", icon: Users, hint: "Team members and permissions" },
  { id: "marketing", label: "Happy Hours", icon: Sparkles, hint: "Scheduled offers and discounts" },
  { id: "qr", label: "QR Codes", icon: QrCode, hint: "Generate and print table codes" },
  { id: "profile", label: "Profile", icon: User, hint: "Restaurant details and address" },
  { id: "notifications", label: "Notifications", icon: Bell, hint: "Order and system alerts" },
];

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
      // Back to the sign-in screen. This used to go to "Home", which is no
      // longer a registered route - logging out would have left the user on
      // the dashboard with nothing appearing to happen.
      navigation.navigate("Login/Signup");
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

  // Sections this user may actually open from the More page.
  const visibleMoreSections = MORE_SECTIONS.filter(section =>
    canAccessTab(section.id, { isOwner, can }),
  );

  // A secondary section is open (not the More list itself). Used both to keep
  // the More tab lit while you are inside one, and to decide whether to show
  // the "back to More" row.
  const openMoreSection = visibleMoreSections.find(section => section.id === activeTab);

  // "more" has no TAB_ACCESS rule of its own - canAccessTab would return true
  // for it unconditionally - so it is gated on whether it would have anything
  // to list. Staff with no secondary permissions get no More tab at all
  // rather than a tab onto an empty page.
  const visibleBottomTabs = BOTTOM_TABS.filter(tab =>
    tab.id === "more"
      ? visibleMoreSections.length > 0
      : canAccessTab(tab.id, { isOwner, can }),
  );

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

      {/* The "Welcome back, <restaurant>" bar with its logout button used to
          sit here. It was a third stacked header (app header, this, then each
          panel's own title), so it is gone: the app header above covers
          branding, and logout moved to the More page and the Profile panel. */}

      {/* 2. SECTION BAR - only inside a More section, as a way back to the
             More list. The five bottom-bar destinations are always one tap
             away and need no such affordance. */}
      {openMoreSection && (
        <TouchableOpacity
          style={styles.sectionBar}
          onPress={() => setActiveTab("more")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#374151" />
          <Text style={styles.sectionBarText}>{openMoreSection.label}</Text>
        </TouchableOpacity>
      )}

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
          {activeTab === "more" && (
            <View style={styles.moreList}>
              {visibleMoreSections.map(({ id, label, icon: Icon, hint }) => (
                <TouchableOpacity
                  key={id}
                  style={styles.moreRow}
                  onPress={() => setActiveTab(id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.moreIconBox}>
                    <Icon size={18} color="#ea580c" />
                  </View>
                  <View style={styles.moreRowText}>
                    <Text style={styles.moreRowLabel}>{label}</Text>
                    <Text style={styles.moreRowHint}>{hint}</Text>
                  </View>
                  <ChevronRight size={18} color="#9ca3af" />
                </TouchableOpacity>
              ))}

              {/* Logout closes the list, after Notifications. It is the one
                  destructive action here, so it is separated and tinted red
                  rather than sitting in the run of ordinary sections. */}
              <TouchableOpacity
                style={[styles.moreRow, styles.moreRowLogout]}
                onPress={() => setLogoutModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.moreIconBox, styles.moreIconBoxLogout]}>
                  <LogOut size={18} color="#ef4444" />
                </View>
                <View style={styles.moreRowText}>
                  <Text style={[styles.moreRowLabel, styles.moreRowLabelLogout]}>Log Out</Text>
                  <Text style={styles.moreRowHint}>Sign out of this device</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
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

      {/* 5. BOTTOM TAB BAR - restaurant dashboard only. It lives inside this
             screen rather than being a real tab navigator because every
             destination is a panel this component already renders and gates
             by permission; promoting them to routes would duplicate all of
             that and pull refreshKey/autoOpenAddDoc state across navigators. */}
      <View style={styles.bottomBar}>
        {visibleBottomTabs.map(({ id, label, icon: Icon }) => {
          // The More tab stays lit while any of its sections is open, so the
          // bar always shows where you are rather than going blank.
          const isActive =
            id === "more" ? activeTab === "more" || !!openMoreSection : activeTab === id;
          return (
            <TouchableOpacity
              key={id}
              style={styles.bottomTab}
              onPress={() => setActiveTab(id)}
              activeOpacity={0.7}
            >
              <Icon size={20} color={isActive ? "#ea580c" : "#9ca3af"} />
              <Text style={[styles.bottomTabLabel, isActive && styles.bottomTabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
  // Bar shown only inside a More section, as the way back to the More list.
  sectionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
  },
  sectionBarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2937",
  },

  // The More page: a list of the sections that have no bottom-bar slot.
  moreList: {
    padding: 16,
    gap: 10,
  },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  moreIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  moreRowText: { flex: 1 },
  moreRowLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
  },
  moreRowHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  moreRowLogout: {
    marginTop: 6,
    borderColor: "#fee2e2",
  },
  moreIconBoxLogout: {
    backgroundColor: "#fef2f2",
  },
  moreRowLabelLogout: {
    color: "#ef4444",
  },

  bottomBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderColor: "#f1f5f9",
    paddingTop: 8,
    paddingBottom: 8,
  },
  bottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
  },
  bottomTabLabelActive: {
    color: "#ea580c",
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