import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { PersistGate } from 'redux-persist/integration/react';

// Import your Redux store
import { store , persistor} from './App/store'; 
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { TouchableOpacity } from 'react-native';
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import VersionCheckWrapper from './components/VersionCheckWrapper';
import AppStatusGuard from './components/system/AppStatusGuard';
import ErrorBoundary from './components/system/ErrorBoundary';
import { loadToken } from './utils/tokenStorage';
import BhojanQRLoader from './components/BhojanQRLoader';
import SplashScreen from './components/SplashScreen';


const SPLASH_DURATION_MS = 2000;

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#16a34a', backgroundColor: '#f0fdf4', marginTop: 10, height: 'auto', minHeight: 60, paddingVertical: 5 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '800', color: '#166534' }}
      text2Style={{ fontSize: 13, color: '#15803d' }}
      renderTrailingIcon={() => (
        <TouchableOpacity 
          onPress={() => Toast.hide()} 
          style={{ padding: 10, justifyContent: 'center', alignItems: 'center' }}
        >
          <FontAwesome5 name="times" size={16} color="#16a34a" />
        </TouchableOpacity>
      )}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#dc2626', backgroundColor: '#fef2f2', marginTop: 10, height: 'auto', minHeight: 60, paddingVertical: 5 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '800', color: '#991b1b' }}
      text2Style={{ fontSize: 13, color: '#b91c1c' }}
      renderTrailingIcon={() => (
        <TouchableOpacity 
          onPress={() => Toast.hide()} 
          style={{ padding: 10, justifyContent: 'center', alignItems: 'center' }}
        >
          <FontAwesome5 name="times" size={16} color="#dc2626" />
        </TouchableOpacity>
      )}
    />
  ),
};


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
        <PersistGate loading={<BhojanQRLoader />} persistor={persistor}>
          <AppStatusGuard>
            <ErrorBoundary>
              <VersionCheckWrapper>

              <AppNavigator />
              </VersionCheckWrapper>
            </ErrorBoundary>
          </AppStatusGuard>
        </PersistGate>
        {!splashDone && <SplashScreen />}

        <Toast config={toastConfig} />
      </Provider>
    </SafeAreaProvider>
  );
};

export default App;