import React, { useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { NavigationContainer, LinkingOptions, useNavigationContainerRef } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Core Screens
import HomeScreen from '../screens/HomeScreen';
import RestaurentAuth from "../screens/RestaurentAuth";
import About from '../screens/About';
import Help from '../screens/Help';
import PrivacyPolicy from '../screens/PrivacyPolicy';
import ContactUs from '../screens/ContactUs';
import FreeQrGenerator from '../screens/FreeQrGenerator';
import Explore from '../screens/Explore';
import ScanScreen from '../screens/ScanScreen';

// Restaurant Owner Screens
import RestaurantDashboard from '../screens/Restaurant/RestaurantDashboard';
import PendingApprovalScreen from '../screens/Restaurant/PendingApprovalScreen';
import Menu from "../screens/Menu"

// Customer Screens
import CustomerAuth from '../screens/Customer/CustomerAuth';
import CustomerDashboard from '../screens/Customer/CustomerDashboard';

// Admin Screens
import AdminAuth from '../screens/Admin/AdminAuth';
import AdminDashboard from '../screens/Admin/AdminDashboard';

// Shared Auth Screens
import ForgotPassword from '../screens/Auth/ForgotPassword';
import ResetPassword from '../screens/Auth/ResetPassword';
import StaffAuth from '../screens/Staff/StaffAuth';

import GuestMenu from '../screens/Restaurant/GuestMenu';
import PublicMenu from '../components/Restaurant/PublicMenu';
import Cart from '../screens/Cart';
import OrderSuccess from '../screens/Restaurant/OrderSuccess'; 
import TrackOrder from '../screens/TrackOrder';

// Components
import Header from '../components/Header';
import CustomSidebar from '../components/CustomSidebar';
import BottomNavBar from '../components/BottomNavBar';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

interface AppNavigatorProps {
  onReady?: () => void;
}

const linking: LinkingOptions<any> = {
  prefixes: ['https://bhojanqr.com', 'bhojanqr://'],
  config: {
    screens: {
      MainApp: {
        screens: {
          GuestMenu: 'menu/:restaurantId',
          Cart: 'menu/:restaurantId/cart',
          OrderSuccess: 'menu/:restaurantId/order-success',
          TrackOrder: 'track-order'
        },
      },
      // Lets a tapped password-reset email link jump straight into the app
      // (when installed) pre-filled with the role + token, mirroring the
      // website's /customer|restaurant|admin/reset-password/:token routes.
      ResetPassword: 'customer/reset-password/:token',
    },
  },
};

// 1. DRAWER NAVIGATOR
const DrawerNavigator = () => {

  const user = useSelector((state: any) => state.auth?.user);

  // Auth is shared across roles (restaurant/customer/admin), so the landing
  // screen for a logged-in user depends on which role they hold - a customer
  // landing on the restaurant owner's dashboard (or vice versa) would be
  // broken, not just wrong-looking.
  const initialRoute =
    user?.role === 'restaurant'
      ? 'RestaurantDashboard'
      : user?.role === 'customer'
      ? 'CustomerDashboard'
      : 'Home';

  return (
    <Drawer.Navigator
    initialRouteName={initialRoute}
      drawerContent={(props) => <CustomSidebar {...props} />}
      screenOptions={{
        drawerPosition: "right",
        header: () => <Header />,
        drawerStyle: {
          width: 280,
          backgroundColor: 'transparent',
        }
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      {/* Always register every role's landing screen - the navigator tree is
          built once per render, but navigate() calls (e.g. right after login)
          can fire before a Redux-driven re-render lands, so a screen that's
          only conditionally mounted based on `user.role` may not exist yet
          at the moment something tries to navigate to it. */}
      <Drawer.Screen name="RestaurantDashboard" component={RestaurantDashboard} />
      <Drawer.Screen
        name="PendingApproval"
        component={PendingApprovalScreen}
        options={{ swipeEnabled: false }}
      />
      <Drawer.Screen name="CustomerDashboard" component={CustomerDashboard} />
      <Drawer.Screen name="Login/Signup" component={RestaurentAuth} />
      <Drawer.Screen name="CustomerAuth" component={CustomerAuth} />
      <Drawer.Screen name="About" component={About} />
      <Drawer.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      <Drawer.Screen name="Help" component={Help} />
      <Drawer.Screen name="ContactUs" component={ContactUs} />
      <Drawer.Screen name="FreeQrGenerator" component={FreeQrGenerator} />
      <Drawer.Screen name="Explore" component={Explore} />
      <Drawer.Screen name="ScanScreen" component={ScanScreen} />
      <Drawer.Screen name="Menu" component={Menu} />
      <Drawer.Screen name="AdminDashboard" component={AdminDashboard} />

      {/* NEW: Register the customer-facing screens */}
      <Drawer.Screen name="GuestMenu" component={GuestMenu} />
      <Drawer.Screen name="PublicMenu" component={PublicMenu} />
      <Drawer.Screen name="Cart" component={Cart} />
      <Drawer.Screen name="OrderSuccess" component={OrderSuccess} />
      <Drawer.Screen name="TrackOrder" component={TrackOrder} />

    </Drawer.Navigator>
  );
};

// 2. ROOT STACK NAVIGATOR
const AppNavigator = ({ onReady }: AppNavigatorProps) => {
  const navigationRef = useNavigationContainerRef();
  const [currentRoute, setCurrentRoute] = useState('Home');

  return (
    // Pass the linking configuration here!
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={onReady}
      onStateChange={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name || 'Home')}
    >
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>

          {/* Main App (Includes Header & Sidebar) */}
          <Stack.Screen name="MainApp" component={DrawerNavigator} />

          {/* Hidden Admin Screens */}
          <Stack.Screen name="AdminAuth" component={AdminAuth} />

          {/* Shared password-reset flow, reachable from any of the three login screens */}
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="ResetPassword" component={ResetPassword} />

          {/* Hidden Staff Screen - reached via the "Staff member?" link on Login/Signup */}
          <Stack.Screen name="StaffAuth" component={StaffAuth} />

        </Stack.Navigator>

        {/* Persistent bottom tab bar - lives outside the Drawer/Stack tree so
            inserting it never changes how any existing navigate() call
            resolves; it just calls navigationRef.navigate() directly. */}
        <BottomNavBar navigationRef={navigationRef} currentRoute={currentRoute} />
      </View>
    </NavigationContainer>
  );
};

export default AppNavigator;