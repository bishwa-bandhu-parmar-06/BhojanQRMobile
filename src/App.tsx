import React ,{ useEffect }from 'react';
import { Provider } from 'react-redux';
import AppNavigator from './navigation/AppNavigator';
import BootSplash from "react-native-bootsplash"; 
import { PersistGate } from 'redux-persist/integration/react';

// Import your Redux store
import { store , persistor} from './App/store'; 
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { TouchableOpacity, View } from 'react-native';
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import VersionCheckWrapper from './components/VersionCheckWrapper';


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
useEffect(() => {
    const splashTimeout = setTimeout(async () => {
      try {
        await BootSplash.hide({ fade: true });
        console.log("Failsazfe: BootSplash force hidden!");
      } catch (e) {
        console.log("BootSplash Error:", e);
      }
    }, 3000); 

    return () => clearTimeout(splashTimeout);
  }, []);
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {/*  AppNavigator mein onReady callback use karenge */}
        <VersionCheckWrapper>
        <AppNavigator 
          onReady={async () => {
            try {
              await BootSplash.hide({ fade: true });
              console.log("BootSplash: App is ready and persistent data loaded!");
            } catch (e) {
              console.log("BootSplash Error:", e);
            }
          }}
        />
        </VersionCheckWrapper>
      </PersistGate>
      <Toast config={toastConfig} />
    </Provider>
  );
};

export default App;