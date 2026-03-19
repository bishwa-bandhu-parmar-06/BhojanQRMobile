import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  Package,
  Clock,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  User,
  Search,
  Coffee,
  Timer,
  Utensils,
  ChefHat,
} from "lucide-react-native";

// Adjust path based on your folder structure
import { getOrderByToken } from "../API/orderApi"; 

const TrackOrder = () => {
  const navigation = useNavigation<any>();
  const [token, setToken] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!token.trim()) {
      Toast.show({ type: "error", text1: "Please enter a valid Order Token." });
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const res = await getOrderByToken(token);
      const orderData = res.data?.data || res.data;
      setOrder(orderData);
      Toast.show({ type: "success", text1: "Status updated!" });
    } catch (err: any) {
      console.error("Tracking Error:", err);
      const errorMsg = err.response?.data?.message || "Order not found. Check your token.";
      Toast.show({ type: "error", text1: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "#10b981"; // Emerald 500
      case "Preparing": return "#f97316"; // Orange 500
      case "Processing": return "#f59e0b"; // Amber 500
      default: return "#94a3b8"; // Slate 400
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle size={24} color={getStatusColor(status)} />;
      case "Preparing": return <ChefHat size={24} color={getStatusColor(status)} />;
      case "Processing": return <Timer size={24} color={getStatusColor(status)} />;
      default: return <Clock size={24} color={getStatusColor(status)} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#64748b" />
          <Text style={styles.backBtnText}>BACK</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Package size={32} color="#ea580c" />
          </View>
          <Text style={styles.title}>Track Your Order</Text>
          <Text style={styles.subtitle}>Enter your payment ID to see real-time updates</Text>
        </View>

        {/* Search Card */}
        <View style={styles.searchCard}>
          <View style={styles.inputWrapper}>
            <Search size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="e.g., pay_ORD1234567"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.searchBtn, isLoading && styles.searchBtnDisabled]} 
            onPress={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.searchBtnText}>Track Order</Text>
                <ChevronRight size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Order Results */}
        {order ? (
          <View style={styles.resultsWrapper}>
            
            {/* Status Timeline Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Timer size={20} color="#ea580c" />
                <Text style={styles.cardTitle}>Order Status</Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Current Status:</Text>
                <View style={styles.statusBadgeRow}>
                  {getStatusIcon(order.status)}
                  <Text style={[styles.statusValue, { color: getStatusColor(order.status) }]}>
                    {order.status}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressWrapper}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressText}>
                    {order.status === "Completed" ? "Delivered" : "In Progress"}
                  </Text>
                  <Text style={styles.progressText}>
                    {order.status === "Completed" ? "100%" : "50%"}
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: order.status === "Completed" ? '100%' : '50%' }
                    ]} 
                  />
                </View>
              </View>

              <View style={styles.messageBox}>
                <Text style={styles.messageText}>
                  {order.status === "Completed" 
                    ? "✅ Your order has been delivered! Enjoy your meal!" 
                    : "🕐 Your order is being prepared. We'll notify you when it's ready."}
                </Text>
              </View>
            </View>

            {/* Order Details Card */}
            <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
              {/* Card Header */}
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleRow}>
                  <View style={styles.summaryIconBox}>
                    <Utensils size={18} color="#ea580c" />
                  </View>
                  <View>
                    <Text style={styles.summaryTitleText}>Order Summary</Text>
                    <Text style={styles.tableText}>Table #{order.tableNumber}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.tableText}>Order Total</Text>
                  <Text style={styles.totalText}>₹{order.totalPrice}</Text>
                </View>
              </View>

              {/* Items List */}
              <View style={styles.itemsList}>
                {order.items?.map((item: any, idx: number) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemIndex}>{idx + 1}.</Text>
                      <View>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                      </View>
                    </View>
                    <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View style={styles.summaryFooter}>
                <View style={styles.footerRow}>
                  <User size={16} color="#ea580c" />
                  <Text style={styles.footerText}>{order.customerName}</Text>
                </View>
                <View style={styles.footerRow}>
                  <CheckCircle size={16} color="#10b981" />
                  <Text style={styles.footerText}>Payment Confirmed</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate("Home")}>
                <Text style={styles.secondaryBtnText}>Order More</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.primaryBtn} 
                onPress={() => {
                  setOrder(null);
                  setToken("");
                }}
              >
                <Text style={styles.primaryBtnText}>Track Another</Text>
              </TouchableOpacity>
            </View>

          </View>
        ) : (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Coffee size={32} color="#ea580c" />
            </View>
            <Text style={styles.emptyTitle}>No Order to Track</Text>
            <Text style={styles.emptySubtitle}>Enter your payment token above to see your order status</Text>
            <View style={styles.exampleRow}>
              <Search size={14} color="#94a3b8" />
              <Text style={styles.exampleText}>Example: pay_O9k1...</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" }, // Slate 50
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  backBtn: { flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 6 },
  backBtnText: { color: "#64748b", fontWeight: "700", fontSize: 12, letterSpacing: 1 },
  
  header: { alignItems: "center", marginBottom: 32 },
  iconWrapper: { backgroundColor: "#ffedd5", padding: 16, borderRadius: 20, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "900", color: "#1e293b", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#64748b", textAlign: "center" },

  searchCard: { backgroundColor: "#fff", padding: 16, borderRadius: 20, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 32 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, height: 50, fontSize: 16, color: "#334155" },
  searchBtn: { backgroundColor: "#ea580c", flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 12, gap: 8 },
  searchBtnDisabled: { opacity: 0.7 },
  searchBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  resultsWrapper: { gap: 20 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  statusLabel: { fontSize: 14, fontWeight: "600", color: "#475569" },
  statusBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusValue: { fontSize: 16, fontWeight: "bold" },

  progressWrapper: { marginBottom: 16 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  progressBarBg: { height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#ea580c", borderRadius: 4 },

  messageBox: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 12 },
  messageText: { fontSize: 13, color: "#475569", lineHeight: 20 },

  summaryHeader: { flexDirection: "row", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderColor: "#f1f5f9" },
  summaryTitleRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  summaryIconBox: { backgroundColor: "#ffedd5", width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summaryTitleText: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  tableText: { fontSize: 12, color: "#64748b", marginTop: 2 },
  totalText: { fontSize: 20, fontWeight: "900", color: "#1e293b" },

  itemsList: { padding: 20, gap: 16 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemLeft: { flexDirection: "row", gap: 12, alignItems: "center" },
  itemIndex: { fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: "#94a3b8", width: 24 },
  itemName: { fontSize: 15, fontWeight: "600", color: "#334155" },
  itemQty: { fontSize: 12, color: "#64748b", marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: "bold", color: "#475569" },

  summaryFooter: { backgroundColor: "#f8fafc", padding: 16, flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerText: { fontSize: 13, color: "#475569", fontWeight: "500" },

  actionBtnRow: { flexDirection: "row", gap: 12 },
  secondaryBtn: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { color: "#475569", fontWeight: "bold", fontSize: 15 },
  primaryBtn: { flex: 1, backgroundColor: "#ea580c", height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  emptyState: { alignItems: "center", backgroundColor: "#fff", padding: 40, borderRadius: 24, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#ffedd5", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 24, paddingHorizontal: 20 },
  exampleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  exampleText: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
});

export default TrackOrder;