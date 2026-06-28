// Screens registered directly on the root Stack.Navigator (see
// AppNavigator.tsx) - everything else lives inside the Drawer, nested under
// the "MainApp" stack screen. navigation.navigate('SomeDrawerScreen') only
// works when called from *inside* the Drawer; called from a root-level
// screen (AdminAuth, ForgotPassword, ResetPassword, StaffAuth) it silently
// fails with "was not handled by any navigator" because navigate() doesn't
// search into child navigators, only the current one and its parents.
const ROOT_STACK_SCREENS = new Set(['MainApp', 'AdminAuth', 'ForgotPassword', 'ResetPassword', 'StaffAuth']);

export const navigateToScreen = (navigation: any, screenName: string, params?: object) => {
  if (ROOT_STACK_SCREENS.has(screenName)) {
    navigation.navigate(screenName, params);
  } else {
    navigation.navigate('MainApp', { screen: screenName, params });
  }
};
