import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../Features/AuthSlice';
import cartReducer from '../Features/CartSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistReducer } from 'redux-persist';
import { combineReducers } from 'redux';
import { persistStore } from 'redux-persist';

const persistConfig = {
  key: 'bhojanqr_root',
  storage: AsyncStorage,
  whitelist: ['auth'],
};

const reducers = combineReducers({
  auth: authReducer,
  cart: cartReducer,
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
