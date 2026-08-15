import { createSlice } from '@reduxjs/toolkit';


const initialState = {
  hasUnread: false,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setHasUnread: (state, action) => {
      state.hasUnread = !!action.payload;
    },
    markUnreadArrived: state => {
      state.hasUnread = true;
    },
  },
});

export const { setHasUnread, markUnreadArrived } = notificationSlice.actions;
export default notificationSlice.reducer;
