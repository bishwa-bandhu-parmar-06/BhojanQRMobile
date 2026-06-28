import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
} from "react-native";
import Toast from "react-native-toast-message";
import { ShoppingBag, IndianRupee, RefreshCw, XCircle, Layers, ChevronRight } from "lucide-react-native";

import { getRestaurantOrders, updateOrderStatus } from "../../API/orderApi";
import { ALL_ORDER_STATUSES, ORDER_STATUS_FLOW } from "../../constants/orderStatus";
import CustomModal from "../../components/CustomModal";
import { SkeletonBlock } from "../../components/Skeleton";
import { socket } from "../../utils/socket";

const OrderManager = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [activeSession, setActiveSession] = useState<{ tableNumber: any; orders: any[] } | null>(null);

  // Clicking through multiple stages quickly fires independent requests with
  // no ordering guarantee - queueing per-order keeps them landing in click
  // order instead of letting a later click's response race ahead of an
  // earlier one and silently get reverted by the server's stale-update guard.
  const orderUpdateQueueRef = useRef<Record<string, Promise<any>>>({});

  const fetchOrders = async () => {
    try {
      const res = await getRestaurantOrders();
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to load orders" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // The server auto-joins this owner/staff socket to its restaurant's room
  // on connect (see server.js) - no explicit "join" emit needed here. New
  // orders and any status change (from this device, the website, or any
  // other device) all fan out as the same "order:status-changed" event, so
  // a single listener keeps this list live without waiting on the 30s poll.
  useEffect(() => {
    const handleLiveUpdate = () => fetchOrders();
    socket.on("order:status-changed", handleLiveUpdate);
    return () => {
      socket.off("order:status-changed", handleLiveUpdate);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  };

  const performStatusChange = async (orderId: string, newStatus: string, cancellationReason?: string) => {
    setOrders((prev: any[]) =>
      prev.map((order) => (order._id === orderId ? { ...order, status: newStatus } : order)),
    );
    try {
      const res = await updateOrderStatus(orderId, {
        status: newStatus,
        ...(cancellationReason ? { cancellationReason } : {}),
      });
      if (res.data.success) {
        Toast.show({ type: "success", text1: `Order marked as ${newStatus}` });
      }
    } catch (error: any) {
      const backendError = error.response?.data?.error || error.response?.data?.message;
      Toast.show({ type: "error", text1: "Failed to update status", text2: backendError });
      fetchOrders(); // revert to server truth
    }
  };

  const handleStatusChange = (orderId: string, newStatus: string, cancellationReason?: string) => {
    const previous = orderUpdateQueueRef.current[orderId] || Promise.resolve();
    const queued = previous.then(() => performStatusChange(orderId, newStatus, cancellationReason));
    orderUpdateQueueRef.current[orderId] = queued.catch(() => null);
    return queued;
  };

  const requestCancel = (orderId: string) => {
    setCancelTarget(orderId);
    setCancelReason("");
  };

  const confirmCancel = () => {
    if (cancelTarget) {
      handleStatusChange(cancelTarget, "Cancelled", cancelReason.trim() || undefined);
    }
    setCancelTarget(null);
    setCancelReason("");
  };

  // One bucket per status in the 7-state lifecycle, generated from the
  // shared constant - mirrors the website's OrderManager.jsx segmentation.
  const segmentedOrders = useMemo(() => {
    const buckets: Record<string, any[]> = { all: orders };
    ALL_ORDER_STATUSES.forEach(({ value }) => {
      buckets[value] = orders.filter((o) => o.status === value);
    });
    return buckets;
  }, [orders]);

  const filterTabs = [
    { id: "all", label: "All", count: orders.length },
    ...ALL_ORDER_STATUSES.map(({ value, label }) => ({
      id: value,
      label,
      count: segmentedOrders[value]?.length || 0,
    })),
  ];

  const visibleOrders = useMemo(
    () => segmentedOrders[activeFilter] || [],
    [segmentedOrders, activeFilter],
  );

  // Customers can place multiple separate orders during one dining visit
  // (e.g. starters, then mains) - the backend tags every order from the same
  // table-scan visit with the same tableSessionId. Group on that so repeat
  // orders from one table show up as a single "Combined QR Session" card
  // instead of as unrelated, disconnected orders - mirrors the website's
  // OrderList.jsx grouping exactly.
  const groupedVisibleOrders = useMemo(() => {
    const map: Record<string, any[]> = {};
    visibleOrders.forEach((order) => {
      const key = order.tableSessionId || order._id;
      if (!map[key]) map[key] = [];
      map[key].push(order);
    });
    return Object.values(map);
  }, [visibleOrders]);

  // When the "Review All Batches" modal is open, keep its order list synced
  // with live status changes the same way the website's OrderList.jsx does -
  // otherwise tapping a status button inside the modal wouldn't visibly
  // update until the modal was closed and reopened.
  useEffect(() => {
    if (!activeSession) return;
    const sessionKey = activeSession.orders[0]?.tableSessionId || activeSession.orders[0]?._id;
    const refreshedGroup = orders.filter(
      (o) => (o.tableSessionId || o._id) === sessionKey,
    );
    if (refreshedGroup.length > 0) {
      setActiveSession((prev) => (prev ? { ...prev, orders: refreshedGroup } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const renderOrderCard = (order: any) => (
    <View key={order._id} style={styles.card}>
      {/* Order Header */}
      <View style={styles.cardHeader}>
        <View>
          <View style={styles.tableBadge}>
            <Text style={styles.tableBadgeText}>Table {order.tableNumber}</Text>
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
              order.paymentStatus === "Paid" ? styles.textGreen : styles.textAmber,
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
            <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.actionButtonsRow}
        >
          {ORDER_STATUS_FLOW.map(({ value, label, Icon, color }) => {
            const isCurrent = order.status === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => handleStatusChange(order._id, value)}
                style={[styles.actionBtn, isCurrent ? { backgroundColor: `${color}1A`, borderColor: color } : styles.btnInactive]}
              >
                <Icon size={14} color={isCurrent ? color : "#6b7280"} />
                <Text style={[styles.btnText, { color: isCurrent ? color : "#6b7280" }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
          {order.status !== "Cancelled" && order.status !== "Completed" && (
            <TouchableOpacity
              onPress={() => requestCancel(order._id)}
              style={[styles.actionBtn, styles.btnCancel]}
            >
              <XCircle size={14} color="#dc2626" />
              <Text style={[styles.btnText, { color: "#dc2626" }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );

  const renderSessionGroupCard = (tableOrders: any[], index: number) => {
    const displayTableNumber = tableOrders[0].tableNumber || "N/A";
    const grandTotal = tableOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const orderCount = tableOrders.length;

    return (
      <View key={`session-group-${index}`} style={styles.sessionCard}>
        <View style={styles.sessionCardHeader}>
          <View style={styles.sessionBadgeRow}>
            <View style={styles.sessionTableBadge}>
              <Text style={styles.sessionTableBadgeText}>Table {displayTableNumber}</Text>
            </View>
            <View style={styles.sessionBatchBadge}>
              <Layers size={11} color="#c2410c" />
              <Text style={styles.sessionBatchBadgeText}>{orderCount} BATCHES</Text>
            </View>
          </View>
          <Text style={styles.sessionCardTitle}>Combined QR Session</Text>
        </View>

        <View style={styles.sessionCardBody}>
          <Text style={styles.sessionCardDesc}>
            Customers at this table have placed multiple separate orders during their current visit.
            This group contains <Text style={styles.sessionCardDescBold}>{orderCount} order batches</Text>.
          </Text>
          <View style={styles.sessionTotalRow}>
            <Text style={styles.sessionTotalLabel}>Aggregate Total</Text>
            <Text style={styles.sessionTotalValue}>₹{grandTotal}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.sessionReviewBtn}
          onPress={() => setActiveSession({ tableNumber: displayTableNumber, orders: tableOrders })}
        >
          <Text style={styles.sessionReviewBtnText}>Review All Batches</Text>
          <ChevronRight size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <SkeletonBlock width="50%" height={28} borderRadius={6} />
            <SkeletonBlock width="70%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        </View>
        <View style={[styles.filterRow, { flexDirection: "row" }]}>
          <SkeletonBlock width={70} height={32} borderRadius={100} />
          <SkeletonBlock width={70} height={32} borderRadius={100} style={{ marginLeft: 8 }} />
          <SkeletonBlock width={70} height={32} borderRadius={100} style={{ marginLeft: 8 }} />
        </View>
        <View style={styles.listContent}>
          <View style={styles.grid}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <SkeletonBlock width={90} height={14} borderRadius={6} />
                  <SkeletonBlock width={60} height={12} borderRadius={6} />
                </View>
                <View style={styles.cardBody}>
                  <SkeletonBlock width="90%" height={12} borderRadius={6} />
                  <SkeletonBlock width="70%" height={12} borderRadius={6} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomModal
        visible={!!cancelTarget}
        type="error"
        title="Cancel this order?"
        message="Optionally tell the kitchen why - this helps track recurring issues."
        confirmText="Confirm Cancel"
        cancelText="Never mind"
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      >
        <TextInput
          style={styles.reasonInput}
          placeholder="Reason (optional)"
          placeholderTextColor="#9ca3af"
          value={cancelReason}
          onChangeText={setCancelReason}
        />
      </CustomModal>

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Live Orders</Text>
          <Text style={styles.subtitle}>Manage incoming orders from your tables.</Text>
        </View>
        <TouchableOpacity onPress={handleManualRefresh} disabled={isRefreshing} style={styles.refreshBtn}>
          <RefreshCw size={14} color="#ea580c" />
          <Text style={styles.refreshBtnText}>{isRefreshing ? "Refreshing…" : "Refresh"}</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.filterRow}
      >
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveFilter(tab.id)}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView keyboardShouldPersistTaps="handled" style={styles.list} contentContainerStyle={styles.listContent}>
        {visibleOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingBag size={64} color="#d1d5db" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No Orders Here</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === "all"
                ? "When customers order via QR, they will appear here."
                : `No orders are currently "${activeFilter}".`}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {groupedVisibleOrders.map((tableOrders, index) =>
              tableOrders.length === 1
                ? renderOrderCard(tableOrders[0])
                : renderSessionGroupCard(tableOrders, index),
            )}
          </View>
        )}
      </ScrollView>

      {/* REVIEW ALL BATCHES MODAL */}
      <Modal visible={!!activeSession} animationType="slide" onRequestClose={() => setActiveSession(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Table {activeSession?.tableNumber}</Text>
              <Text style={styles.modalSubtitle}>Live Session Split View - all batches from this visit</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveSession(null)} style={styles.modalCloseBtn}>
              <XCircle size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            <View style={styles.grid}>
              {activeSession?.orders.map((order) => renderOrderCard(order))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  container: { flex: 1, backgroundColor: "#f9fafb" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 16, paddingBottom: 12 },
  headerTextContainer: { flex: 1, paddingRight: 12 },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", fontWeight: "500", marginTop: 4 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#fff7ed" },
  refreshBtnText: { fontSize: 12, fontWeight: "bold", color: "#ea580c" },

  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  filterPillActive: { backgroundColor: "#ea580c", borderColor: "#ea580c" },
  filterPillText: { fontSize: 13, fontWeight: "700", color: "#4b5563" },
  filterPillTextActive: { color: "#fff" },
  filterCount: { backgroundColor: "#f3f4f6", paddingHorizontal: 6, borderRadius: 6, minWidth: 20, alignItems: "center" },
  filterCountActive: { backgroundColor: "#fff" },
  filterCountText: { fontSize: 11, fontWeight: "900", color: "#6b7280" },
  filterCountTextActive: { color: "#ea580c" },

  list: { flex: 1 },
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  emptyState: { alignItems: "center", paddingVertical: 60, backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  emptyIcon: { marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", color: "#374151" },
  emptySubtitle: { fontSize: 14, color: "#6b7280", marginTop: 8, textAlign: "center", paddingHorizontal: 24 },
  grid: { gap: 16 },
  card: { backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tableBadge: { backgroundColor: "#ffedd5", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 6 },
  tableBadgeText: { color: "#c2410c", fontSize: 12, fontWeight: "bold" },
  customerName: { fontWeight: "bold", color: "#1f2937", fontSize: 16 },
  headerRight: { alignItems: "flex-end" },
  timeText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  paymentStatusText: { fontSize: 12, fontWeight: "bold", marginTop: 4 },
  textGreen: { color: "#16a34a" },
  textAmber: { color: "#d97706" },
  cardBody: { padding: 16, gap: 12 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  itemInfo: { flexDirection: "row", flex: 1, paddingRight: 12 },
  itemQty: { fontWeight: "bold", color: "#374151", marginRight: 8, fontSize: 14 },
  itemName: { color: "#4b5563", fontSize: 14, flexShrink: 1 },
  itemPrice: { color: "#6b7280", fontSize: 14 },
  cardFooter: { padding: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6", backgroundColor: "#ffffff" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  totalLabel: { fontSize: 14, fontWeight: "bold", color: "#6b7280" },
  totalValueContainer: { flexDirection: "row", alignItems: "center" },
  totalAmount: { fontSize: 20, fontWeight: "900", color: "#15803d", marginLeft: 2 },
  actionButtonsRow: { gap: 8 },
  actionBtn: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 2, gap: 4 },
  btnText: { fontSize: 12, fontWeight: "bold" },
  btnInactive: { backgroundColor: "#f9fafb", borderColor: "transparent" },
  btnCancel: { backgroundColor: "#fef2f2", borderColor: "transparent" },
  reasonInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, backgroundColor: "#f9fafb", width: "100%", marginTop: 8 },

  // Combined QR Session group card
  sessionCard: { backgroundColor: "#fff7ed", borderRadius: 16, borderWidth: 1, borderColor: "#fed7aa", overflow: "hidden" },
  sessionCardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#ffedd5", backgroundColor: "#ffedd5" },
  sessionBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  sessionTableBadge: { backgroundColor: "#ea580c", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  sessionTableBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  sessionBatchBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fed7aa", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sessionBatchBadgeText: { color: "#c2410c", fontSize: 10, fontWeight: "900" },
  sessionCardTitle: { fontWeight: "bold", color: "#1f2937", fontSize: 15 },
  sessionCardBody: { padding: 16 },
  sessionCardDesc: { fontSize: 13, color: "#57534e", lineHeight: 19, marginBottom: 14 },
  sessionCardDescBold: { color: "#ea580c", fontWeight: "bold" },
  sessionTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#ffedd5" },
  sessionTotalLabel: { fontSize: 11, fontWeight: "bold", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  sessionTotalValue: { fontSize: 18, fontWeight: "900", color: "#16a34a" },
  sessionReviewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#ea580c", paddingVertical: 14, margin: 16, marginTop: 0, borderRadius: 12 },
  sessionReviewBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  // Review-all-batches modal
  modalContainer: { flex: 1, backgroundColor: "#f3f4f6" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, paddingTop: 50, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1f2937" },
  modalSubtitle: { fontSize: 12, color: "#9ca3af", fontWeight: "600", marginTop: 4, maxWidth: 260 },
  modalCloseBtn: { padding: 8, backgroundColor: "#f9fafb", borderRadius: 100 },
  modalContent: { padding: 16, paddingBottom: 40 },
});

export default OrderManager;
