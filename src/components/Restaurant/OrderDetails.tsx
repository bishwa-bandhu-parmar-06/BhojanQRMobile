import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';

// FIX 1: Define the shape of an individual order item
export interface OrderItem {
  name: string;
  quantity: number;
  price: number | string;
  [key: string]: any;
}

// FIX 2: Define the shape of the main order object
export interface Order {
  _id: string;
  tableNumber: string | number;
  customerName: string;
  status: string;
  totalPrice: number | string;
  items: OrderItem[] | OrderItem; // Handles cases where items might not be an array
  [key: string]: any;
}

// FIX 3: Define the props expected by the component
interface OrderDetailsProps {
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ 
  order, 
  onClose, 
  onUpdateStatus 
}) => {
  if (!order) return null;
  const [updatedStatus, setUpdatedStatus] = useState(order.status);

  const handleStatusChange = () => {
    if (updatedStatus !== order.status) {
      onUpdateStatus(order._id, updatedStatus);
      Toast.show({ type: 'success', text1: 'Order status updated!' });
    } else {
      Toast.show({ type: 'info', text1: `Status is already ${updatedStatus}` });
    }
  };

  return (
    <Modal visible={!!order} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
          <Text style={styles.info}>Table: {order.tableNumber}</Text>
          <Text style={styles.info}>Customer: {order.customerName}</Text>

          <Text style={styles.label}>Order Status:</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={updatedStatus}
              onValueChange={(itemValue) => setUpdatedStatus(itemValue)}
            >
              <Picker.Item label="Pending" value="Pending" />
              <Picker.Item label="Making" value="Making" />
              <Picker.Item label="Ready" value="Ready" />
              <Picker.Item label="Delivered" value="Delivered" />
            </Picker>
          </View>
          <TouchableOpacity
            onPress={handleStatusChange}
            style={styles.updateBtn}
          >
            <Text style={styles.updateTxt}>Update Status</Text>
          </TouchableOpacity>

          <Text style={[styles.info, { marginTop: 16 }]}>
            Total Price: ₹{order.totalPrice}
          </Text>

          <Text style={styles.itemsTitle}>Ordered Items:</Text>
          <ScrollView style={styles.itemList}>
            {/* FIX 4: Explicitly type 'item' and 'idx' */}
            {(Array.isArray(order.items) ? order.items : [order.items]).map(
              (item: any, idx: number) => (
                <Text key={idx} style={styles.itemRow}>
                  • {item.name} × {item.quantity} — ₹{item.price}
                </Text>
              ),
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    maxHeight: '90%',
    position: 'relative',
  },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  closeTxt: { fontSize: 20, color: '#9ca3af' },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#15803d',
    marginBottom: 16,
  },
  info: { fontSize: 16, color: '#374151', marginBottom: 8, fontWeight: 'bold' },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 12,
  },
  updateBtn: {
    backgroundColor: '#16a34a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateTxt: { color: '#fff', fontWeight: 'bold' },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#15803d',
    marginTop: 16,
    marginBottom: 8,
  },
  itemList: { maxHeight: 150 },
  itemRow: { fontSize: 14, color: '#374151', marginBottom: 4 },
});

export default OrderDetails;