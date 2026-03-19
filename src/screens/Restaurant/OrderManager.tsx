import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator 
} from "react-native";
import Toast from "react-native-toast-message";
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  ChefHat,
  IndianRupee,
} from "lucide-react-native";

import { getRestaurantOrders, updateOrderStatus } from "../../API/orderApi";

const OrderManager = () => {
  // FIX 1: Explicitly tell TypeScript this is an array of 'any' objects, not 'never[]'
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      const res = await getRestaurantOrders();
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (error: any) { // FIX 2: Explicitly type error
      Toast.show({ type: "error", text1: "Failed to load orders" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Optional: Set up an interval to check for new orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // FIX 3: Add explicit string types to the function parameters
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await updateOrderStatus(orderId, { status: newStatus });
      if (res.data.success) {
        Toast.show({ type: "success", text1: `Order marked as ${newStatus}` });
        // Update local state to reflect change instantly
        setOrders((prev: any[]) => // FIX 4: Type 'prev'
          prev.map((order) =>
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
      }
    } catch (error: any) { // FIX 5: Explicitly type error
      Toast.show({ type: "error", text1: "Failed to update status" });
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Live Orders</Text>
          <Text style={styles.subtitle}>
            Manage incoming orders from your tables.
          </Text>
        </View>
        <TouchableOpacity
          onPress={fetchOrders}
          style={styles.refreshBtn}
        >
          <Text style={styles.refreshBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Orders Content */}
      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <ShoppingBag size={64} color="#d1d5db" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptySubtitle}>
            When customers order via QR, they will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {orders.map((order) => (
            <View key={order._id} style={styles.card}>
              
              {/* Order Header */}
              <View style={styles.cardHeader}>
                <View>
                  <View style={styles.tableBadge}>
                    <Text style={styles.tableBadgeText}>
                      Table {order.tableNumber}
                    </Text>
                  </View>
                  <Text style={styles.customerName}>{order.customerName}</Text>
                </View>
                <View style={styles.headerRight}>
                  <Text style={styles.timeText}>
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <Text
                    style={[
                      styles.paymentStatusText,
                      order.paymentStatus === "Paid"
                        ? styles.textGreen
                        : styles.textAmber,
                    ]}
                  >
                    {order.paymentStatus === "Paid" ? "✅ Paid" : "⏳ Pending"}
                  </Text>
                </View>
              </View>

              {/* Order Items */}
              <View style={styles.cardBody}>
                {order.items.map((item: any, idx: number) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemQty}>{item.quantity}x</Text>
                      <Text style={styles.itemName}>{item.name}</Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      ₹{item.price * item.quantity}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Order Footer & Actions */}
              <View style={styles.cardFooter}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <View style={styles.totalValueContainer}>
                    <IndianRupee size={18} color="#15803d" />
                    <Text style={styles.totalAmount}>{order.totalPrice}</Text>
                  </View>
                </View>

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    onPress={() => handleStatusChange(order._id, "Pending")}
                    style={[
                      styles.actionBtn,
                      order.status === "Pending" ? styles.btnPendingActive : styles.btnInactive,
                    ]}
                  >
                    <Clock size={16} color={order.status === "Pending" ? "#b45309" : "#6b7280"} />
                    <Text style={[styles.btnText, order.status === "Pending" ? { color: "#b45309" } : { color: "#6b7280" }]}>
                      Pending
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleStatusChange(order._id, "Preparing")}
                    style={[
                      styles.actionBtn,
                      order.status === "Preparing" ? styles.btnPrepActive : styles.btnInactive,
                    ]}
                  >
                    <ChefHat size={16} color={order.status === "Preparing" ? "#1d4ed8" : "#6b7280"} />
                    <Text style={[styles.btnText, order.status === "Preparing" ? { color: "#1d4ed8" } : { color: "#6b7280" }]}>
                      Preparing
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleStatusChange(order._id, "Completed")}
                    style={[
                      styles.actionBtn,
                      order.status === "Completed" ? styles.btnDoneActive : styles.btnInactive,
                    ]}
                  >
                    <CheckCircle size={16} color={order.status === "Completed" ? "#15803d" : "#6b7280"} />
                    <Text style={[styles.btnText, order.status === "Completed" ? { color: "#15803d" } : { color: "#6b7280" }]}>
                      Completed
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 4,
  },
  refreshBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ea580c", // text-orange-600
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#374151",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableBadge: {
    backgroundColor: "#ffedd5",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  tableBadgeText: {
    color: "#c2410c",
    fontSize: 12,
    fontWeight: "bold",
  },
  customerName: {
    fontWeight: "bold",
    color: "#1f2937",
    fontSize: 16,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  timeText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
  textGreen: {
    color: "#16a34a",
  },
  textAmber: {
    color: "#d97706",
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemInfo: {
    flexDirection: "row",
    flex: 1,
    paddingRight: 12,
  },
  itemQty: {
    fontWeight: "bold",
    color: "#374151",
    marginRight: 8,
    fontSize: 14,
  },
  itemName: {
    color: "#4b5563",
    fontSize: 14,
    flexShrink: 1,
  },
  itemPrice: {
    color: "#6b7280",
    fontSize: 14,
  },
  cardFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6b7280",
  },
  totalValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: "#15803d",
    marginLeft: 2,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    gap: 4,
  },
  btnText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  btnInactive: {
    backgroundColor: "#f9fafb",
    borderColor: "transparent",
  },
  btnPendingActive: {
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
  },
  btnPrepActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#bfdbfe",
  },
  btnDoneActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#bbf7d0",
  },
});

export default OrderManager;