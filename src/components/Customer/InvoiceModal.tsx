import React, { useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';
import Share from 'react-native-share';
// @ts-ignore
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import Toast from 'react-native-toast-message';
import { X, Image as ImageIcon, FileText } from 'lucide-react-native';

interface InvoiceModalProps {
  order: any;
  visible: boolean;
  onClose: () => void;
}

// Mirrors the website's InvoiceModal.jsx receipt layout, and reuses the
// same ViewShot/Share/RNHTMLtoPDF download pattern already established in
// OrderSuccess.tsx, since these libraries are already wired up there.
const InvoiceModal = ({ order, visible, onClose }: InvoiceModalProps) => {
  const viewShotRef = useRef<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!order) return null;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(order.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const orderRef = order.razorpayPaymentId || order._id;
  const filename = `Invoice_${orderRef}`;

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
      const uri = await viewShotRef.current.capture();
      await CameraRoll.saveAsset(uri, { type: 'photo' });
      Toast.show({ type: 'success', text1: 'Image downloaded successfully!' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save image. Check permissions.' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const htmlContent = `
        <h1>Invoice: ${order.restaurantName || 'Restaurant'}</h1>
        <p>Date: ${formattedDate} | Time: ${formattedTime}</p>
        <p>Table: ${order.tableNumber || '-'}</p>
        <p>Order Ref: ${orderRef}</p>
        <hr/>
        <ul>
          ${(order.items || [])
            .map((item: any) => `<li>${item.name} (x${item.quantity}) - ₹${item.quantity * item.price}</li>`)
            .join('')}
        </ul>
        <h3>Total Paid: ₹${order.totalPrice}</h3>
        <p>Payment Status: ${order.paymentStatus}</p>
      `;
      const file = await RNHTMLtoPDF.convert({ html: htmlContent, fileName: filename, directory: 'Documents' });
      if (file.filePath) {
        await Share.open({ url: `file://${file.filePath}`, title: 'Share Invoice PDF' });
        Toast.show({ type: 'success', text1: 'PDF shared successfully!' });
      }
    } catch (error) {
      console.log('Invoice PDF share cancelled or failed', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Invoice</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={styles.receiptCard}>
              <View style={styles.receiptInner}>
                <View style={styles.receiptHeader}>
                  <Text style={styles.restaurantName}>{order.restaurantName || 'Restaurant'}</Text>
                  {order.restaurantGstin && (
                    <Text style={styles.gstinText}>GSTIN: {order.restaurantGstin}</Text>
                  )}
                </View>

                <View style={styles.dateTimeRow}>
                  <Text style={styles.dateTimeText}>Date: {formattedDate}</Text>
                  <Text style={styles.dateTimeText}>Time: {formattedTime}</Text>
                </View>

                <View style={styles.infoBlock}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Table No:</Text>
                    <View style={styles.tableBadge}>
                      <Text style={styles.tableBadgeText}>{order.tableNumber || '-'}</Text>
                    </View>
                  </View>
                  <View style={styles.tokenBlock}>
                    <Text style={styles.tokenLabel}>Order Ref:</Text>
                    <Text style={styles.tokenValue} numberOfLines={1}>{orderRef}</Text>
                  </View>
                </View>

                <View style={styles.summaryBlock}>
                  <Text style={styles.summaryTitle}>Order Summary</Text>
                  {(order.items || []).map((item: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQty}>{item.quantity} x ₹{item.price}</Text>
                        {item.offerId && (
                          <Text style={styles.itemOffer}>
                            Original: ₹{item.originalPrice} · Discount: ₹{item.discountAmount} · {item.offerName}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.itemTotal}>₹{item.quantity * item.price}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalBlock}>
                  <Text style={styles.totalLabel}>Total Paid</Text>
                  <Text style={styles.totalAmount}>₹{order.totalPrice}</Text>
                </View>

                <View style={styles.footerNote}>
                  <Text style={styles.footerNoteText}>Paid via Razorpay (Online)</Text>
                  <Text style={styles.footerNoteText}>Payment Status: {order.paymentStatus}</Text>
                </View>
              </View>
            </ViewShot>
          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleDownloadImage} disabled={isDownloading} style={styles.imgBtn}>
              <ImageIcon size={16} color="#ea580c" />
              <Text style={styles.imgBtnText}>Image</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownloadPDF} disabled={isDownloading} style={styles.pdfBtn}>
              <FileText size={16} color="#fff" />
              <Text style={styles.pdfBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937' },
  closeBtn: { padding: 6, backgroundColor: '#f3f4f6', borderRadius: 10 },
  scrollContent: { padding: 20, alignItems: 'center' },

  receiptCard: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  receiptInner: { padding: 20 },
  receiptHeader: { alignItems: 'center', borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#d1d5db', paddingBottom: 16, marginBottom: 16 },
  restaurantName: { fontSize: 18, fontWeight: '800', color: '#1f2937', textTransform: 'uppercase' },
  gstinText: { fontSize: 11, color: '#6b7280', marginTop: 4, fontFamily: 'monospace' },
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#d1d5db', paddingBottom: 12, marginBottom: 12 },
  dateTimeText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },

  infoBlock: { marginBottom: 16, gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  tableBadge: { backgroundColor: '#ffedd5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  tableBadgeText: { color: '#c2410c', fontWeight: '800', fontSize: 15 },
  tokenBlock: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tokenLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  tokenValue: { fontFamily: 'monospace', fontWeight: '700', fontSize: 11, color: '#1f2937', maxWidth: 160 },

  summaryBlock: { marginBottom: 16 },
  summaryTitle: { fontSize: 11, fontWeight: '800', color: '#1f2937', textTransform: 'uppercase', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingBottom: 8, marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#374151' },
  itemQty: { fontSize: 11, color: '#9ca3af' },
  itemOffer: { fontSize: 9, color: '#ef4444', fontWeight: '700', marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: '800', color: '#1f2937' },

  totalBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#d1d5db', paddingTop: 14, marginBottom: 14 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#4b5563' },
  totalAmount: { fontSize: 20, fontWeight: '900', color: '#16a34a' },

  footerNote: { alignItems: 'center', backgroundColor: '#f9fafb', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  footerNoteText: { fontSize: 10, color: '#9ca3af' },

  actionsRow: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderColor: '#f3f4f6' },
  imgBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: '#ea580c', paddingVertical: 12, borderRadius: 12 },
  imgBtnText: { color: '#ea580c', fontWeight: '700', fontSize: 13 },
  pdfBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ea580c', paddingVertical: 12, borderRadius: 12 },
  pdfBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

export default InvoiceModal;
