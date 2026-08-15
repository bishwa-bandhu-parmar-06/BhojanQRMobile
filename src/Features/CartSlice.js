import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  totalQuantity: 0,
  totalAmount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const newItem = action.payload;
      const note = newItem.note || '';
      const existingItem = state.items.find(
        item =>
          item._id === newItem._id &&
          (item.note || '') === note &&
          (item.offerId || null) === (newItem.offerId || null),
      );

      state.totalQuantity++;
      state.totalAmount += Number(newItem.price);

      if (!existingItem) {
        state.items.push({
          ...newItem,
          note,
          cartLineId: nanoid(),
          quantity: 1,
        });
      } else {
        existingItem.quantity++;
      }
    },
    removeFromCart: (state, action) => {
      const cartLineId = action.payload;
      const existingItem = state.items.find(
        item => item.cartLineId === cartLineId,
      );

      if (existingItem) {
        state.totalQuantity -= existingItem.quantity;
        state.totalAmount -= Number(existingItem.price) * existingItem.quantity;
        state.items = state.items.filter(
          item => item.cartLineId !== cartLineId,
        );
      }
    },
    updateQuantity: (state, action) => {
      const { id: cartLineId, quantity } = action.payload;
      const existingItem = state.items.find(
        item => item.cartLineId === cartLineId,
      );

      if (existingItem) {
        const quantityDifference = quantity - existingItem.quantity;
        state.totalQuantity += quantityDifference;
        state.totalAmount += Number(existingItem.price) * quantityDifference;
        existingItem.quantity = quantity;
      }
    },
    updateItemPricing: (state, action) => {
      const {
        cartLineId,
        price,
        originalPrice,
        discountAmount,
        offerId,
        offerName,
        lockedAt,
      } = action.payload;
      const existingItem = state.items.find(
        item => item.cartLineId === cartLineId,
      );
      if (existingItem) {
        const priceDifference = price - existingItem.price;
        state.totalAmount += priceDifference * existingItem.quantity;
        existingItem.price = price;
        existingItem.originalPrice = originalPrice;
        existingItem.discountAmount = discountAmount;
        existingItem.offerId = offerId;
        existingItem.offerName = offerName;
        existingItem.lockedAt = lockedAt;
      }
    },
    clearCart: state => {
      state.items = [];
      state.totalQuantity = 0;
      state.totalAmount = 0;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  updateItemPricing,
  clearCart,
} = cartSlice.actions;
export default cartSlice.reducer;
