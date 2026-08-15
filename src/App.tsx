import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { PersistGate } from 'redux-persist/integration/react';

// Import your Redux store
import { store , persistor} from './App/store';
import VersionCheckWrapper from './components/VersionCheckWrapper';
import AppStatusGuard from './components/system/AppStatusGuard';
import ErrorBoundary from './components/system/ErrorBoundary';
import ThemedChrome from './components/system/ThemedChrome';
import NotificationBridge from './components/system/NotificationBridge';
import { loadToken } from './utils/tokenStorage';
import BhojanQRLoader from './components/BhojanQRLoader';
import SplashScreen from './components/SplashScreen';
import { ThemeProvider } from './theme';
import { I18nProvider } from './i18n';

const SPLASH_DURATION_MS = 2000;

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        {/* Both providers read the persisted preferences slice, so they sit
            INSIDE PersistGate's provider but wrap everything that renders -
            a theme resolved before rehydration would flash the default light
            palette at someone who has chosen dark. */}
        <PersistGate loading={<BhojanQRLoader />} persistor={persistor}>
          <ThemeProvider>
            <I18nProvider>
              <ThemedChrome>
                <AppStatusGuard>
                  <ErrorBoundary>
                    <VersionCheckWrapper>
                      {/* Above the navigator so it is mounted for the whole
                          session - a new order must alert whichever tab is
                          open, or none at all. */}
                      <NotificationBridge />
                      <AppNavigator />
                    </VersionCheckWrapper>
                  </ErrorBoundary>
                </AppStatusGuard>
              </ThemedChrome>
            </I18nProvider>
          </ThemeProvider>
        </PersistGate>

        {/* Deliberately outside the theme: the splash is a fixed brand screen
            with its own cream ground, the same in either theme. */}
        {!splashDone && <SplashScreen />}
      </Provider>
    </SafeAreaProvider>
  );
};

export default App;
