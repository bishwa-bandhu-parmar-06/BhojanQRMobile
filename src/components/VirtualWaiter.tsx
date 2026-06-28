import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { Bot, Send, X } from 'lucide-react-native';

import { sendMessageToAI } from '../API/chatApi';
import { addToCart, removeFromCart, updateQuantity, clearCart } from '../Features/CartSlice';

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

interface VirtualWaiterProps {
  restaurantId: string;
  menuItems?: any[];
}

// Ports the website's VirtualWaiter.jsx (AI ordering assistant on the
// public menu page, same POST /chat/ask + ADD_ORDER/REMOVE_ITEM/
// DECREASE_QUANTITY/CLEAR_CART action types). Voice input/output (Web
// Speech API) is web-only with no RN equivalent without adding a new
// native dependency, so this is intentionally text-only for now.
//
// Mobile's CartSlice keys remove/update by `cartLineId` (a stable id
// assigned per cart line, since the same dish can appear as separate
// lines under different notes/offers) rather than the website's `_id` -
// every place the website dispatches with a resolved menu-item id, this
// resolves to the matching cart line's `cartLineId` instead.
const VirtualWaiter = ({ restaurantId, menuItems = [] }: VirtualWaiterProps) => {
  const dispatch = useDispatch();
  const currentCartItems = useSelector((state: any) => state.cart?.items || []);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: "Hi there! I'm your virtual waiter \u{1F935}‍♂️. Type to order, remove, or clear your cart!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleApiCall = async (userText: string) => {
    if (!userText.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await sendMessageToAI(restaurantId, userText);
      const aiData = response.data;

      let finalReplyMessage = aiData.replyMessage;
      let shouldExecuteAction = true;

      if (aiData.type === 'REMOVE_ITEM' || aiData.type === 'DECREASE_QUANTITY') {
        let itemExistsInCart = false;

        aiData.actions?.forEach((action: any) => {
          let targetId = action.menuItemId || action.id || action._id;

          if (targetId && String(targetId).length !== 24) {
            const matchedItem = currentCartItems.find(
              (item: any) =>
                item.name?.toLowerCase().trim() === action.name?.toLowerCase().trim() ||
                item.name?.toLowerCase().trim() === String(targetId).toLowerCase().trim(),
            );
            if (matchedItem) targetId = matchedItem._id;
          }

          const foundInCart = currentCartItems.find((i: any) => i._id === targetId);
          if (foundInCart) {
            itemExistsInCart = true;
            // Resolved straight to the cart-line id mobile's slice expects.
            action.resolvedId = foundInCart.cartLineId;
          }
        });

        if (!itemExistsInCart) {
          shouldExecuteAction = false;
          const itemName = aiData.actions?.[0]?.name || 'This item';
          finalReplyMessage = `${itemName} is not in your cart, so I cannot remove it.`;
          Toast.show({ type: 'error', text1: `${itemName} is not in your cart!` });
        }
      }

      if (aiData.type === 'CLEAR_CART' && currentCartItems.length === 0) {
        shouldExecuteAction = false;
        finalReplyMessage = 'Your cart is already empty!';
        Toast.show({ type: 'error', text1: 'Cart is already empty!' });
      }

      setMessages(prev => [...prev, { sender: 'bot', text: finalReplyMessage }]);

      if (shouldExecuteAction) {
        if (aiData.type === 'ADD_ORDER' && aiData.actions?.length > 0) {
          aiData.actions.forEach((action: any) => {
            const targetId = action.menuItemId || action.id || action._id;
            const realItem = menuItems.find(
              (m: any) =>
                m._id === targetId ||
                m.name?.toLowerCase().trim() === action.name?.toLowerCase().trim(),
            );
            const cartItem = realItem || {
              _id: targetId,
              name: action.name,
              price: action.price || 0,
              category: 'Menu',
              imageUrl: '',
            };
            if (targetId || realItem) {
              for (let i = 0; i < (action.quantity || 1); i++) {
                dispatch(addToCart(cartItem));
              }
            }
          });
          Toast.show({ type: 'success', text1: 'Items added to cart!' });
        } else if (aiData.type === 'REMOVE_ITEM' && aiData.actions?.length > 0) {
          aiData.actions.forEach((action: any) => {
            if (action.resolvedId) dispatch(removeFromCart(action.resolvedId));
          });
          Toast.show({ type: 'success', text1: 'Item completely removed!' });
        } else if (aiData.type === 'DECREASE_QUANTITY' && aiData.actions?.length > 0) {
          aiData.actions.forEach((action: any) => {
            if (!action.resolvedId) return;
            const existing = currentCartItems.find((i: any) => i.cartLineId === action.resolvedId);
            if (existing) {
              const newQty = existing.quantity - (action.quantity || 1);
              if (newQty <= 0) {
                dispatch(removeFromCart(action.resolvedId));
              } else {
                dispatch(updateQuantity({ id: action.resolvedId, quantity: newQty }));
              }
            }
          });
          Toast.show({ type: 'success', text1: 'Quantity reduced!' });
        } else if (aiData.type === 'CLEAR_CART') {
          dispatch(clearCart());
          Toast.show({ type: 'success', text1: 'Cart cleared completely!' });
        }
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Bot side configuration error.' });
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    handleApiCall(input.trim());
  };

  return (
    <>
      <TouchableOpacity style={styles.headerBtn} onPress={() => setIsOpen(true)} activeOpacity={0.8}>
        <Bot size={20} color="#ea580c" />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            style={styles.panel}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconWrap}>
                  <Bot size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>AI Waiter</Text>
                  <Text style={styles.headerSubtitle}>Smart Assistant</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <X size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg, i) => (
                <View key={i} style={[styles.bubbleRow, msg.sender === 'user' && styles.bubbleRowUser]}>
                  <View style={[styles.bubble, msg.sender === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                    <Text style={msg.sender === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot}>
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}
              {isTyping && (
                <View style={styles.bubbleRow}>
                  <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask or order something..."
                placeholderTextColor="#9ca3af"
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!isTyping}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!input.trim() || isTyping}
              >
                <Send size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: { height: '80%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f97316', paddingHorizontal: 18, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  headerSubtitle: { fontSize: 10, fontWeight: '700', color: '#ffedd5', letterSpacing: 0.5, marginTop: 2 },
  closeBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 18 },
  messages: { flex: 1, backgroundColor: '#f9fafb' },
  messagesContent: { padding: 16, gap: 12 },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#f97316', borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6', borderBottomLeftRadius: 4 },
  bubbleTextUser: { color: '#fff', fontSize: 14, fontWeight: '500' },
  bubbleTextBot: { color: '#374151', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  typingBubble: { flexDirection: 'row', gap: 4, paddingVertical: 14 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fb923c' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  input: { flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1f2937' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#d1d5db' },
});

export default VirtualWaiter;
