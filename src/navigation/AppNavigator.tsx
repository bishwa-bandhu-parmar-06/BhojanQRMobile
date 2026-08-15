import React, { Suspense } from 'react';
import { useSelector } from 'react-redux';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Eager: the header and the Suspense fallback are on screen before any route
// resolves, so deferring them would only add a loader flash.
import Header from '../components/Header';
import BhojanQRLoader from '../components/BhojanQRLoader';

// Every other screen is deferred until it is actually navigated to.
//
// Why this matters here specifically: Metro ships ONE bundle, so this does not
// shrink the download - what it changes is when each screen's module factory
// (and its whole dependency subtree) is *evaluated*. The default RN config
// already sets `inlineRequires: true`, which rewrites each import into a
// require at its point of use; but `component={RestaurantDashboard}` is itself
// a point of use inside DrawerNavigator's render, so every screen below still
// got evaluated during the first render. Routing them through React.lazy moves
// that work to first navigation, so app start only pays for HomeScreen.
//
// RestaurantDashboard is the big one: it statically imports all ten of its tab
// managers (SettingsManager, HappyHoursManager, OverviewManager, OrderManager,
// StaffManager, ActiveTablesManager, ...), so deferring the dashboard defers
// that entire subtree along with the chart and xlsx code it pulls in.
//
// SCOPE NOTE: this navigator now registers only the sign-in flow and the two
// dashboards. The marketing/info screens (Home, About, Help, ContactUs,
// PrivacyPolicy, FreeQrGenerator, Explore, Menu) and the diner QR-ordering
// flow (GuestMenu, PublicMenu, Cart, OrderSuccess, TrackOrder) are no longer
// reachable. Their FILES are all still present and untouched - re-adding a
// screen is one lazyScreen() line plus one <Stack.Screen>. The dashboards'
// own tab panels (OverviewManager, MenuManager, QRManager, ...) are not
// affected at all: they are rendered directly by the dashboards, never routed
// to, so they were never registered here in the first place.
type ScreenModule = { default: React.ComponentType<any> };

const lazyScreen = (factory: () => Promise<ScreenModule>) => {
  const Lazy = React.lazy(factory);
  // Called once per screen at module scope, so this wrapper is a stable
  // component type - it must never be created inside a render.
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
      // The menu/:restaurantId, .../cart, .../order-success and track-order
      // routes were removed along with the diner QR-ordering screens they
      // pointed at. A route mapped to an unregistered screen does not fail
      // loudly - it just resolves to nothing - so they are deleted rather
      // than left behind. A scanned table QR now opens the website instead
      // of the app, which is the intended behaviour for an owner/admin tool.
      //
      // Lets a tapped password-reset email link jump straight into the app
      // (when installed) pre-filled with the token, mirroring the website's
      // /restaurant/reset-password/:token route. The customer variant is
      // deliberately absent: customer accounts exist only on the website now.
      ResetPassword: 'restaurant/reset-password/:token',
    },
  },
};

// 1. MAIN NAVIGATOR
//
// This was a Drawer (with CustomSidebar as its content) until the sidebar was
// removed. It is now a plain stack, but it stays NESTED under the root stack
// as "MainApp" rather than being flattened into it - the deep-link config
// above addresses its screens as MainApp > GuestMenu/Cart/..., so flattening
// would silently break every table-QR link.
const MainNavigator = () => {

  const user = useSelector((state: any) => state.auth?.user);

  // The app now opens on the restaurant partner login rather than Home. A
  // session that is already signed in must skip straight past it, or an owner
  // reopening the app would be asked to log in again on every launch.
  // Staff share the restaurant dashboard; admins have their own.
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
      {/* No header here: the auth screen carries its own BhojanQR icon and
          title block, so the header's logo bar would be a second, redundant
          piece of branding stacked above it. */}
      <Stack.Screen
        name="Login/Signup"
        component={RestaurentAuth}
        options={{ headerShown: false }}
      />
      {/* Always register every role's landing screen - the navigator tree is
          built once per render, but navigate() calls (e.g. right after login)
          can fire before a Redux-driven re-render lands, so a screen that's
          only conditionally mounted based on `user.role` may not exist yet
          at the moment something tries to navigate to it. */}
      <Stack.Screen name="RestaurantDashboard" component={RestaurantDashboard} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
    </Stack.Navigator>
  );
};

// 2. ROOT STACK NAVIGATOR
const AppNavigator = ({ onReady }: AppNavigatorProps) => {
  return (
    // Pass the linking configuration here!
    // The container ref, the currentRoute state and the onStateChange handler
    // that kept it in sync all existed solely to drive the bottom tab bar
    // (which needed to know the active route to highlight a tab, and a ref to
    // navigate from outside the tree). With the bar gone, navigation happens
    // entirely through per-screen navigate() calls, so none of that
    // bookkeeping - nor the View that wrapped the bar alongside the Stack -
    // has anything left to serve.
    <NavigationContainer linking={linking} onReady={onReady}>
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