import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { logout } from '../../Features/AuthSlice';
import { getAdminProfile, logoutAdmin } from '../../API/adminApi';
import { clearToken } from '../../utils/tokenStorage';
import SectionError from '../../components/SectionError';

// Icons for Tab Bar
import { Home, Store, Users, User, Settings, LogOut, Mail, Video, ChevronRight, ArrowLeft, MoreHorizontal, LifeBuoy, Bell, Star, MessageSquare } from 'lucide-react-native';

// Components
import CustomModal from '../../components/CustomModal';
import RestaurantRequestsManager from '../../components/AdminComponents/RestaurantRequestsManager';
import AdminProfileManager from "../../components/AdminComponents/AdminProfileManager";
import NewsletterManager from '../../components/AdminComponents/NewsletterManager';
import VideoTutorialsManager from '../../components/AdminComponents/VideoTutorialsManager';
import AppVersionManager from './AppVersionManager';
import AdminOverviewManager from '../../components/AdminComponents/AdminOverviewManager';
import AdminTeamManager from '../../components/AdminComponents/AdminTeamManager';
import AdminSupportManager from '../../components/AdminComponents/AdminSupportManager';
import NotificationManager from '../Restaurant/NotificationManager';
import AdminFeedbackManager from '../../components/AdminComponents/AdminFeedbackManager';
import AdminContactManager from '../../components/AdminComponents/AdminContactManager';
import BhojanQRLoader from '../../components/BhojanQRLoader';
import { getRestaurantNotifications } from '../../API/notificationApi';
import { setHasUnread } from '../../Features/NotificationSlice';
// The three bottom tabs. Everything else is reached through More, which
// keeps the bar readable - seven horizontally-scrolling top tabs meant the
// last two were only findable by dragging.
const TAB_TITLES: Record<string, string> = {
  overview: 'Admin Portal',
  requests: 'Manage Restaurants',
  team: 'Add Invitations',
  support: 'Raised Tickets',
  more: 'More',
  notifications: 'Notifications',
  feedback: 'Customer Feedback',
  contact: 'Contact Messages',
  newsletter: 'Newsletter',
  videos: 'Tutorials',
  profile: 'Profile',
  settings: 'App Settings',
};

// The tabs that carry a bell. More is excluded: it is a list of
// destinations, and Notifications is one of the rows on it.
const TABS_WITH_BELL = ['overview', 'requests', 'team', 'support'];

const BOTTOM_TABS = [
  { id: 'overview', label: 'Home', icon: Home },
  { id: 'requests', label: 'Restaurants', icon: Store },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'support', label: 'Support', icon: LifeBuoy },
  // The overflow marker, not a gear: More is a list of destinations, and a
  // settings icon promises one screen of preferences instead.
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

// Rows on the More page, in the order an admin needs them.
// "Users" has gone: it was a placeholder for exactly what the Team tab now
// does, and two entries for one thing is worse than none.
const MORE_SECTIONS = [
  { id: 'newsletter', label: 'Newsletter', hint: 'Subscribers and broadcasts', icon: Mail },
  { id: 'videos', label: 'Tutorials', hint: 'Help videos shown in the app', icon: Video },
  { id: 'notifications', label: 'Notifications', hint: 'Platform alerts and activity', icon: Bell },
  { id: 'feedback', label: 'Feedback', hint: 'Reviews, and what shows on the home page', icon: Star },
  { id: 'contact', label: 'Contact Messages', hint: 'Enquiries sent from the website form', icon: MessageSquare },
  { id: 'profile', label: 'Profile', hint: 'Your admin account details', icon: User },
  { id: 'settings', label: 'App Settings', hint: 'Version and release controls', icon: Settings },
];

