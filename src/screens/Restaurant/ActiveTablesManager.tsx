import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  StyleSheet,
  Modal,
} from "react-native";
import Toast from "react-native-toast-message";
import { Clock, ChefHat, CheckCircle, Receipt, X, LayoutGrid, User } from "lucide-react-native";

import {
  getActiveSessionsList,
  getTableMasterBill,
  closeTableSession,
  updateOrderStatus,
} from "../../API/orderApi";
import { ORDER_STATUS_FLOW, isActiveOrderStatus, getStatusMeta } from "../../constants/orderStatus";
import BhojanQRLoader from "../../components/BhojanQRLoader";
import CustomModal from "../../components/CustomModal";
import { SkeletonBlock } from "../../components/Skeleton";
import SectionError from "../../components/SectionError";
import { socket } from "../../utils/socket";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  note?: string;
}
interface SessionOrder {
  _id: string;
  customerName: string;
  status: string;
  items: OrderItem[];
  totalPrice: number;
  paymentStatus: string;
}
interface Session {
  _id: string;
  tableNumber: number | string;
  orders: SessionOrder[];
}
interface MasterBill {
  sessionId: string;
  tableNumber: number | string;
  totalBillAmount: number;
  mergedItems: { name: string; price: number; quantity: number; subTotal: number }[];
}

