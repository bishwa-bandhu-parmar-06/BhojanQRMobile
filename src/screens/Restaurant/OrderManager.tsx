import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  Modal,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  ShoppingBag,
  IndianRupee,
  XCircle,
  Layers,
  ChevronRight,
  List,
  LayoutGrid,
} from "lucide-react-native";

import { getRestaurantOrders, updateOrderStatus } from "../../API/orderApi";
import { ALL_ORDER_STATUSES, ORDER_STATUS_FLOW } from "../../constants/orderStatus";
import CustomModal from "../../components/CustomModal";
import { SkeletonBlock } from "../../components/Skeleton";
import { socket } from "../../utils/socket";

// The order cards carry no margin of their own - they used to sit in a View
// with `gap: 16`, which FlatList rows do not inherit. Declared at module scope
// so it is a stable component type rather than a new one each render.
const OrderSeparator = () => <View style={styles.listSeparator} />;

const OrderManager = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const handlePullRefresh = async () => {
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

  // Each filter carries its status's own colour from the shared constant, so
  // the selected pill reads as that status rather than every filter looking
  // identically orange - "Cancelled" selected should not look like "Ready".
  const filterTabs = [
    { id: "all", label: "All", count: orders.length, color: "#ea580c" },
    ...ALL_ORDER_STATUSES.map(({ value, label, color }) => ({
      id: value,
      label,
      color,
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

  useEffect(() => {
    if (!activeSession) return;
    const sessionKey = activeSession.orders[0]?.tableSessionId || activeSession.orders[0]?._id;
    const refreshedGroup = orders.filter(
      (o) => (o.tableSessionId || o._id) === sessionKey,
    );
    if (refreshedGroup.length > 0) {
      setActiveSession((prev) => (prev ? { ...prev, orders: refreshedGroup } : prev));
    }
    // Intentionally keyed on `orders` alone: adding activeSession would
    // re-run this on the very state it sets, looping.
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

      {/* The Refresh button lived here. It is now an icon in the app header,
          shared by every data tab, so this screen no longer carries its own.
          The list also refreshes on its own: a 30s poll plus a live socket
          listener, both above. */}

      {/* Controls are hidden entirely until there is at least one order.
          Filtering and switching layout on an empty list is busywork, and the
          empty state reads far better with the whole screen to itself. Keyed
          on the unfiltered count, not the visible one - otherwise selecting a
          filter with no matches would hide the very pills you need to get
          back out of it. */}
      {orders.length > 0 && (
        <View style={styles.controlsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveFilter(tab.id)}
              activeOpacity={0.75}
              style={[
                styles.filterPill,
                isActive && { backgroundColor: tab.color, borderColor: tab.color },
              ]}
            >
              {/* A small dot in the status colour keeps each filter
                  identifiable while unselected, where the pill itself is
                  neutral. Hidden on the selected one - the pill has taken
                  that colour, so the dot would just be a smudge on it. */}
              {!isActive && <View style={[styles.filterDot, { backgroundColor: tab.color }]} />}
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                  <Text
                    style={[
                      styles.filterCountText,
                      isActive && { color: tab.color },
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
          </ScrollView>

          {/* Layout toggle. Grid drops the list to two columns - useful for
              scanning many tables at a glance; list keeps the full-width
              cards where every line item is readable. */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              onPress={() => setViewMode("list")}
              style={[styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive]}
              accessibilityRole="button"
              accessibilityLabel="List view"
            >
              <List size={16} color={viewMode === "list" ? "#ea580c" : "#9ca3af"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode("grid")}
              style={[styles.viewToggleBtn, viewMode === "grid" && styles.viewToggleBtnActive]}
              accessibilityRole="button"
              accessibilityLabel="Grid view"
            >
              <LayoutGrid size={16} color={viewMode === "grid" ? "#ea580c" : "#9ca3af"} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* A FlatList rather than a mapped ScrollView, so rows are virtualized -
          only what is near the viewport is mounted. That is what makes this
          scroll smoothly once a busy service has hundreds of orders, where
          the old version built every card up front on every re-render (and
          this list re-renders on every socket event). */}
      <FlatList
        // numColumns cannot change on a live FlatList - React Native throws
        // "Changing numColumns on the fly is not supported". Keying on the
        // mode forces a fresh list instead, which is the documented approach.
        key={viewMode}
        numColumns={viewMode === "grid" ? 2 : 1}
        columnWrapperStyle={viewMode === "grid" ? styles.gridColumn : undefined}
        data={groupedVisibleOrders}
        keyExtractor={(group: any[]) => group[0]?.tableSessionId || group[0]?._id}
        renderItem={({ item: tableOrders, index }: { item: any[]; index: number }) => (
          // In grid mode each cell must be allowed to shrink to half the row,
          // otherwise the cards keep their intrinsic width and overflow.
          <View style={viewMode === "grid" ? styles.gridCell : undefined}>
            {tableOrders.length === 1
              ? renderOrderCard(tableOrders[0])
              : renderSessionGroupCard(tableOrders, index)}
          </View>
        )}
        style={styles.list}
        // flexGrow so the empty state can claim the full height and centre
        // itself in it; without it the container collapses to the content.
        contentContainerStyle={[
          styles.listContent,
          groupedVisibleOrders.length === 0 && styles.listContentEmpty,
        ]}
        ItemSeparatorComponent={OrderSeparator}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // Pull-to-refresh lives here now. This panel is rendered outside the
        // dashboard's ScrollView (a FlatList cannot be nested in one), so it
        // has to bring its own.
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullRefresh}
            colors={["#ea580c"]}
            tintColor="#ea580c"
          />
        }
        // Render a screenful up front and extend as the user scrolls, rather
        // than committing the whole list on mount.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={11}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconRing}>
              <View style={styles.emptyIconCircle}>
                <ShoppingBag size={30} color="#ea580c" />
              </View>
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === "all" ? "No orders yet" : "Nothing in this stage"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === "all"
                ? "New orders appear here the moment a customer checks out from a table QR."
                : `No orders are currently marked ${activeFilter}.`}
            </Text>
            {activeFilter !== "all" && (
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => setActiveFilter("all")}
                activeOpacity={0.75}
              >
                <Text style={styles.emptyActionText}>View all orders</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

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

  // flexGrow 0 stops the row taking leftover vertical space in the column,
  // and alignItems center stops the pills being stretched to that height -
  // which, against borderRadius 100, is what turned them into tall ovals.
  // The pills scroll horizontally and the toggle is pinned beside them, so
  // the toggle stays reachable however many statuses exist.
  controlsRow: { flexDirection: "row", alignItems: "center" },
  filterScroll: { flexGrow: 0, flexShrink: 1 },
  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 16,
    paddingLeft: 4,
  },
  viewToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  viewToggleBtnActive: { backgroundColor: "#ffedd5" },
  gridColumn: { gap: 12 },
  gridCell: { flex: 1 },
  filterRow: {
    alignItems: "center",
    paddingHorizontal: 16,
    // Breathing room under the app header - the row was butting straight up
    // against it, which read as one crowded block rather than two bands.
    paddingTop: 14,
    paddingBottom: 14,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterPillText: { fontSize: 13, fontWeight: "700", color: "#4b5563" },
  filterPillTextActive: { color: "#fff" },
  filterCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountActive: { backgroundColor: "rgba(255,255,255,0.9)" },
  filterCountText: { fontSize: 11, fontWeight: "800", color: "#6b7280" },

  list: { flex: 1 },
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  // Applied only while the list is empty, so ListEmptyComponent's flex:1 has
  // a full-height container to centre itself within.
  listContentEmpty: { flexGrow: 1, paddingBottom: 0 },
  listSeparator: { height: 16 },
  // No card: the message sits directly on the page background and fills the
  // remaining height so it centres in the empty space rather than hugging the
  // top of a box.
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  // Two concentric circles - a pale halo around a tinted disc - so the icon
  // reads as a deliberate empty-state illustration rather than a lost glyph
  // floating in white space.
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
  emptyAction: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  emptyActionText: { fontSize: 13, fontWeight: "800", color: "#ea580c" },
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
