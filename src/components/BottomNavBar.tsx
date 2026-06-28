import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';

// Drawer screens reached by this bar - kept hidden on full-screen flows
// (auth forms, checkout, the scanner's own modal) where a bottom nav would
// either be redundant or compete with a screen-specific primary action.
const HIDDEN_ON = new Set([
  'GuestMenu', 'Cart', 'OrderSuccess', 'TrackOrder',
  'Login/Signup', 'CustomerAuth', 'AdminAuth', 'ForgotPassword', 'ResetPassword', 'StaffAuth',
]);

interface BottomNavBarProps {
  navigationRef: NavigationContainerRefWithCurrent<any>;
  currentRoute: string;
}

const TABS = [
  { route: 'Home', label: 'Home', icon: 'home' },
  { route: 'ScanScreen', label: 'Scan', icon: 'qrcode' },
  { route: '__account__', label: 'Account', icon: 'user-circle' },
  { route: 'Explore', label: 'Explore', icon: 'compass' },
];

const BottomNavBar: React.FC<BottomNavBarProps> = ({ navigationRef, currentRoute }) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);

  if (HIDDEN_ON.has(currentRoute)) return null;

  const accountRoute = !isAuthenticated
    ? 'CustomerAuth'
    : user?.role === 'admin'
    ? 'AdminDashboard'
    : user?.role === 'customer'
    ? 'CustomerDashboard'
    : 'RestaurantDashboard';

  const handlePress = (route: string) => {
    const target = route === '__account__' ? accountRoute : route;
    navigationRef.navigate('MainApp', { screen: target });
  };

  const isActive = (route: string) => {
    const target = route === '__account__' ? accountRoute : route;
    return currentRoute === target;
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map(tab => {
        const active = isActive(tab.route);
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tabBtn}
            onPress={() => handlePress(tab.route)}
            activeOpacity={0.7}
          >
            <FontAwesome5 name={tab.icon} size={20} color={active ? '#ea580c' : '#9ca3af'} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomNavBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  tabLabelActive: { color: '#ea580c' },
});
