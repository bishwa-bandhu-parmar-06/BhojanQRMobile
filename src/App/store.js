import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../Features/AuthSlice';
import cartReducer from '../Features/CartSlice';
import notificationReducer from '../Features/NotificationSlice';
import preferencesReducer from '../Features/PreferencesSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistReducer } from 'redux-persist';
import { combineReducers } from 'redux';
import { persistStore } from 'redux-persist';

const persistConfig = {
  key: 'bhojanqr_root',
  storage: AsyncStorage,
  // preferences joins auth: a theme or language choice must survive a restart,
  // and it is device state with no server copy to re-fetch it from.
  whitelist: ['auth', 'preferences'],
};

const reducers = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  notifications: notificationReducer,
  preferences: preferencesReducer,
});

const persistedReducer = persistReducer(persistConfig, reducers);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: { warnAfter: 128 },
    }),
});

export const persistor = persistStore(store);
