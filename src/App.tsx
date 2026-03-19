import React ,{ useEffect }from 'react';
import { Provider } from 'react-redux';
import AppNavigator from './navigation/AppNavigator';
import BootSplash from "react-native-bootsplash"; 
// Import your Redux store
import { store } from './App/store'; 

const App = () => {
  useEffect(() => {
    const init = async () => {
      try {
        await BootSplash.hide({ fade: true });
        console.log("BootSplash hide ho gaya!");
      } catch (error) {
        console.log("BootSplash Error:", error);
      }
    };

    init();
  }, []);

  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
};

export default App;