import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

// Redux & Auth Imports
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../Features/AuthSlice';
import { logoutAdmin } from '../API/adminApi';
import { logoutRestaurant } from '../API/restaurentApi';

const CustomSidebar = (props: any) => {
  const { state, navigation } = props;
  const dispatch = useDispatch();

  // 1. Get Auth State from Redux
  const { isAuthenticated, user } = useSelector((reduxState: any) => reduxState.auth);

  // 2. Determine Display Names
  const displayName = user?.restaurantName || user?.name || "Profile";
  const firstChar = displayName.charAt(0).toUpperCase();

  // 3. Handle Logout Logic
  const handleLogoutClick = async () => {
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
            onPress={() => {
              Alert.alert(
                "Log Out",
                "Are you sure you want to log out?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Log Out", onPress: handleLogoutClick, style: "destructive" }
                ]
              );
            }}
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
        <Text style={styles.versionText}>Version 1.0.0</Text>
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
});

export default CustomSidebar;