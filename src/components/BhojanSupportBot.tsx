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
import { Bot, Send, X } from 'lucide-react-native';

import { sendLandingChatMessage } from '../API/chatApi';

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

// Ports the website's BhojanSupportBot.jsx (landing-page sales/support
// bot, Gemini-backed via POST /chat/support) - same opening line, same
// fallback message on network failure. The website's panel already
// collapses to a near-fullscreen bottom sheet on mobile widths, so this
// uses a slide-up Modal to match that same mobile presentation.
const BhojanSupportBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text:
        'Namaste! \u{1F64F} I am the BhojanQR Support AI. Are you a restaurant owner looking to digitize your menu, or just curious about how we work?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage || isTyping) return;

    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const data = await sendLandingChatMessage(userMessage);
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    } catch {
      Toast.show({ type: 'error', text1: 'Network issue. Please try again.' });
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Oops! I lost connection. Please email us at bhojanqr@gmail.com' },
      ]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <>
      {!isOpen && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsOpen(true)} activeOpacity={0.85}>
          <Bot size={28} color="#fff" />
        </TouchableOpacity>
      )}

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
                  <Text style={styles.headerTitle}>BhojanQR Guide</Text>
                  <View style={styles.onlineRow}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>ONLINE</Text>
                  </View>
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
              <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask anything..."
                placeholderTextColor="#9ca3af"
                onSubmitEditing={handleSend}
                returnKeyType="send"
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
  fab: {
    position: 'absolute',
    bottom: 30,
    left: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#ea580c',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: { height: '80%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f97316', paddingHorizontal: 18, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#86efac' },
  onlineText: { fontSize: 9, fontWeight: '800', color: '#ffedd5', letterSpacing: 0.5 },
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

export default BhojanSupportBot;