const ActiveTablesManager = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  // Pull-to-refresh is owned here: this panel renders outside the dashboard's
  // ScrollView (a FlatList cannot be nested in one), so it brings its own.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | number | null>(null);
  const [bill, setBill] = useState<MasterBill | null>(null);
  const [fetchingBill, setFetchingBill] = useState(false);
  const [closeTarget, setCloseTarget] = useState<string | null>(null);

  const statusQueueRef = useRef<Record<string, Promise<any>>>({});

  const fetchSessions = async () => {
    try {
      const res = await getActiveSessionsList();
      if (res.data.success) {
        setSessions(res.data.data || []);
        setLoadError(false);
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to load active tables" });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, []);

  // The server auto-joins this owner/staff socket to its restaurant's room
  // on connect (see server.js) - no explicit "join" emit needed here. Any
  // new order or status change (from this device, the website, or any
  // other device) fans out as "order:status-changed", so the grid (and an
  // already-open bill modal) updates immediately instead of waiting up to
  // 15s for the next poll.
  useEffect(() => {
    const handleLiveUpdate = () => {
      fetchSessions();
      if (selectedTable != null) openTable(selectedTable);
    };
    socket.on("order:status-changed", handleLiveUpdate);
    return () => {
      socket.off("order:status-changed", handleLiveUpdate);
    };
  }, [selectedTable]);

  const openTable = async (tableNumber: number | string) => {
    setSelectedTable(tableNumber);
    setFetchingBill(true);
    try {
      const res = await getTableMasterBill(tableNumber);
      if (res.data.success) {
        setBill(res.data.data);
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to load table bill" });
    } finally {
      setFetchingBill(false);
    }
  };

  const closeModal = () => {
    setSelectedTable(null);
    setBill(null);
  };

  const performStatusChange = async (orderId: string, newStatus: string) => {
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        orders: s.orders.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)),
      })),
    );
    try {
      const res = await updateOrderStatus(orderId, { status: newStatus });
      if (res.data.success) {
        Toast.show({ type: "success", text1: `Order marked as ${newStatus}` });
        fetchSessions();
        if (selectedTable != null) openTable(selectedTable);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to update order status";
      Toast.show({ type: "error", text1: msg });
      fetchSessions();
    }
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    const previous = statusQueueRef.current[orderId] || Promise.resolve();
    const queued = previous.then(() => performStatusChange(orderId, newStatus));
    statusQueueRef.current[orderId] = queued.catch(() => null);
    return queued;
  };

  const confirmClose = async () => {
    if (!closeTarget) return;
    try {
      const res = await closeTableSession({ sessionId: closeTarget });
      if (res.data.success) {
        Toast.show({ type: "success", text1: "Table settled and marked completed" });
        closeModal();
        fetchSessions();
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to close table session" });
    } finally {
      setCloseTarget(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <SkeletonBlock width="50%" height={28} borderRadius={6} />
          <SkeletonBlock width="70%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
        <View style={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.tableCard, { gap: 8 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <SkeletonBlock width={40} height={40} borderRadius={12} />
                <SkeletonBlock width={44} height={20} borderRadius={100} />
              </View>
              <SkeletonBlock width="60%" height={14} borderRadius={6} />
              <SkeletonBlock width="40%" height={10} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  const activeOrdersFor = (s: Session) => (s.orders || []).filter((o) => o && isActiveOrderStatus(o.status));

  return (
    <View style={styles.container}>
      {loadError && sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <SectionError message="Failed to load active tables." onRetry={fetchSessions} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconRing}>
            <View style={styles.emptyIconCircle}>
              <LayoutGrid size={30} color="#ea580c" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No tables occupied</Text>
          <Text style={styles.emptySubtitle}>
            A table appears here as soon as someone orders from its QR code, and stays
            until you close the bill.
          </Text>
        </View>
      ) : (
        /* Virtualized, like the orders list - a busy venue can have a lot of
           live tables, and the mapped ScrollView built every card up front on
           every socket-driven re-render. */
        <FlatList
          data={sessions}
          keyExtractor={(session) => session._id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={async () => {
                setIsRefreshing(true);
                await fetchSessions();
                setIsRefreshing(false);
              }}
              colors={["#ea580c"]}
              tintColor="#ea580c"
            />
          }
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={11}
          removeClippedSubviews
          renderItem={({ item: session }) => {
            const orders = session.orders || [];
            const activeCount = activeOrdersFor(session).length;
            const preparingCount = orders.filter((o) => o && o.status === "Preparing").length;
            const completedCount = orders.filter((o) => o && o.status === "Completed").length;
            return (
              <TouchableOpacity
                style={styles.tableCard}
                onPress={() => openTable(session.tableNumber)}
                activeOpacity={0.85}
              >
                <View style={styles.tableCardHeader}>
                  <View style={styles.tableNumberBadge}>
                    <Text style={styles.tableNumberText}>{session.tableNumber}</Text>
                  </View>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live</Text>
                  </View>
                </View>
                <Text style={styles.tableLabel}>Table {session.tableNumber}</Text>
                <Text style={styles.orderCountLabel}>{orders.length} order batch{orders.length === 1 ? "" : "es"}</Text>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Clock size={13} color="#d97706" />
                    <Text style={styles.statValue}>{activeCount}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                  </View>
                  <View style={styles.statItem}>
                    <ChefHat size={13} color="#2563eb" />
                    <Text style={styles.statValue}>{preparingCount}</Text>
                    <Text style={styles.statLabel}>Cooking</Text>
                  </View>
                  <View style={styles.statItem}>
                    <CheckCircle size={13} color="#16a34a" />
                    <Text style={styles.statValue}>{completedCount}</Text>
                    <Text style={styles.statLabel}>Served</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* TABLE DETAIL MODAL */}
      <Modal visible={selectedTable != null} animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Table {selectedTable}</Text>
              <Text style={styles.modalSubtitle}>Operational session & billing</Text>
            </View>
            <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {fetchingBill ? (
            <View style={styles.loaderContainer}>
              <BhojanQRLoader fullScreen={false} message="Loading bill..." />
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
              {/* Orders */}
              <Text style={styles.modalSectionLabel}>ACTIVE BATCHES</Text>
              {sessions
                .find((s) => String(s.tableNumber) === String(selectedTable))
                ?.orders.map((order) => (
                  <View
                    key={order._id}
                    style={[styles.orderCard, order.status === "Cancelled" && styles.orderCardCancelled]}
                  >
                    <View style={styles.orderCardHeader}>
                      <View style={styles.orderCardHeaderLeft}>
                        <User size={13} color="#ea580c" />
                        <Text style={styles.orderCustomer}>{order.customerName || "Guest"}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: `${getStatusMeta(order.status).color}1A` }]}>
                        <Text style={[styles.statusPillText, { color: getStatusMeta(order.status).color }]}>
                          {order.status || "Order Received"}
                        </Text>
                      </View>
                    </View>
                    {order.items?.map((it, idx) => (
                      <View key={idx} style={styles.orderItemRow}>
                        <Text style={styles.orderItemText}>
                          <Text style={styles.orderItemQty}>{it.quantity}x</Text> {it.name}
                        </Text>
                        <Text style={styles.orderItemPrice}>₹{it.price * it.quantity}</Text>
                      </View>
                    ))}
                    {order.status !== "Cancelled" && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.orderActionsScroll}>
                        {ORDER_STATUS_FLOW.map(({ value, label, Icon, color }) => {
                          const isCurrent = order.status === value;
                          return (
                            <TouchableOpacity
                              key={value}
                              onPress={() => handleStatusChange(order._id, value)}
                              style={[
                                styles.orderActionBtn,
                                isCurrent ? { backgroundColor: `${color}1A`, borderColor: color } : styles.orderActionBtnInactive,
                              ]}
                            >
                              <Icon size={12} color={isCurrent ? color : "#6b7280"} />
                              <Text style={[styles.orderActionText, { color: isCurrent ? color : "#6b7280" }]}>{label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                ))}

              {/* Consolidated Bill */}
              <Text style={[styles.modalSectionLabel, { marginTop: 8 }]}>
                <Receipt size={12} color="#9ca3af" /> CONSOLIDATED STATEMENT
              </Text>
              <View style={styles.billCard}>
                {bill?.mergedItems?.length ? (
                  bill.mergedItems.map((item, idx) => (
                    <View key={idx} style={styles.billRow}>
                      <View>
                        <Text style={styles.billItemName}>{item.name}</Text>
                        <Text style={styles.billItemQty}>{item.quantity} servings</Text>
                      </View>
                      <Text style={styles.billItemAmount}>₹{item.subTotal}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.billEmptyText}>No billable items yet.</Text>
                )}
              </View>

              <View style={styles.settleBox}>
                <View style={styles.settleRow}>
                  <Text style={styles.settleLabel}>Total Amount</Text>
                  <Text style={styles.settleAmount}>₹{bill?.totalBillAmount ?? 0}</Text>
                </View>
                <TouchableOpacity
                  style={styles.settleBtn}
                  onPress={() => bill && setCloseTarget(bill.sessionId)}
                >
                  <Text style={styles.settleBtnText}>Clear Table & Complete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      <CustomModal
        visible={!!closeTarget}
        type="success"
        title="Settle this table?"
        message="All orders on this table will be marked Completed and the session will close. This cannot be undone."
        confirmText="Yes, Settle Table"
        cancelText="Cancel"
        onConfirm={confirmClose}
        onCancel={() => setCloseTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb", gap: 10 },
  loaderText: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", fontWeight: "500", marginTop: 4 },
  // No card: the message sits on the page background and fills the remaining
  // height so it centres in the empty space rather than hugging the top of a
  // box. Matches the orders list's empty state.
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },

  grid: { padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tableCard: { width: "47%", backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", padding: 14, gap: 4 },
  tableCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  tableNumberBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center" },
  tableNumberText: { fontSize: 16, fontWeight: "900", color: "#ea580c" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f0fdf4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#16a34a" },
  liveText: { fontSize: 9, fontWeight: "800", color: "#16a34a" },
  tableLabel: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  orderCountLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 8 },
  statRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 8 },
  statItem: { alignItems: "center", gap: 2, flex: 1 },
  statValue: { fontSize: 13, fontWeight: "900", color: "#374151" },
  statLabel: { fontSize: 8, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase" },

  modalContainer: { flex: 1, backgroundColor: "#f9fafb" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 50, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1f2937" },
  modalSubtitle: { fontSize: 12, color: "#9ca3af", fontWeight: "600", marginTop: 2 },
  modalCloseBtn: { padding: 8, backgroundColor: "#f3f4f6", borderRadius: 100 },
  modalScroll: { padding: 16, paddingBottom: 40 },
  modalSectionLabel: { fontSize: 11, fontWeight: "800", color: "#9ca3af", letterSpacing: 0.5, marginBottom: 10 },

  orderCard: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 14, marginBottom: 12 },
  orderCardCancelled: { borderColor: "#fecaca", opacity: 0.7 },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderCardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderCustomer: { fontWeight: "800", color: "#1f2937", fontSize: 14 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  orderItemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  orderItemText: { fontSize: 13, color: "#4b5563", flex: 1, paddingRight: 8 },
  orderItemQty: { fontWeight: "800", color: "#374151" },
  orderItemPrice: { fontSize: 13, fontWeight: "700", color: "#374151" },
  orderActionsScroll: { marginTop: 10 },
  orderActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 2, marginRight: 6 },
  orderActionBtnInactive: { backgroundColor: "#f9fafb", borderColor: "transparent" },
  orderActionText: { fontSize: 11, fontWeight: "700" },

  billCard: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 14, marginBottom: 16 },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  billItemName: { fontWeight: "700", color: "#1f2937", fontSize: 13 },
  billItemQty: { fontSize: 11, color: "#9ca3af", fontWeight: "600", marginTop: 2 },
  billItemAmount: { fontWeight: "800", color: "#1f2937", fontSize: 14 },
  billEmptyText: { color: "#9ca3af", textAlign: "center", paddingVertical: 12, fontWeight: "600" },

  settleBox: { backgroundColor: "#fff7ed", borderRadius: 16, padding: 18 },
  settleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 },
  settleLabel: { fontSize: 12, fontWeight: "800", color: "#c2410c", textTransform: "uppercase" },
  settleAmount: { fontSize: 26, fontWeight: "900", color: "#16a34a" },
  settleBtn: { backgroundColor: "#16a34a", height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  settleBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5 },
});

export default ActiveTablesManager;
