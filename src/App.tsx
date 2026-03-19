import React from 'react';
import { Provider } from 'react-redux';
import AppNavigator from './navigation/AppNavigator';

// Import your Redux store
import { store } from './App/store'; 

const App = () => {
  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
};

export default App;