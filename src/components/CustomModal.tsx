import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal 
} from 'react-native';
import { LogOut, AlertCircle, CheckCircle } from 'lucide-react-native';

interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'logout' | 'error' | 'success'; // Icon aur color decide karne ke liye
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void; // Agar onCancel nahi denge, toh Cancel button hide ho jayega (Session Expired ke liye mast hai)
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  title,
  message,
  type = 'logout',
  confirmText = 'Yes',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  // Theme decide karna based on type
  const getTheme = () => {
    switch (type) {
      case 'error': return { color: '#ea580c', bg: '#fff7ed', icon: <AlertCircle size={32} color="#ea580c" /> };
      case 'success': return { color: '#16a34a', bg: '#f0fdf4', icon: <CheckCircle size={32} color="#16a34a" /> };
      case 'logout':
      default: return { color: '#ef4444', bg: '#fef2f2', icon: <LogOut size={32} color="#ef4444" /> };
    }
  };

  const theme = getTheme();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel} // Android back button par cancel trigger hoga
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          
          <View style={[styles.modalIconContainer, { backgroundColor: theme.bg }]}>
            {theme.icon}
          </View>
          
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          
          <View style={styles.modalButtonContainer}>
            {/* Cancel Button (Sirf tab dikhega jab onCancel prop pass kiya ho) */}
            {onCancel && (
              <TouchableOpacity style={styles.modalCancelButton} onPress={onCancel}>
                <Text style={styles.modalCancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            {/* Confirm Button */}
            <TouchableOpacity 
              style={[styles.modalConfirmButton, { backgroundColor: theme.color, shadowColor: theme.color }]} 
              onPress={onConfirm}
            >
              <Text style={styles.modalConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#1f2937', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalButtonContainer: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#4b5563' },
  modalConfirmButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  modalConfirmText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});

export default CustomModal;