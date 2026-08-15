import { createSlice } from '@reduxjs/toolkit';

// Device-level app preferences, as opposed to restaurant data (which lives on
// the server and is edited from Profile Details). These belong to the phone,
// not the account: two staff sharing one venue should each get their own.
//
// Persisted via redux-persist's whitelist in App/store.js, so a choice made
// here survives a restart without a round trip to the backend.
const initialState = {
  // 'system' follows the OS setting; the other two pin it.
  theme: 'system',
  language: 'en',
  // Whether the header bell lights up and order alerts are surfaced at all.
  orderAlerts: true,
  // Sound on a new order - separate from the visual alert, because a kitchen
  // wants the noise and a manager on the floor usually does not.
  alertSound: true,
  // Keeps the screen awake while the dashboard is open, for a tablet mounted
  // at the counter.
  keepScreenAwake: false,
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setPreference: (state, action) => {
      const { key, value } = action.payload;
      if (key in state) state[key] = value;
    },
    resetPreferences: () => initialState,
  },
});

export const { setPreference, resetPreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;
