import React, { useState , useEffect} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert , Modal} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import DeviceInfo from 'react-native-device-info';
// Redux & Auth Imports
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../Features/AuthSlice';
import { logoutAdmin } from '../API/adminApi';
import { logoutRestaurant } from '../API/restaurentApi';
import CustomModal from './CustomModal';


const CustomSidebar = (props: any) => {
  const { state, navigation } = props;
  const dispatch = useDispatch();
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [appVersion, setAppVersion] = useState("1.0.0");
  // 1. Get Auth State from Redux
  const { isAuthenticated, user } = useSelector((reduxState: any) => reduxState.auth);

  // 2. Determine Display Names
  const displayName = user?.restaurantName || user?.name || "Profile";
  const firstChar = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const version = DeviceInfo.getVersion();
    setAppVersion(version);
  }, []);

  // 3. Handle Logout Logic
  const handleLogoutClick = async () => {
    setLogoutModalVisible(false);
    try {
      if (user?.role === "admin") await logoutAdmin();
      if (user?.role === "restaurant") await logoutRestaurant();
    } catch (error) {
      console.error("Logout failed on backend", error);
    }
    dispatch(logout());
    navigation.closeDrawer();
    navigation.navigate("Home");
  };

  // 4. Dynamic Menu Generation based on Role
  const getMenuItems = () => {
    let items = [
      { route: 'Home', label: 'Home', icon: 'home' },
      { route: 'Menu', label: 'Digital Menu', icon: 'book-open' },
      { route: 'TrackOrder', label: 'Track Order', icon: 'search-location' },
    ];

    if (!isAuthenticated) {
      // Guest Menu
      items.push({ route: 'Login/Signup', label: 'Partner with Us', icon: 'store' });
    } else {
      // Logged In Menu
      const dashboardRoute = user?.role === 'admin' ? 'AdminDashboard' : 'RestaurantDashboard';
      items.push({ route: dashboardRoute, label: 'My Dashboard', icon: 'columns' });
    }

    // Always visible items
    items.push(
      { route: 'About', label: 'About Us', icon: 'info-circle' },
      { route: 'Help', label: 'Help & FAQs', icon: 'headset' },
      { route: 'PrivacyPolicy', label: 'Privacy Policy', icon: 'shield-alt' }
    );

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <View style={styles.container}>
      <CustomModal
        visible={isLogoutModalVisible}
        title="Log Out?"
        message="Are you sure you want to securely log out of your account?"
        type="logout"
        confirmText="Yes, Log Out"
        cancelText="Cancel"
        onConfirm={handleLogoutClick}
        onCancel={() => setLogoutModalVisible(false)}
      />

      {/* SIDEBAR HEADER */}
      <View style={styles.headerArea}>
        {/* CLOSE BUTTON */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => navigation.closeDrawer()}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="times" size={20} color="#6b7280" />
        </TouchableOpacity>

        <View style={styles.brandIconBox}>
          <FontAwesome5 name="utensils" size={24} color="#ea580c" />
        </View>
        <Text style={styles.brandTitle}>
          Bhojan<Text style={styles.brandTitleGreen}>QR</Text>
        </Text>
        <Text style={styles.brandSubtitle}>Smart Dining Platform</Text>
      </View>

      {/* USER PROFILE SECTION (Visible only if logged in) */}
      {isAuthenticated && user && (
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{firstChar}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.profileRole}>
              {user.role === 'admin' ? 'Admin Portal' : 'Restaurant Partner'}
            </Text>
          </View>
        </View>
      )}

      {/* MENU ITEMS */}
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {menuItems.map((item, index) => {
          const isActive = state.routeNames[state.index] === item.route;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem, 
                isActive ? styles.activeMenuItem : null
              ]}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer, 
                isActive ? styles.activeIconContainer : styles.inactiveIconContainer
              ]}>
                <FontAwesome5
                  name={item.icon}
                  size={16}
                  color={isActive ? "#ea580c" : "#6b7280"} 
                />
              </View>
              <Text style={[
                styles.menuText, 
                isActive ? styles.activeMenuText : styles.inactiveMenuText
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* LOGOUT BUTTON (Appended to bottom of list if logged in) */}
        {isAuthenticated && (
          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={() => setLogoutModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, styles.logoutIconContainer]}>
              <FontAwesome5 name="sign-out-alt" size={16} color="#ef4444" />
            </View>
            <Text style={[styles.menuText, { color: '#ef4444' }]}>
              Log Out
            </Text>
          </TouchableOpacity>
        )}
      </DrawerContentScrollView>

      {/* SIDEBAR FOOTER */}
      <View style={styles.footerArea}>
        <Text style={styles.versionText}>Version {appVersion}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
  },
  headerArea: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 244, 246, 0.8)',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    zIndex: 10,
  },
  brandIconBox: {
    width: 56,
    height: 56,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: -0.5,
  },
  brandTitleGreen: {
    color: '#166534',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Profile Section Styles
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: '#fff7ed', // Light orange bg
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profileRole: {
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '600',
    marginTop: 2,
  },

  // Menu Styles
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255, 237, 213, 0.8)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activeIconContainer: {
    backgroundColor: '#ffffff',
  },
  inactiveIconContainer: {
    backgroundColor: '#f3f4f6',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeMenuText: {
    color: '#ea580c',
  },
  inactiveMenuText: {
    color: '#4b5563',
  },
  
  // Logout specific styles
  logoutItem: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 20,
    borderRadius: 0,
  },
  logoutIconContainer: {
    backgroundColor: '#fee2e2', // Light red
  },

  footerArea: {
    padding: 24,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  //  MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4b5563',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default CustomSidebar;