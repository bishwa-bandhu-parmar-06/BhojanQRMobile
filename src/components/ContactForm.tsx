import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Toast from "react-native-toast-message";
import { submitContactForm } from "../API/contactApi";

interface ContactFormProps {
  onClose: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    message: "",
  });

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.mobile || !formData.message) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all required fields.',
      });
      return;
    }

    setIsSubmitting(true);
    
    Toast.show({
      type: 'info',
      text1: 'Sending your message...',
      autoHide: false,
    });

    try {
      const response = await submitContactForm(formData);

      if (response.data.success) {
        Toast.hide();
        Toast.show({
          type: 'success',
          text1: 'Success!',
          text2: 'Message sent successfully!',
        });

        setFormData({ name: "", email: "", mobile: "", message: "" });
        
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (error: any) {
      Toast.hide();
      const errorMessage = error.response?.data?.message || "Something went wrong";
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalContainer}>
              
              {/* HEADER */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>Contact Us</Text>
                  <Text style={styles.headerSubtitle}>We'd love to hear from you!</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <FontAwesome5 name="times" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* NAME INPUT */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={[styles.inputBox, focusedInput === 'name' && styles.inputBoxFocused]}>
                    <FontAwesome5 name="user" size={14} color={focusedInput === 'name' ? '#ea580c' : '#9ca3af'} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="John Doe"
                      placeholderTextColor="#9ca3af"
                      value={formData.name}
                      onChangeText={(text) => handleInputChange("name", text)}
                      onFocus={() => setFocusedInput('name')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                {/* EMAIL INPUT */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={[styles.inputBox, focusedInput === 'email' && styles.inputBoxFocused]}>
                    <FontAwesome5 name="envelope" size={14} color={focusedInput === 'email' ? '#ea580c' : '#9ca3af'} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="john@example.com"
                      placeholderTextColor="#9ca3af"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={formData.email}
                      onChangeText={(text) => handleInputChange("email", text)}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                {/* MOBILE INPUT */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={[styles.inputBox, focusedInput === 'mobile' && styles.inputBoxFocused]}>
                    <FontAwesome5 name="phone-alt" size={14} color={focusedInput === 'mobile' ? '#ea580c' : '#9ca3af'} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="+91 98765 43210"
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                      value={formData.mobile}
                      onChangeText={(text) => handleInputChange("mobile", text)}
                      onFocus={() => setFocusedInput('mobile')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                {/* MESSAGE INPUT */}
                <View style={[styles.inputWrapper, { marginBottom: 24 }]}>
                  <Text style={styles.inputLabel}>Message</Text>
                  <View style={[styles.inputBox, styles.textAreaBox, focusedInput === 'message' && styles.inputBoxFocused]}>
                    <FontAwesome5 name="comment-alt" size={14} color={focusedInput === 'message' ? '#ea580c' : '#9ca3af'} style={styles.textAreaIcon} />
                    <TextInput
                      style={styles.textAreaInput}
                      placeholder="How can we help you?"
                      placeholderTextColor="#9ca3af"
                      multiline={true}
                      numberOfLines={4}
                      textAlignVertical="top"
                      value={formData.message}
                      onChangeText={(text) => handleInputChange("message", text)}
                      onFocus={() => setFocusedInput('message')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                {/* SUBMIT BUTTON */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Send Message</Text>
                      <FontAwesome5 name="paper-plane" size={14} color="#ffffff" solid />
                    </>
                  )}
                </TouchableOpacity>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardAvoid: {
    width: '100%',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#166534', // Brand Green
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#f3f4f6',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputBoxFocused: {
    borderColor: '#ea580c', // Brand Orange highlight
    backgroundColor: '#fffaf5',
  },
  inputIcon: {
    marginRight: 12,
    width: 16,
    textAlign: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
    height: '100%',
  },
  textAreaBox: {
    height: 120,
    alignItems: 'flex-start',
    paddingTop: 14,
  },
  textAreaIcon: {
    marginRight: 12,
    width: 16,
    textAlign: 'center',
    marginTop: 2,
  },
  textAreaInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
    height: '100%',
  },
  submitButton: {
    backgroundColor: '#ea580c', // Brand Orange
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#ea580c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#fca5a5',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 10,
    letterSpacing: 0.5,
  },
});

export default ContactForm;