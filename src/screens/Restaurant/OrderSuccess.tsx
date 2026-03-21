import React, { useRef, useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import ViewShot from "react-native-view-shot";
import Share from "react-native-share";

// @ts-ignore
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import Toast from "react-native-toast-message";
import { Copy, Image as ImageIcon, FileText, CheckCircle, Home } from "lucide-react-native";
import Clipboard from '@react-native-clipboard/clipboard';

import { getPublicRestaurantDetails } from "../../API/restaurentApi";
import { getPublicAdminContact } from "../../API/adminApi";

const OrderSuccess = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const viewShotRef = useRef<any>(null);

  const {
    restaurantId,
    customerName = "Guest",
    tableNumber = "N/A",
    cart = [],
    total = 0,
    paymentId = "N/A",
    date = new Date().toISOString(),
    restaurantName: initialRestaurantName = "Loading...",
    restaurantEmail: initialEmail = "contact@restaurant.com"
  } = (route.params as any) || {};

  const [restaurantEmail, setRestaurantEmail] = useState(initialEmail);
  const [restaurantName, setRestaurantName] = useState(initialRestaurantName);
  const [adminEmail, setAdminEmail] = useState("Loading support email...");

  const formattedDate = new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const formattedTime = new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    if (!route.params) {
      navigation.navigate("Home");
      return;
    }

    const fetchPublicDetails = async () => {
      try {
        const [adminRes, restRes] = await Promise.all([
          getPublicAdminContact().catch(() => ({ data: { success: false } })),
          getPublicRestaurantDetails(restaurantId).catch(() => ({ data: { success: false } })),
        ]);

        if (adminRes.data?.success) setAdminEmail(adminRes.data.data.email);
        else setAdminEmail("support@bhojanqr.com");

        if (restRes.data?.success) {
          setRestaurantName(restRes.data.data.restaurantName || initialRestaurantName);
          setRestaurantEmail(restRes.data.data.email || initialEmail);
        } else {
          setRestaurantEmail("contact@restaurant.com");
        }
      } catch (error) {
        setAdminEmail("support@bhojanqr.com");
        setRestaurantEmail("contact@restaurant.com");
      }
    };

    if (restaurantId) fetchPublicDetails();
  }, [route.params, restaurantId]);

  const handleCopyToken = () => {
    Clipboard.setString(paymentId);
    Toast.show({ type: "success", text1: "Token copied to clipboard!" });
  };

  const handleDownloadImage = async () => {
    try {
      const uri = await viewShotRef.current.capture();
      await CameraRoll.saveAsset(uri, { type: 'photo' });
      Toast.show({ type: "success", text1: "saved success" });
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to save image. Check permissions." });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      let htmlContent = `
        <h1>Receipt: ${restaurantName}</h1>
        <p>Date: ${formattedDate} | Time: ${formattedTime}</p>
        <p>Customer: ${customerName} | Table: ${tableNumber}</p>
        <p>Token: ${paymentId}</p>
        <hr/>
        <ul>
          ${cart.map((item: any) => `<li>${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}</li>`).join('')}
        </ul>
        <h3>Total: ₹${total}</h3>
      `;

      let options = {
        html: htmlContent,
        fileName: `Receipt_${paymentId}`,
        directory: 'Documents',
      };

      let file = await RNHTMLtoPDF.convert(options);
      
      if (file.filePath) {
        //  FIX: Trigger native share and show success toast
        await Share.open({ url: `file://${file.filePath}`, title: "Share Receipt PDF" });
        Toast.show({ type: "success", text1: "PDF shared successfully!" });
      }
    } catch (error) {
      // If the user cancels the share dialog, do not show an error toast.
      console.log("PDF Share cancelled or failed", error);
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={{ alignItems: "center", paddingVertical: 40 }}>
      <View style={styles.banner}>
        <CheckCircle size={64} color="#22c55e" style={{ marginBottom: 8 }} />
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>Thank you for your order.</Text>
      </View>

      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1.0 }} style={styles.receiptContainer}>
        <View style={styles.receiptInner}>
          <View style={styles.receiptHeader}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.restaurantName}>{restaurantName}</Text>
            <Text style={styles.contactText}>Contact: {restaurantEmail}</Text>
          </View>

          <View style={styles.dateTimeRow}>
            <Text style={styles.dateTimeText}>Date: {formattedDate}</Text>
            <Text style={styles.dateTimeText}>Time: {formattedTime}</Text>
          </View>

          <View style={styles.infoBlock}>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Customer:</Text><Text style={styles.infoValue}>{customerName}</Text></View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Table No:</Text>
              <View style={styles.tableBadge}><Text style={styles.tableBadgeText}>{tableNumber}</Text></View>
            </View>

            <View style={styles.tokenBlock}>
              <Text style={styles.tokenLabel}>Token:</Text>
              <View style={styles.tokenRow}>
                <Text style={styles.tokenValue} numberOfLines={1}>{paymentId}</Text>
                <TouchableOpacity onPress={handleCopyToken} style={{ padding: 4 }}>
                  <Copy size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.summaryBlock}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            {/* Now that cart is passed properly, this will map perfectly! */}
            {cart.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>{item.quantity} x ₹{item.price}</Text>
                </View>
                <Text style={styles.itemTotal}>₹{item.quantity * item.price}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalAmount}>₹{total}</Text>
          </View>
        </View>
      </ViewShot>

      <View style={styles.actionsContainer}>
        <View style={styles.btnRow}>
          <TouchableOpacity onPress={handleDownloadImage} style={styles.imgBtn}>
            <ImageIcon size={18} color="#ea580c" />
            <Text style={styles.imgBtnText}>Save Image</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownloadPDF} style={styles.pdfBtn}>
            <FileText size={18} color="#fff" />
            <Text style={styles.pdfBtnText}>Share PDF</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.homeBtn}>
          <Home size={16} color="#6b7280" />
          <Text style={styles.homeBtnText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  banner: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "900", color: "#1f2937" },
  subtitle: { fontSize: 14, color: "#6b7280", fontWeight: "500", marginTop: 4 },
  receiptContainer: { width: "90%", maxWidth: 400, backgroundColor: "#fff", borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, marginBottom: 24 },
  receiptInner: { padding: 24 },
  receiptHeader: { alignItems: "center", borderBottomWidth: 1, borderStyle: "dashed", borderColor: "#d1d5db", paddingBottom: 20, marginBottom: 20 },
  logo: { height: 80, width: 150, marginBottom: 8 },
  restaurantName: { fontSize: 20, fontWeight: "bold", color: "#1f2937", textTransform: "uppercase" },
  contactText: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  dateTimeRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderStyle: "dashed", borderColor: "#d1d5db", paddingBottom: 16, marginBottom: 16 },
  dateTimeText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  infoBlock: { marginBottom: 24 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  infoLabel: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  infoValue: { fontSize: 14, fontWeight: "bold", color: "#1f2937" },
  tableBadge: { backgroundColor: "#ffedd5", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  tableBadgeText: { color: "#c2410c", fontWeight: "bold", fontSize: 16 },
  tokenBlock: { backgroundColor: "#f9fafb", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#f3f4f6", marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tokenLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  tokenRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tokenValue: { fontFamily: "monospace", fontWeight: "bold", fontSize: 12, color: "#1f2937", width: 100 },
  summaryBlock: { marginBottom: 24 },
  summaryTitle: { fontSize: 12, fontWeight: "bold", color: "#1f2937", textTransform: "uppercase", borderBottomWidth: 1, borderColor: "#e5e7eb", paddingBottom: 8, marginBottom: 12 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#374151" },
  itemQty: { fontSize: 12, color: "#9ca3af" },
  itemTotal: { fontSize: 14, fontWeight: "bold", color: "#1f2937" },
  totalBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 2, borderStyle: "dashed", borderColor: "#d1d5db", paddingTop: 16 },
  totalLabel: { fontSize: 18, fontWeight: "bold", color: "#4b5563" },
  totalAmount: { fontSize: 24, fontWeight: "900", color: "#16a34a" },
  actionsContainer: { width: "90%", maxWidth: 400, gap: 12 },
  btnRow: { flexDirection: "row", gap: 12 },
  imgBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff", borderWidth: 2, borderColor: "#ea580c", paddingVertical: 14, borderRadius: 12 },
  imgBtnText: { color: "#ea580c", fontWeight: "bold" },
  pdfBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#ea580c", paddingVertical: 14, borderRadius: 12 },
  pdfBtnText: { color: "#fff", fontWeight: "bold" },
  homeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  homeBtnText: { color: "#6b7280", fontWeight: "bold" }
});

export default OrderSuccess;