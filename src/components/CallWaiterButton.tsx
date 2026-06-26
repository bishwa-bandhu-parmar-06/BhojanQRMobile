import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {
  BellRing,
  CheckCircle2,
  X,
  Droplet,
  FileText,
  Utensils,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react-native';

import { requestWaiterService } from '../API/serviceRequestApi';

interface Props {
  restaurantId?: string;
  tableNumber?: string | number;
}

const COOLDOWN_TIME = 3 * 60 * 1000; // 3 minutes, mirrors web's CallWaiterButton.jsx

const WAITER_OPTIONS = [
  { id: 'water', label: 'Need Water Bottle', Icon: Droplet, color: '#2563eb' },
  { id: 'bill', label: 'Bring the Bill', Icon: FileText, color: '#16a34a' },
  { id: 'tissue', label: 'Need Extra Tissues', Icon: FileSpreadsheet, color: '#d97706' },
  { id: 'spoons', label: 'Need Spoons / Fork', Icon: Utensils, color: '#9333ea' },
  { id: 'general', label: 'General Assistance', Icon: HelpCircle, color: '#ea580c' },
];

const CallWaiterButton: React.FC<Props> = ({ restaurantId, tableNumber }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cooldownKey = `waiter_cooldown_${restaurantId}_${tableNumber}`;

  useEffect(() => {
    if (!restaurantId || !tableNumber) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const saved = await AsyncStorage.getItem(cooldownKey);
      if (!saved) return;
      const elapsed = Date.now() - parseInt(saved, 10);
      if (elapsed < COOLDOWN_TIME) {
        setIsCooldown(true);
        timer = setTimeout(() => {
          setIsCooldown(false);
          AsyncStorage.removeItem(cooldownKey);
        }, COOLDOWN_TIME - elapsed);
      } else {
        AsyncStorage.removeItem(cooldownKey);
      }
    })();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [restaurantId, tableNumber, cooldownKey]);

  const executeCallWaiter = async (message: string) => {
    if (!tableNumber) {
      Toast.show({ type: 'error', text1: 'Table number not found. Please scan the QR code again.' });
      return;
    }

    setIsCalling(true);
    setIsModalOpen(false);

    try {
      const res = await requestWaiterService({ restaurantId, tableNumber, message });
      if (res.data?.success) {
        Toast.show({ type: 'success', text1: 'Waiter has been notified!' });
        await AsyncStorage.setItem(cooldownKey, Date.now().toString());
        setIsCooldown(true);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to call waiter.';
      Toast.show({ type: 'error', text1: errorMsg });
      if (error.response?.status === 429 || errorMsg.includes('already informed')) {
        await AsyncStorage.setItem(cooldownKey, Date.now().toString());
        setIsCooldown(true);
      }
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.callBtn, isCooldown && styles.callBtnCooldown]}
        disabled={isCalling || isCooldown}
        onPress={() => !isCooldown && setIsModalOpen(true)}
      >
        {isCalling ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : isCooldown ? (
          <CheckCircle2 size={16} color="#fff" />
        ) : (
          <BellRing size={16} color="#fff" />
        )}
        <Text style={styles.callBtnText}>
          {isCalling ? 'Calling...' : isCooldown ? 'Sent' : 'Call Waiter'}
        </Text>
      </TouchableOpacity>

      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>How can we help you?</Text>
                <Text style={styles.sheetSubtitle}>Select a quick option for Table #{tableNumber}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.closeBtn}>
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {WAITER_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionRow}
                onPress={() => executeCallWaiter(option.label)}
              >
                <View style={[styles.optionIconBox, { backgroundColor: `${option.color}1A` }]}>
                  <option.Icon size={20} color={option.color} />
                </View>
                <Text style={styles.optionLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ea580c', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  callBtnCooldown: { backgroundColor: '#9ca3af' },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32 },
  dragHandle: { width: 48, height: 4, backgroundColor: '#d1d5db', borderRadius: 4, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sheetSubtitle: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginTop: 2 },
  closeBtn: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 100 },

  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 14, marginBottom: 10 },
  optionIconBox: { padding: 10, borderRadius: 12 },
  optionLabel: { fontWeight: '800', color: '#1f2937', fontSize: 14, flex: 1 },
});

export default CallWaiterButton;
