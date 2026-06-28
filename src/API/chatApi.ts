import api from './axiosInstance';

const BASE_URL = '/chat';

export interface ChatAction {
  type: 'ADD_ORDER' | 'REMOVE_ITEM' | 'DECREASE_QUANTITY' | 'CLEAR_CART' | string;
  replyMessage: string;
  actions?: Array<{
    menuItemId?: string;
    id?: string;
    _id?: string;
    name: string;
    price?: number;
    quantity?: number;
    resolvedId?: string;
  }>;
}

export const sendMessageToAI = async (restaurantId: string, message: string) => {
  const res = await api.post(`${BASE_URL}/ask`, {
    restaurantId,
    userMessage: message,
  });
  return res.data;
};

export const sendLandingChatMessage = async (message: string) => {
  const res = await api.post(`${BASE_URL}/support`, {
    userMessage: message,
  });
  return res.data;
};
