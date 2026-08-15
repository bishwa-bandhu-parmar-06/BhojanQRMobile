import React, { Suspense } from 'react';
import { useSelector } from 'react-redux';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Header from '../components/Header';
import BhojanQRLoader from '../components/BhojanQRLoader';

type ScreenModule = { default: React.ComponentType<any> };

const lazyScreen = (factory: () => Promise<ScreenModule>) => {
  const Lazy = React.lazy(factory);
  const Screen = (props: any) => (
    <Suspense fallback={<BhojanQRLoader />}>
      <Lazy {...props} />
    </Suspense>
  );
  return Screen;
};

const RestaurentAuth = lazyScreen(() => import('../screens/RestaurentAuth'));

const RestaurantDashboard = lazyScreen(
  () => import('../screens/Restaurant/RestaurantDashboard'),
);
const PendingApprovalScreen = lazyScreen(
  () => import('../screens/Restaurant/PendingApprovalScreen'),
);

const AdminAuth = lazyScreen(() => import('../screens/Admin/AdminAuth'));
const AdminDashboard = lazyScreen(() => import('../screens/Admin/AdminDashboard'));

const ForgotPassword = lazyScreen(() => import('../screens/Auth/ForgotPassword'));
const ResetPassword = lazyScreen(() => import('../screens/Auth/ResetPassword'));
const StaffAuth = lazyScreen(() => import('../screens/Staff/StaffAuth'));

const Stack = createNativeStackNavigator();

interface AppNavigatorProps {
  onReady?: () => void;
}

const linking: LinkingOptions<any> = {
  prefixes: ['https://bhojanqr.com', 'bhojanqr://'],
  config: {
    screens: {
      ResetPassword: 'restaurant/reset-password/:token',
    },
  },
};


const MainNavigator = () => {

  const user = useSelector((state: any) => state.auth?.user);

  const initialRoute =
    user?.role === 'restaurant' || user?.role === 'staff'
      ? 'RestaurantDashboard'
      : user?.role === 'admin'
      ? 'AdminDashboard'
      : 'Login/Signup';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ header: () => <Header /> }}
    >
      <Stack.Screen
        name="Login/Signup"
        component={RestaurentAuth}
        options={{ headerShown: false }}
      />
      {/* The dashboard renders its own Header. It is the only thing that
          knows which panel is showing, and the bar has to change with that:
          the heading names the panel, and the More sections and Notifications
          are shown with no header at all. A navigator-level header cannot see
          any of that. */}
      <Stack.Screen
        name="RestaurantDashboard"
        component={RestaurantDashboard}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
    </Stack.Navigator>
  );
};

// 2. ROOT STACK NAVIGATOR
const AppNavigator = ({ onReady }: AppNavigatorProps) => {
  return (
    
    <NavigationContainer ref={navigationRef} linking={linking} onReady={onReady}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {/* Main App (includes the Header) */}
        <Stack.Screen name="MainApp" component={MainNavigator} />

        {/* Hidden Admin Screens */}
        <Stack.Screen name="AdminAuth" component={AdminAuth} />

        {/* Shared password-reset flow, reachable from any of the three login screens */}
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />

        {/* Hidden Staff Screen - reached via the "Staff member?" link on Login/Signup */}
        <Stack.Screen name="StaffAuth" component={StaffAuth} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;