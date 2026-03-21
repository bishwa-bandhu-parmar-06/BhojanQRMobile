import React from 'react';
import { useSelector } from 'react-redux';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Core Screens
import HomeScreen from '../screens/HomeScreen';
import RestaurentAuth from "../screens/RestaurentAuth";
import About from '../screens/About';
import Help from '../screens/Help';
import PrivacyPolicy from '../screens/PrivacyPolicy';

// Restaurant Owner Screens
import RestaurantDashboard from '../screens/Restaurant/RestaurantDashboard';
import Menu from "../screens/Menu"

// Admin Screens
import AdminAuth from '../screens/Admin/AdminAuth';
import AdminDashboard from '../screens/Admin/AdminDashboard'; 

import GuestMenu from '../screens/Restaurant/GuestMenu';
import Cart from '../screens/Cart';
import OrderSuccess from '../screens/Restaurant/OrderSuccess'; 
import TrackOrder from '../screens/TrackOrder';

// Components
import Header from '../components/Header';
import CustomSidebar from '../components/CustomSidebar';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

interface AppNavigatorProps {
  onReady?: () => void;
}

const linking: LinkingOptions<any> = {
  prefixes: ['https://bhojanqr-mjos.onrender.com', 'bhojanqr://'], 
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
    },
  },
};

// 1. DRAWER NAVIGATOR
const DrawerNavigator = () => {

  const user = useSelector((state: any) => state.auth?.user);

  return (
    <Drawer.Navigator 
    initialRouteName={user ? "RestaurantDashboard" : "Home"}
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
      {user ? (
        <Drawer.Screen name="RestaurantDashboard" component={RestaurantDashboard} />
      ) : (
        <Drawer.Screen name="Login/Signup" component={RestaurentAuth} />
      )}
      <Drawer.Screen name="About" component={About} />
      <Drawer.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      <Drawer.Screen name="Help" component={Help} />
      <Drawer.Screen name="Menu" component={Menu} />
      <Drawer.Screen name="AdminDashboard" component={AdminDashboard} />

      {/* NEW: Register the customer-facing screens */}
      <Drawer.Screen name="GuestMenu" component={GuestMenu} />
      <Drawer.Screen name="Cart" component={Cart} />
      <Drawer.Screen name="OrderSuccess" component={OrderSuccess} />
      <Drawer.Screen name="TrackOrder" component={TrackOrder} />
      
    </Drawer.Navigator>
  );
};

// 2. ROOT STACK NAVIGATOR 
const AppNavigator = ({ onReady }: AppNavigatorProps) => {
  return (
    // Pass the linking configuration here!
    <NavigationContainer linking={linking} onReady={onReady}> 
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {/* Main App (Includes Header & Sidebar) */}
        <Stack.Screen name="MainApp" component={DrawerNavigator} />

        {/* Hidden Admin Screens */}
        <Stack.Screen name="AdminAuth" component={AdminAuth} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;