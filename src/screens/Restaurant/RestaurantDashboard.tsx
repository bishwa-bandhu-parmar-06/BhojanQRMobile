import React, { useCallback, useEffect, useRef, useState } from "react";
import { 
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  BackHandler
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { useDispatch, useSelector } from "react-redux";
import { logout, updateUser } from "../../Features/AuthSlice";
import { getRestaurantProfile, logoutRestaurant } from "../../API/restaurentApi";
import { logoutStaff, getMyAccess } from "../../API/staffApi";
import { canAccessTab, getDefaultTab } from "../../constants/dashboardTabs";
import { useThemeColors, useThemedStyles, type ThemeColors } from "../../theme";
import { useTranslation } from "../../i18n";
import type { Permission } from "../../constants/permissions";

import CustomModal from "../../components/CustomModal";
import BhojanQRLoader from "../../components/BhojanQRLoader";
import Header, { type HeaderAction } from "../../components/Header";

// Icons for our new Mobile Tab Navigation
import {
  Home,
  ClipboardList,
  BookOpen,
  QrCode,
  User,
  Settings,
  LogOut,
  LayoutGrid,
  Users,
  Sparkles,
  AlertTriangle,
  MoreHorizontal,
  ChevronRight,
  ArrowLeft,
  Plus,
  Layers,
  RefreshCw,
  LifeBuoy,
  History,
} from "lucide-react-native";

// IMPORT MANAGERS
import OverviewManager from "./OverviewManager";
import MenuManager, { type MenuAction } from "./MenuManager";
import SettingsManager from "./SettingsManager";
import AppSettingsManager from "./AppSettingsManager";
import QRManager from "./QRManager";
import OrderManager from "./OrderManager";
// ProfileDetails.tsx is intentionally not imported right now: the Profile
// section renders SettingsManager, which already covers the same fields and
// can edit them. The file is kept for the Profile Details rework.
import ActiveTablesManager from "./ActiveTablesManager";
import StaffManager from "./StaffManager";
import HappyHoursManager from "./HappyHoursManager";
import NotificationManager from "./NotificationManager";
import SupportTicketManager from "./SupportTicketManager";
import OrderHistoryManager from "./OrderHistoryManager";

// The five bottom-bar destinations. Everything not here is reached through
// "More", which keeps the bar readable - five is about the most that fits
// without the labels truncating on a narrow phone.
//
// `id` values are the same activeTab ids the dashboard already used for its
// old horizontal tab strip, so permission gating (canAccessTab) and the
// landing-tab logic (getDefaultTab) keep working untouched.
const BOTTOM_TABS = [
  { id: "overview", label: "tabs.home", icon: Home },
  { id: "orders", label: "tabs.orders", icon: ClipboardList },
  { id: "active_tables", label: "tabs.tables", icon: LayoutGrid },
  { id: "menu", label: "tabs.menu", icon: BookOpen },
  { id: "more", label: "tabs.more", icon: MoreHorizontal },
];

// The secondary sections, listed on the More page. Notifications is included
// even though it is not one of the five: it has no bottom-bar slot, so
// leaving it out would make NotificationManager unreachable entirely.
// Rows on the More page. Notifications is deliberately NOT here - it has its
// own entry point in the header bell, and listing it twice made the bell look
// like a shortcut to somewhere else.
const MORE_SECTIONS = [
  // Profile first: it is the one an owner opens most, and it now holds
  // everything about the restaurant itself.
  { id: "profile", label: "titles.profile", icon: User, hint: "more.profileHint" },
  { id: "order_history", label: "titles.orderHistory", icon: History, hint: "more.orderHistoryHint" },
  { id: "staff", label: "titles.staff", icon: Users, hint: "more.staffHint" },
  { id: "marketing", label: "titles.happyHours", icon: Sparkles, hint: "more.happyHoursHint" },
  { id: "qr", label: "titles.qr", icon: QrCode, hint: "more.qrHint" },
  { id: "settings", label: "titles.appSettings", icon: Settings, hint: "more.settingsHint" },
  { id: "support", label: "titles.support", icon: LifeBuoy, hint: "more.supportHint" },
];

// Every panel that opens WITHOUT the app header, showing only its own back
// bar. Notifications is included even though it is not a More row, because it
// behaves identically once open.
const SECTION_LABELS: Record<string, string> = {
  settings: "titles.appSettings",
  staff: "titles.staff",
  marketing: "titles.happyHours",
  qr: "titles.qr",
  profile: "titles.profile",
  notifications: "titles.notifications",
  support: "titles.support",
  order_history: "titles.orderHistory",
};

// Menu actions, offered as rows on the More page. They are not sections - they
// switch to the Menu tab and open a form there - so they are kept separate
// from MORE_SECTIONS, which the back bar and tab highlighting both key off.
const MORE_MENU_ACTIONS: { id: MenuAction; label: string; icon: any; hint: string }[] = [
  { id: "add", label: "more.addMenuItem", icon: Plus, hint: "more.addMenuItemHint" },
  { id: "bulk", label: "more.bulkAddMenu", icon: Layers, hint: "more.bulkAddMenuHint" },
];

// Headings for the five bottom-bar destinations, shown centred in the header.
const TAB_TITLES: Record<string, string> = {
  overview: "titles.overview",
  orders: "titles.orders",
  active_tables: "titles.tables",
  menu: "titles.menu",
  more: "titles.more",
};

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

  // A trail of the panels visited, so back retraces the exact route taken
  // rather than jumping to a fixed destination. Home -> Orders -> Tables ->
  // Notifications -> Menu backs out in precisely that order.
  //
  // A ref, not state: nothing renders from it, and keeping it out of state
  // avoids a re-render on every navigation just to record where you came
  // from. It replaces the old single `returnTab` value, which could only ever
  // remember one step and sent you to the wrong place on a longer route.
  const historyRef = useRef<string[]>([]);

  const [isExitModalVisible, setExitModalVisible] = useState(false);

  // Lets goToTab read the current panel without depending on it, so the
  // callback stays stable and never captures a stale value.
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // The single way forward. Records where you were before moving, so back can
  // retrace it. Re-selecting the panel you are already on records nothing -
  // otherwise back would appear to do nothing while it unwound duplicates.
  const goToTab = useCallback((next: string) => {
    const from = activeTabRef.current;
    if (from === next) return;
    historyRef.current.push(from);
    setActiveTab(next);
  }, []);

  // The single way back. Returns false when the trail is empty, which is what
  // tells the hardware-back handler there is nothing left to unwind.
  const goBack = useCallback(() => {
    const previous = historyRef.current.pop();
    if (previous === undefined) return false;
    setActiveTab(previous);
    return true;
  }, []);

  // Two back presses inside this window count as "I want out", regardless of
  // how much trail is left. Deliberately short: long enough for a decisive
  // double-tap, short enough that unwinding several screens at a normal pace
  // does not trip it.
  const DOUBLE_BACK_MS = 300;
  const lastBackAtRef = useRef(0);

  useEffect(() => {
    const onHardwareBack = () => {
      // Any modal already on screen owns the back press - closing it is what
      // the user means, not navigating or quitting.
      if (isExitModalVisible) {
        setExitModalVisible(false);
        return true;
      }
      if (isLogoutModalVisible) {
        setLogoutModalVisible(false);
        return true;
      }

      const now = Date.now();
      if (now - lastBackAtRef.current < DOUBLE_BACK_MS) {
        lastBackAtRef.current = 0;
        setExitModalVisible(true);
        return true;
      }
      lastBackAtRef.current = now;

      // Retrace the trail, and only ask about leaving once it is exhausted.
      if (goBack()) return true;
      setExitModalVisible(true);
      // Always true: returning false would let Android close the app straight
      // away, which is the very thing the dialog exists to confirm.
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack,
    );
    return () => subscription.remove();
  }, [goBack, isExitModalVisible, isLogoutModalVisible]);

  // A one-shot request handed to MenuManager: open the single-item form, or
  // the bulk form. Set by the header's + on the Menu tab and by the two More
  // rows; MenuManager clears it as soon as it has acted.
  const [menuAction, setMenuAction] = useState<MenuAction | null>(null);

  const requestMenuAction = useCallback(
    (action: MenuAction) => {
      setMenuAction(action);
      goToTab("menu");
    },
    [goToTab],
  );

  // True while a panel has a full sub-screen open - MenuManager's item forms,
  // or Profile Details' address and document editors. The app header comes off
  // for the same reason it does inside a More section: one back affordance,
  // not two stacked bars.
  const [isSubScreenOpen, setIsSubScreenOpen] = useState(false);
  // Stable identity - the panels call these from effects keyed on them, so a
  // new function each render would re-fire those effects continuously.
  const handleSubScreenChange = useCallback((open: boolean) => setIsSubScreenOpen(open), []);
  const handleMenuActionConsumed = useCallback(() => setMenuAction(null), []);
  const handleAutoOpenConsumed = useCallback(() => setAutoOpenAddDoc(false), []);

  // Profile Details is a section, so it has no app header to hang a control
  // from - the section bar is its only chrome. This drives the settings icon
  // there, which opens the panel's "Manage Profile" list.
  const [profileAction, setProfileAction] = useState<"manage" | null>(null);
  const handleProfileActionConsumed = useCallback(() => setProfileAction(null), []);

  // Controls a panel puts in the section bar. The panel owns the state those
  // buttons act on (how many notifications there are, which are unread), so it
  // decides what to publish; the dashboard only draws what it is handed.
  // Panels clear this on unmount, so buttons never linger onto another section.
  const [sectionActions, setSectionActions] = useState<HeaderAction[]>([]);
  const handleSectionActions = useCallback(
    (actions: HeaderAction[]) => setSectionActions(actions),
    [],
  );

  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);
  const c = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  // A staff login (role: "staff") has its own JWT, but /restaurants/profile
  // is hard-restricted to the owner on the backend (authorize("restaurant")
  // - see restaurantRoutes.js) and 403s for staff regardless of permissions.
  // Calling it unconditionally here would log every staff member straight
  // back out the moment their dashboard loaded.
  const isOwner = user?.role === "restaurant";
  const staffPermissions: Permission[] = isOwner ? [] : user?.permissions || [];
  const can = (...perms: Permission[]) => perms.some((p) => staffPermissions.includes(p));

  // Re-reads this staff member's permissions from the server.
  //
  // The session stores whatever the login response contained, so an owner who
  // revokes a right changes nothing on that person's phone until they sign
  // out - they keep seeing the section AND can keep using it. Syncing on
  // mount and on every refresh closes that to one refresh cycle.
  //
  // Owners are skipped: they hold every permission implicitly and have no
  // Staff record to read.
  const syncStaffAccess = useCallback(async () => {
    if (user?.role !== "staff") return;
    try {
      const res = await getMyAccess();
      const access = res?.data?.data;
      if (!access) return;

      // Disabled while they were signed in - drop the session rather than
      // leave them on a dashboard where every request will 403.
      if (access.isActive === false) {
        Toast.show({
          type: "error",
          text1: "Access disabled",
          text2: "Your account has been turned off by the owner",
        });
        dispatch(logout());
        return;
      }

      dispatch(
        updateUser({
          permissions: access.permissions || [],
          staffRole: access.staffRole,
        }),
      );
    } catch {
      // Offline or a transient failure: keep the cached permissions rather
      // than locking someone out of their own shift. The server still
      // enforces the real rules on every request, so a stale UI cannot
      // actually do anything it should not.
    }
  }, [user?.role, dispatch]);

  useEffect(() => {
    syncStaffAccess();
  }, [syncStaffAccess]);

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
    await syncStaffAccess();
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

  // A section is open (a More row, or Notifications from the bell). Drives
  // three things: hiding the app header, showing the back bar, and keeping
  // the More tab lit while you are inside one.
  const openSectionLabel = SECTION_LABELS[activeTab];

  // Only a More ROW lights the More tab. Notifications is a section too, but
  // it is reached from the header bell on any tab, so lighting More while the
  // user is reading notifications opened from Overview would point at a place
  // they never went.
  const isMoreRowOpen = MORE_SECTIONS.some(section => section.id === activeTab);

  // Right-hand header controls, in render order (left to right, bell last).
  //
  // Refresh goes on every data tab. It reuses onRefresh - the same handler as
  // pull-to-refresh - which re-reads the profile and bumps refreshKey; since
  // every panel is keyed on that, the active one remounts and refetches. That
  // is why removing OrderManager's own Refresh button lost nothing.
  //
  // More is excluded: it lists destinations and has nothing to re-fetch.
  const headerActions: HeaderAction[] = [];
  if (activeTab !== "more") {
    headerActions.push({
      key: "refresh",
      icon: RefreshCw,
      label: "Refresh",
      onPress: onRefresh,
    });
  }
  // Both ways of adding, always - not conditioned on whether a menu exists.
  // An owner with a full menu adds dishes as often as an owner with none, so
  // there is no state in which either belongs on the More page only. Bare
  // icons rather than labelled pills because the app bar's centred title runs
  // across the full width; a pill on the right would sit on top of it.
  // Gated on manage_menu specifically, not on reaching the Menu tab: that tab
  // also opens for delete_menu, and someone who may only remove dishes should
  // not be offered "Add item" and "Bulk add".
  if (activeTab === "menu" && (isOwner || can("manage_menu"))) {
    headerActions.push(
      {
        key: "add-menu-item",
        icon: Plus,
        label: "Add item",
        onPress: () => requestMenuAction("add"),
      },
      {
        key: "bulk-add-menu",
        icon: Layers,
        label: "Bulk add items",
        onPress: () => requestMenuAction("bulk"),
      },
    );
  }

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

      {/* Confirms leaving the app. "Stay" occupies the confirm slot on
          purpose: CustomModal renders that button filled and the cancel one
          grey, and the safe choice is the one that should catch the thumb.
          Closing is still a single tap, just not the emphasised one. */}
      <CustomModal
        visible={isExitModalVisible}
        type="exit"
        title="Close BhojanQR?"
        message="You'll still be signed in next time you open the app."
        confirmText="Stay"
        cancelText="Close app"
        onConfirm={() => setExitModalVisible(false)}
        onCancel={() => {
          setExitModalVisible(false);
          BackHandler.exitApp();
        }}
      />

      {/* 1. APP HEADER - rendered here rather than by the navigator so its
             heading can name the current panel. Hidden entirely inside a
             section, where the back bar below is the only chrome. */}
      {!openSectionLabel && !isSubScreenOpen && (
        <Header
          title={t(TAB_TITLES[activeTab])}
          // No bell on More: that page is a static list of destinations, and
          // one of the things it lists is where notifications already live.
          // On Menu the + takes the bell's place instead.
          onBellPress={
            activeTab === "more" || activeTab === "menu"
              ? undefined
              : () => goToTab("notifications")
          }
          actions={headerActions}
        />
      )}

      {/* 2. SECTION BAR - the sole chrome inside a section. Returns to
             wherever the section was opened from - it pops the same trail the
             hardware back button does, so the two never disagree. */}
      {/* Hidden while a sub-screen is open: that screen brings its own back
          bar, and two stacked bars would each claim to be the way out. */}
      {openSectionLabel && !isSubScreenOpen && (
        <View style={styles.sectionBar}>
          <TouchableOpacity
            style={styles.sectionBarBack}
            onPress={goBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color={c.textBody} />
            <Text style={styles.sectionBarText}>{t(openSectionLabel)}</Text>
          </TouchableOpacity>

          <View style={styles.sectionBarActions}>
            {/* Published by the open panel - see handleSectionActions. */}
            {sectionActions.map(({ key, icon: Icon, onPress, label, showLabel }) =>
              showLabel ? (
                <TouchableOpacity
                  key={key}
                  onPress={onPress}
                  style={styles.sectionBarPill}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                >
                  <Icon size={15} color={c.primaryText} />
                  <Text style={styles.sectionBarPillText}>{label}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  key={key}
                  onPress={onPress}
                  hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                >
                  <Icon size={20} color={c.textBody} />
                </TouchableOpacity>
              ),
            )}

            {/* Everything that edits the profile lives behind this, so the
                page itself can stay a read-only summary. */}
            {activeTab === "profile" && (
              <TouchableOpacity
                onPress={() => setProfileAction("manage")}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Manage profile"
              >
                <Settings size={20} color={c.textBody} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 3. DOCUMENT SUSPENSION WARNING - shown above every tab until at
          least one government document has an uploaded file. */}
      {showDocumentWarning && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={20} color={c.warning} />
          <Text style={styles.warningText}>
            Upload your government document or your account may be suspended.
          </Text>
          <TouchableOpacity
            style={styles.warningBtn}
            onPress={() => {
              // Documents moved to Profile Details along with the rest of the
              // restaurant's data - sending the owner to App Settings would
              // now land them on theme and language.
              goToTab("profile");
              setAutoOpenAddDoc(true);
            }}
          >
            <Text style={styles.warningBtnText}>Add Documents</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Panels that own a FlatList get a plain flex view instead of the
          pull-to-refresh ScrollView below. Nesting a FlatList inside a
          ScrollView of the same orientation destroys virtualization - the
          list renders every row at once - and trips React Native's
          "VirtualizedLists should never be nested" warning. Both of these
          bring their own RefreshControl, so nothing is lost by opting out.
            - MenuManager -> MenuList's FlatList
            - OrderManager -> the infinite-scrolling order list
            - ActiveTablesManager -> the live-tables list */}
      {activeTab === "menu" && canAccessTab("menu", { isOwner, can }) ? (
        <View style={styles.mainContent}>
          <MenuManager
            key={refreshKey}
            pendingAction={menuAction}
            onActionConsumed={handleMenuActionConsumed}
            onSubScreenChange={handleSubScreenChange}
          />
        </View>
      ) : activeTab === "orders" && canAccessTab("orders", { isOwner, can }) ? (
        <View style={styles.mainContent}>
          <OrderManager key={refreshKey} />
        </View>
      ) : activeTab === "active_tables" && canAccessTab("active_tables", { isOwner, can }) ? (
        <View style={styles.mainContent}>
          <ActiveTablesManager key={refreshKey} />
        </View>
      ) : activeTab === "order_history" && canAccessTab("order_history", { isOwner, can }) ? (
        <View style={styles.mainContent}>
          <OrderHistoryManager key={refreshKey} onHeaderActions={handleSectionActions} />
        </View>
      ) : activeTab === "support" && canAccessTab("support", { isOwner, can }) ? (
        <View style={styles.mainContent}>
          <SupportTicketManager
            key={refreshKey}
            onHeaderActions={handleSectionActions}
            onSubScreenChange={handleSubScreenChange}
          />
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
              colors={[c.primary]}
              tintColor={c.primary}
            />
          }
        >
          {activeTab === "more" && (
            <View style={styles.moreList}>
              {visibleMoreSections.map(({ id, label, icon: Icon, hint }) => (
                <TouchableOpacity
                  key={id}
                  style={styles.moreRow}
                  onPress={() => goToTab(id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.moreIconBox}>
                    <Icon size={18} color={c.primary} />
                  </View>
                  <View style={styles.moreRowText}>
                    <Text style={styles.moreRowLabel}>{t(label)}</Text>
                    <Text style={styles.moreRowHint}>{t(hint)}</Text>
                  </View>
                  <ChevronRight size={18} color={c.textFaint} />
                </TouchableOpacity>
              ))}

              {/* Menu actions. Gated on manage_menu specifically - unlike the
                  sections above, these are not covered by their own
                  TAB_ACCESS rule, so without this a waiter would be offered
                  an "Add Menu Item" row that the Menu tab itself denies. */}
              {(isOwner || can("manage_menu")) &&
                MORE_MENU_ACTIONS.map(({ id, label, icon: Icon, hint }) => (
                  <TouchableOpacity
                    key={id}
                    style={styles.moreRow}
                    onPress={() => requestMenuAction(id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.moreIconBox}>
                      <Icon size={18} color={c.primary} />
                    </View>
                    <View style={styles.moreRowText}>
                      <Text style={styles.moreRowLabel}>{t(label)}</Text>
                      <Text style={styles.moreRowHint}>{t(hint)}</Text>
                    </View>
                    <ChevronRight size={18} color={c.textFaint} />
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
                  <LogOut size={18} color={c.danger} />
                </View>
                <View style={styles.moreRowText}>
                  <Text style={[styles.moreRowLabel, styles.moreRowLabelLogout]}>{t("common.logOut")}</Text>
                  <Text style={styles.moreRowHint}>{t("common.logOutHint")}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
          {activeTab === "overview" && canAccessTab("overview", { isOwner, can }) && (
            <OverviewManager
              key={refreshKey}
              // Overview is a panel, not a navigator screen, so it asks the
              // dashboard to switch section. Gated on the same permission
              // check the tab itself uses - a card must not open something
              // this account is not allowed to see.
              onNavigate={(tabId) => {
                if (canAccessTab(tabId, { isOwner, can })) setActiveTab(tabId);
              }}
              // Same rule, exposed as a predicate so Overview can hide the
              // tiles this account could never open instead of rendering
              // taps that silently do nothing.
              canOpenTab={(tabId) => canAccessTab(tabId, { isOwner, can })}
            />
          )}
          {activeTab === "staff" && canAccessTab("staff", { isOwner, can }) && (
            <StaffManager key={refreshKey} onHeaderActions={handleSectionActions} />
          )}
          {activeTab === "marketing" && canAccessTab("marketing", { isOwner, can }) && (
            <HappyHoursManager
              key={refreshKey}
              onHeaderActions={handleSectionActions}
              onRequestMenuAction={requestMenuAction}
            />
          )}
          {activeTab === "qr" && canAccessTab("qr", { isOwner, can }) && <QRManager restaurant={restaurant} key={refreshKey} />}
          {activeTab === "notifications" && canAccessTab("notifications", { isOwner, can }) && (
            <NotificationManager key={refreshKey} onHeaderActions={handleSectionActions} />
          )}
          {/* Profile Details now owns everything about the RESTAURANT -
              basic details, locations, logo, login email, password and
              government documents. That is what SettingsManager has always
              contained; it simply used to sit behind "App Settings", which
              put account data under a name that promised app preferences. */}
          {activeTab === "profile" && canAccessTab("profile", { isOwner, can }) && (
            <SettingsManager
              key={refreshKey}
              autoOpenAddDoc={autoOpenAddDoc}
              onAutoOpenConsumed={handleAutoOpenConsumed}
              // Its editors are full sub-screens, so the app header comes off
              // while one is open - same as the menu editor.
              onSubScreenChange={handleSubScreenChange}
              pendingAction={profileAction}
              onActionConsumed={handleProfileActionConsumed}
            />
          )}
          {/* App Settings is now genuinely app settings: preferences that
              belong to this device rather than to the account. */}
          {activeTab === "settings" && canAccessTab("settings", { isOwner, can }) && (
            <AppSettingsManager key={refreshKey} />
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
            id === "more" ? activeTab === "more" || isMoreRowOpen : activeTab === id;
          return (
            <TouchableOpacity
              key={id}
              style={styles.bottomTab}
              onPress={() => goToTab(id)}
              activeOpacity={0.7}
            >
              <Icon size={20} color={isActive ? c.primary : c.textFaint} />
              <Text style={[styles.bottomTabLabel, isActive && styles.bottomTabLabelActive]}>
                {t(label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

    </SafeAreaView>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.bg,
  },
  loadingText: {
    marginTop: 12,
    color: c.textMuted,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: c.surface, 
  },
  
  // Header Styles
  // Bar shown only inside a More section, as the way back to the More list.
  sectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderColor: c.divider,
  },
  // The back half is its own touchable so the tap target covers the arrow and
  // the title together, without swallowing the action on the right.
  sectionBarBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  sectionBarActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  sectionBarPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: c.primary,
  },
  sectionBarPillText: { fontSize: 12, fontWeight: "800", color: c.primaryText },
  sectionBarText: {
    fontSize: 16,
    fontWeight: "800",
    color: c.text,
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
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.divider,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  moreIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  moreRowText: { flex: 1 },
  moreRowLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: c.text,
  },
  moreRowHint: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  moreRowLogout: {
    marginTop: 6,
    borderColor: c.dangerSoft,
  },
  moreIconBoxLogout: {
    backgroundColor: c.dangerSoft,
  },
  moreRowLabelLogout: {
    color: c.danger,
  },

  bottomBar: {
    flexDirection: "row",
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderColor: c.divider,
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
    color: c.textFaint,
  },
  bottomTabLabelActive: {
    color: c.primary,
  },

  mainContent: {
    flex: 1,
    backgroundColor: c.bg,
  },

  // Document Warning Banner
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: c.warningSoft,
    borderBottomWidth: 1,
    borderColor: c.warningSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: c.warning,
  },
  warningBtn: {
    backgroundColor: c.warning,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warningBtnText: {
    color: c.primaryText,
    fontWeight: "bold",
    fontSize: 12,
  },
  });

export default RestaurantDashboard;