const AdminDashboard = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  // States
  const [admin, setAdmin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  // 'overview' | 'requests' | 'more' are the three bottom tabs; the rest are
  // sections reached FROM More, which is why they are not in BOTTOM_TABS.
  const [activeTab, setActiveTab] = useState('overview');

  // Modal States
  // True while a More row is open. Drives the back bar, and keeps the More
  // tab lit so the current screen's origin stays obvious.
  const isSection = MORE_SECTIONS.some((sec) => sec.id === activeTab);

  // Which tab the bell was tapped from. Notifications is a More section, but
  // it is reachable from four other tabs - returning everyone to More would
  // strand someone who opened it mid-way through approving restaurants.
  const [notificationOrigin, setNotificationOrigin] = useState<string | null>(null);

  // Shared with the restaurant side: NotificationBridge dispatches
  // markUnreadArrived when a socket event lands, so the same flag drives both
  // dashboards' bells rather than each keeping its own count.
  const hasUnread = useSelector((state: any) => state.notifications?.hasUnread);

  // Seeded from the real list on mount, so the dot is right on a cold start
  // rather than only reacting to events that arrive while the app is open.
  // /notifications resolves an admin session to their own id, so this is the
  // same endpoint the restaurant side uses.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getRestaurantNotifications();
        const list = res?.data?.data || [];
        if (!cancelled) {
          dispatch(setHasUnread(list.some((n: any) => !n.isRead)));
        }
      } catch {
        // A failed seed leaves the flag as it is. A missing dot is a smaller
        // problem than a dot that cannot be cleared.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const openNotifications = () => {
    setNotificationOrigin(activeTab);
    setActiveTab('notifications');
    dispatch(setHasUnread(false));
  };

  const leaveSection = () => {
    // Back from Notifications returns to wherever the bell was pressed;
    // every other section came from More, so that is where they go.
    if (activeTab === 'notifications' && notificationOrigin) {
      setActiveTab(notificationOrigin);
      setNotificationOrigin(null);
      return;
    }
    setActiveTab('more');
  };

  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isSessionExpiredModalVisible, setSessionExpiredModalVisible] = useState(false);

  // Fetch Admin Profile
  const fetchAdminData = useCallback(async () => {
    try {
      setLoadError(false);
      const res = await getAdminProfile();
      setAdmin(res.data.data || res.data.admin);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        clearToken();
        dispatch(logout());
        setSessionExpiredModalVisible(true);
      } else {
        Toast.show({ type: 'error', text1: 'Failed to load admin data.' });
        setLoadError(true);
      }
    }
  }, [dispatch]);

  useEffect(() => {
    fetchAdminData().finally(() => setIsLoading(false));
  }, [fetchAdminData]);

  const onRefreshProfile = async () => {
    setRefreshingProfile(true);
    await fetchAdminData();
    setRefreshingProfile(false);
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await logoutAdmin();
      await clearToken();
      dispatch(logout());
      // Reset rather than navigate, so the dashboard cannot be reached again
      // with the back gesture after signing out. Targets the sign-in screen -
      // this used to point at 'Home', which is no longer a registered route.
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp', params: { screen: 'Login/Signup' } }],
      });
    } catch (error) {
      console.log('Logout error', error);
    }
  };

  if (isLoading) {
    return <BhojanQRLoader message="Syncing Admin Access..." />;
  }

  if (loadError && !admin) {
    return (
      <SafeAreaView style={styles.container}>
        <SectionError message="Failed to load admin data." onRetry={fetchAdminData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* MODALS */}
      <CustomModal 
        visible={isLogoutModalVisible} type="logout" title="Log Out?"
        message="Are you sure you want to securely log out of the Admin portal?"
        confirmText="Yes, Log Out" onConfirm={handleConfirmLogout} onCancel={() => setLogoutModalVisible(false)} 
      />
      <CustomModal 
        visible={isSessionExpiredModalVisible} type="error" title="Session Expired"
        message="Your admin session has expired. Please log in again to continue."
        confirmText="Log In Again" onConfirm={() => { setSessionExpiredModalVisible(false); navigation.navigate('AdminAuth'); }}
      />

      {/* HEADER. Logo on the left, the current screen's name beside it, and
          the bell on the right where a notification affordance is expected.
          Inside a section the logo gives way to a back arrow - same bar,
          same height, so nothing shifts as you move between screens. */}
      <View style={styles.header}>
        {isSection ? (
          <TouchableOpacity
            onPress={leaveSection}
            style={styles.headerBack}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
        ) : (
          <Image
            source={require('../../../assets/bhojanqr-icon.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        )}

        <Text style={styles.headerTitle} numberOfLines={1}>
          {TAB_TITLES[activeTab] || 'Admin Portal'}
        </Text>

        {TABS_WITH_BELL.includes(activeTab) ? (
          <TouchableOpacity
            onPress={openNotifications}
            style={styles.headerBell}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={21} color="#334155" />
            {/* Red, small, and positioned on the bell rather than beside it:
                this says "something arrived", not how many. */}
            {hasUnread && <View style={styles.bellBadge} />}
          </TouchableOpacity>
        ) : (
          // Keeps the title in the same place whether or not a bell is drawn.
          <View style={styles.headerBell} />
        )}
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.mainContent}>
        {activeTab === 'overview' && <AdminOverviewManager />}
        {activeTab === 'requests' && <RestaurantRequestsManager />}
        {activeTab === 'team' && <AdminTeamManager />}
        {activeTab === 'support' && <AdminSupportManager />}

        {activeTab === 'more' && (
          <ScrollView
            contentContainerStyle={styles.moreContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshingProfile} onRefresh={onRefreshProfile} colors={["#f97316"]} />
            }
          >
            {MORE_SECTIONS.map(({ id, label, hint, icon: Icon }) => (
              <TouchableOpacity
                key={id}
                style={styles.moreRow}
                onPress={() => setActiveTab(id)}
                activeOpacity={0.7}
              >
                <View style={styles.moreIcon}>
                  <Icon size={18} color="#f97316" />
                </View>
                <View style={styles.moreText}>
                  <Text style={styles.moreLabel}>{label}</Text>
                  <Text style={styles.moreHint}>{hint}</Text>
                </View>
                <ChevronRight size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))}

            {/* Log out lives at the bottom of More, away from the rows it
                would otherwise sit among as if it were another destination. */}
            <TouchableOpacity
              style={styles.logoutRow}
              onPress={() => setLogoutModalVisible(true)}
              activeOpacity={0.7}
            >
              <LogOut size={18} color="#ef4444" />
              <Text style={styles.logoutRowText}>Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {activeTab === 'notifications' && <NotificationManager />}
        {activeTab === 'feedback' && <AdminFeedbackManager />}
        {activeTab === 'contact' && <AdminContactManager />}
        {activeTab === 'newsletter' && <NewsletterManager />}
        {activeTab === 'videos' && <VideoTutorialsManager />}
        {activeTab === 'profile' && (
          <AdminProfileManager
            admin={admin}
            onRefreshParent={fetchAdminData}
            onLogout={() => setLogoutModalVisible(true)}
          />
        )}
        {activeTab === 'settings' && <AppVersionManager />}

      </View>

      {/* BOTTOM TABS */}
      <View style={styles.bottomBar}>
        {BOTTOM_TABS.map(({ id, label, icon: Icon }) => {
          // More stays lit while any of its sections is open, so it is clear
          // where the current screen came from.
          const viewingNotificationsFrom =
            activeTab === 'notifications' ? notificationOrigin : null;
          const isActive =
            id === 'more'
              ? (activeTab === 'more' || isSection) && !viewingNotificationsFrom
              : activeTab === id || viewingNotificationsFrom === id;
          return (
            <TouchableOpacity
              key={id}
              style={styles.bottomTab}
              onPress={() => {
                setNotificationOrigin(null);
                setActiveTab(id);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Icon size={22} color={isActive ? '#f97316' : '#94a3b8'} />
              <Text style={[styles.bottomTabText, isActive && styles.bottomTabTextActive]}>
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, color: '#64748b', fontWeight: '600' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 13, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerLogo: { width: 34, height: 34 },
  headerBack: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  // flex so a long title truncates instead of pushing the bell off the bar.
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: '#0f172a' },
  headerBell: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  bellBadge: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },

  moreContent: { padding: 16, paddingBottom: 32, gap: 10 },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 14 },
  moreIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  moreText: { flex: 1 },
  moreLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  moreHint: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  logoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 15, borderRadius: 14, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  logoutRowText: { fontSize: 14, fontWeight: '800', color: '#ef4444' },

  bottomBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, paddingBottom: 8 },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 },
  bottomTabText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  bottomTabTextActive: { color: '#f97316' },
  mainContent: { flex: 1, backgroundColor: '#f8fafc' },
  placeholder: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  placeholderText: { fontSize: 13, color: '#94a3b8', fontWeight: '600', textAlign: 'center' }
});

export default AdminDashboard;