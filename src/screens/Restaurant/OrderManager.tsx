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
import LinearGradient from "react-native-linear-gradient";
import { useSelector } from "react-redux";
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
import {
  ALL_ORDER_STATUSES,
  ORDER_STATUS_FLOW,
  getStatusMeta,
  isArchivedGroup,
  groupBySession,
  TERMINAL_ORDER_STATUSES,
  canTransitionTo,
  hasOpenUndoWindow,
} from "../../constants/orderStatus";
import { useArchiveTick } from "../../hooks/useArchiveTick";
import CustomModal from "../../components/CustomModal";
import LoadMoreButton from "../../components/LoadMoreButton";
import { SkeletonBlock } from "../../components/Skeleton";
import { socket } from "../../utils/socket";
import { formatMoney } from "../../utils/money";

// The order cards carry no margin of their own - they used to sit in a View
// with `gap: 16`, which FlatList rows do not inherit. Declared at module scope
// so it is a stable component type rather than a new one each render.
const OrderSeparator = () => <View style={styles.listSeparator} />;

// Cards rendered up front, and added per "Load more" tap.
const ORDER_PAGE_SIZE = 20;

const OrderManager = () => {
  // Mirrors orderRoutes.js. The server is the authority - this decides what is
  // worth drawing, so a member who can only watch the board is not offered
  // status buttons that answer 403.
  const user = useSelector((state: any) => state.auth?.user);
  const isOwner = user?.role === "restaurant";
  const perms: string[] = isOwner ? [] : user?.permissions || [];
  const canUpdateStatus = isOwner || perms.includes("manage_orders");
  const canCancel = isOwner || perms.includes("cancel_orders");

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

  // `fresh` is passed only by the refresh button and pull-to-refresh. The
  // 30s poll and the socket handler deliberately use the cache: making every
  // background tick bypass it would keep the database busy for no benefit.
  const fetchOrders = async (fresh = false) => {
    try {
      const res = await getRestaurantOrders(fresh);
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
    // Mounting means a tab switch or a dashboard refresh - both are someone
    // asking for current data, so this one skips the cache. The poll after it
    // does not: renewing a correct entry every 30s is the cache doing its job.
    fetchOrders(true);
    const interval = setInterval(() => fetchOrders(false), 30000);
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
    await fetchOrders(true);
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

  // A Completed order stays on this board for a grace period and then belongs
  // to Order History instead. Filtering once, here, means every bucket, count
  // and pill below inherits the rule - there is no other view of `orders`
  // that could disagree about what is still live.
  //
  // The tick only runs while something is actually waiting to be archived,
  // so an idle board during a rush is not re-rendering on a timer.
  const hasPendingArchive = useMemo(
    () => orders.some((o) => TERMINAL_ORDER_STATUSES.includes(o.status)),
    [orders],
  );
  // The same clock also drives the undo buttons, which have to stop being
  // offered the moment their 30s window closes. Without this the board would
  // keep showing a live "step back" long after the server would refuse it -
  // the exact mismatch these gates exist to remove.
  const hasUndoable = useMemo(
    () => orders.some((o) => hasOpenUndoWindow(o)),
    [orders],
  );
  const now = useArchiveTick(hasPendingArchive || hasUndoable);

  // Archiving is decided per SESSION, not per order. A table with three
  // orders keeps all three on the board until the last one is finished, so a
  // combined session never loses a batch out from under it and never shrinks
  // to a "combined" card standing in for one remaining order.
  const liveOrders = useMemo(() => {
    const groups = groupBySession(orders);
    return groups
      .filter((group) => !isArchivedGroup(group, now))
      .flat();
  }, [orders, now]);

  // One bucket per status in the 7-state lifecycle, generated from the
  // shared constant - mirrors the website's OrderManager.jsx segmentation.
  const segmentedOrders = useMemo(() => {
    const buckets: Record<string, any[]> = { all: liveOrders };
    ALL_ORDER_STATUSES.forEach(({ value }) => {
      buckets[value] = liveOrders.filter((o) => o.status === value);
    });
    return buckets;
  }, [liveOrders]);

  // Each filter carries its status's own colour from the shared constant, so
  // the selected pill reads as that status rather than every filter looking
  // identically orange - "Cancelled" selected should not look like "Ready".
  const filterTabs = [
    { id: "all", label: "All", count: liveOrders.length, color: "#ea580c" },
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

  // How many order groups are actually built. The orders endpoint is not
  // paginated - the whole working set arrives in one response - so "Load
  // more" here is a RENDER budget, not another request. It exists because
  // this list rebuilds on every socket event, and mounting three hundred
  // cards each time a single status changes is what makes a busy service
  // feel sluggish.
  const [visibleCount, setVisibleCount] = useState(ORDER_PAGE_SIZE);

  // Changing filter should start from the top again, not keep a count scrolled
  // up under a different set of rows.
  useEffect(() => {
    setVisibleCount(ORDER_PAGE_SIZE);
  }, [activeFilter]);

  // Customers can place multiple separate orders during one dining visit
  // (e.g. starters, then mains) - the backend tags every order from the same
  // table-scan visit with the same tableSessionId. Group on that so repeat
  // orders from one table show up as a single "Combined QR Session" card
  // instead of as unrelated, disconnected orders - mirrors the website's
  // OrderList.jsx grouping exactly.
  const groupedVisibleOrders = useMemo(() => {
    return groupBySession(visibleOrders);
  }, [visibleOrders]);

  // Grouping happens first so the budget counts CARDS on screen, not raw
  // orders - one table with six orders is a single card.
  const renderedOrders = useMemo(
    () => groupedVisibleOrders.slice(0, visibleCount),
    [groupedVisibleOrders, visibleCount],
  );
  const hasMoreOrders = groupedVisibleOrders.length > renderedOrders.length;

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

  // LIST: a slim row - table, customer, and the status controls as bare
  // icons. The full card belongs in grid, where the two-column layout gives
  // each order its own block; a column of full cards means two orders on
  // screen at once, which is the wrong shape for working through a queue.
  //
  // Icons carry no labels here: the six stages are a fixed, ordered sequence
  // that anyone using this screen learns in a shift, and the labels were what
  // forced the row to be tall enough to fit them.
  const renderOrderRow = (order: any) => {
    const meta = getStatusMeta(order.status);
    const itemCount = (order.items || []).reduce(
      (sum: number, it: any) => sum + (it.quantity || 0),
      0,
    );
    // Where this order sits in the linear flow - stages before it render as
    // quietly "done", the current one is filled solid, later ones stay
    // neutral. Cancelled is a side branch (-1): everything reads neutral and
    // the red accent carries the state.
    const currentIdx = ORDER_STATUS_FLOW.findIndex((st) => st.value === order.status);

    return (
      <View key={order._id} style={styles.row}>
        {/* Status as a coloured edge - the state of every row is readable
            scanning straight down the left, without reading a word. */}
        <View style={[styles.rowAccent, { backgroundColor: meta.color }]} />

        <View style={styles.rowBody}>
          {/* Opening the detail is a tap on the identity block only, NOT the
              whole row - the status icons below are inside it, and wrapping
              everything would make every stage change also open a screen. */}
          <TouchableOpacity
            style={styles.rowTop}
            activeOpacity={0.7}
            onPress={() => setActiveSession({ tableNumber: order.tableNumber, orders: [order] })}
          >
            <View style={styles.rowTableBadge}>
              <Text style={styles.rowTableBadgeText}>T{order.tableNumber}</Text>
            </View>
            <Text style={styles.rowCustomer} numberOfLines={1}>
              {order.customerName}
            </Text>
            {/* Kept despite "name and table only": an orders list with no
                money on it makes you open every row to find the one you are
                looking for. It is one small right-aligned number. */}
            <Text style={styles.rowTotal}>₹{formatMoney(order.totalPrice)}</Text>
            <ChevronRight size={15} color="#cbd5e1" />
          </TouchableOpacity>

          {/* The status used to live only in the accent colour; a named chip
              means nobody has to memorise the palette to read the board. */}
          <View style={styles.rowMetaRow}>
            <View style={[styles.statusChip, { backgroundColor: `${meta.color}14` }]}>
              <View style={[styles.statusChipDot, { backgroundColor: meta.color }]} />
              <Text style={[styles.statusChipText, { color: meta.color }]}>{order.status}</Text>
            </View>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
              {new Date(order.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Text
              style={[
                styles.rowPayment,
                order.paymentStatus === "Paid" ? styles.textGreen : styles.textAmber,
              ]}
            >
              {order.paymentStatus === "Paid" ? "Paid" : "Unpaid"}
            </Text>
          </View>

          {/* Horizontally scrollable so all six stages plus cancel stay
              reachable on a narrow phone without shrinking the targets.
              Hidden entirely without manage_orders: a row of buttons that
              all 403 is worse than a row that reads as information only. */}
          {canUpdateStatus && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.rowActionsScroll}
            contentContainerStyle={styles.rowActions}
          >
            {ORDER_STATUS_FLOW.map(({ value, label, Icon, color }, idx) => {
              const isCurrent = order.status === value;
              const isDone = currentIdx > -1 && idx < currentIdx;
              // Only what the server would actually accept. A stage the
              // server refuses is drawn faded and does not respond, instead
              // of applying optimistically and snapping back.
              const allowed = canTransitionTo(order, value, now);
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => handleStatusChange(order._id, value)}
                  disabled={!allowed}
                  style={[
                    styles.iconBtn,
                    isCurrent
                      ? { backgroundColor: color, borderColor: color }
                      : isDone
                        ? { backgroundColor: `${color}14`, borderColor: "transparent" }
                        : styles.iconBtnInactive,
                    !isCurrent && !allowed && styles.iconBtnBlocked,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ disabled: !allowed }}
                >
                  <Icon size={16} color={isCurrent ? "#ffffff" : isDone ? color : "#9ca3af"} />
                </TouchableOpacity>
              );
            })}

            {canCancel && canTransitionTo(order, "Cancelled", now) && (
                <TouchableOpacity
                  onPress={() => requestCancel(order._id)}
                  style={[styles.iconBtn, styles.iconBtnCancel]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel order"
                >
                  <XCircle size={16} color="#dc2626" />
                </TouchableOpacity>
              )}
          </ScrollView>
          )}
        </View>
      </View>
    );
  };

  // GRID: the full card, two to a row - every item and every status
  // transition. This is the detailed view now, so the item list is capped:
  // at half width an eight-dish order wrapped every name onto three lines.
  const renderOrderCard = (order: any, expanded = false) => (
    <View key={order._id} style={styles.card}>
      {/* A status-coloured edge, so the state of each row is readable while
          scanning down the left of the list without reading any text. */}
      <View
        style={[styles.cardAccent, { backgroundColor: getStatusMeta(order.status).color }]}
      />
      {/* Order Header - also the tap target for the full detail screen, so
          the whole order is reachable from a card that only shows three of
          its lines. Not wired up inside the detail screen itself, where it
          would reopen the screen you are already on. */}
      <TouchableOpacity
        style={styles.cardHeader}
        activeOpacity={expanded ? 1 : 0.7}
        disabled={expanded}
        onPress={() =>
          setActiveSession({ tableNumber: order.tableNumber, orders: [order] })
        }
      >
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
      </TouchableOpacity>

      {/* Order Items */}
      <View style={styles.cardBody}>
        {order.items.map((item: any, idx: number) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
            <Text style={styles.itemPrice}>₹{formatMoney(item.price * item.quantity)}</Text>
          </View>
        ))}
      </View>

      {/* Order Footer & Actions */}
      <View style={styles.cardFooter}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <View style={styles.totalValueContainer}>
            <IndianRupee size={18} color="#15803d" />
            <Text style={styles.totalAmount}>{formatMoney(order.totalPrice)}</Text>
          </View>
        </View>

        {canUpdateStatus && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.actionButtonsRow}
        >
          {ORDER_STATUS_FLOW.map(({ value, label, Icon, color }) => {
            const isCurrent = order.status === value;
            const allowed = canTransitionTo(order, value, now);
            return (
              <TouchableOpacity
                key={value}
                onPress={() => handleStatusChange(order._id, value)}
                disabled={!allowed}
                style={[
                  styles.actionBtn,
                  isCurrent ? { backgroundColor: `${color}1A`, borderColor: color } : styles.btnInactive,
                  !isCurrent && !allowed && styles.iconBtnBlocked,
                ]}
                accessibilityState={{ disabled: !allowed }}
              >
                <Icon size={14} color={isCurrent ? color : "#6b7280"} />
                <Text style={[styles.btnText, { color: isCurrent ? color : "#6b7280" }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
          {canCancel && canTransitionTo(order, "Cancelled", now) && (
            <TouchableOpacity
              onPress={() => requestCancel(order._id)}
              style={[styles.actionBtn, styles.btnCancel]}
            >
              <XCircle size={14} color="#dc2626" />
              <Text style={[styles.btnText, { color: "#dc2626" }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        )}
      </View>
    </View>
  );

  // A combined session is deliberately NOT another white row: it renders on
  // an orange gradient with light-on-dark type, so a table running multiple
  // batches can never be misread as one more single order while scanning.
  const renderSessionGroupCard = (tableOrders: any[], index: number, mode: "list" | "grid") => {
    const displayTableNumber = tableOrders[0].tableNumber || "N/A";
    const grandTotal = tableOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const orderCount = tableOrders.length;

    const openSession = () =>
      setActiveSession({ tableNumber: displayTableNumber, orders: tableOrders });

    const header = (
      <View style={styles.sessionTop}>
        <View style={styles.sessionIconBox}>
          <Layers size={16} color="#ffffff" />
        </View>
        <View style={styles.sessionTitleWrap}>
          <Text style={styles.sessionLabel}>Combined Session</Text>
          <Text style={styles.sessionTable}>Table {displayTableNumber}</Text>
        </View>
        <View style={styles.sessionTotalWrap}>
          <Text style={styles.sessionBatchCount}>
            {orderCount} {orderCount === 1 ? "batch" : "batches"}
          </Text>
          <Text style={styles.sessionTotal} numberOfLines={1} adjustsFontSizeToFit>
            ₹{formatMoney(grandTotal)}
          </Text>
        </View>
      </View>
    );

    // One near-white chip per batch, each carrying its own status dot - the
    // kitchen can see "batch 1 is Ready, batch 2 still Preparing" without
    // opening the review screen.
    const batchChips = (limit: number) => (
      <View style={styles.sessionChipsRow}>
        {tableOrders.slice(0, limit).map((o, i) => {
          const m = getStatusMeta(o.status);
          return (
            <View key={o._id} style={styles.sessionChip}>
              <View style={[styles.sessionChipDot, { backgroundColor: m.color }]} />
              <Text style={styles.sessionChipText} numberOfLines={1}>
                #{i + 1} {o.status} · ₹{formatMoney(o.totalPrice)}
              </Text>
            </View>
          );
        })}
        {orderCount > limit && (
          <View style={styles.sessionChip}>
            <Text style={styles.sessionChipText}>+{orderCount - limit} more</Text>
          </View>
        )}
      </View>
    );

    // LIST: compact - header, batch chips, one hint line. Whole card taps
    // through to the batch review screen.
    if (mode === "list") {
      return (
        <TouchableOpacity key={`session-group-${index}`} activeOpacity={0.85} onPress={openSession}>
          <LinearGradient
            colors={["#fb923c", "#ea580c", "#c2410c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1.2, y: 1.1 }}
            style={styles.sessionGradient}
          >
            {header}
            {batchChips(3)}
            <View style={styles.sessionHintRow}>
              <Text style={styles.sessionHint}>Tap to review all batches</Text>
              <ChevronRight size={15} color="#ffedd5" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    // GRID: the fuller treatment - every batch listed with its customer,
    // plus an explicit review button.
    return (
      <LinearGradient
        key={`session-group-${index}`}
        colors={["#fb923c", "#ea580c", "#c2410c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1.2, y: 1.1 }}
        style={styles.sessionGradient}
      >
        {header}
        <View style={styles.sessionBatchList}>
          {tableOrders.map((o, i) => {
            const m = getStatusMeta(o.status);
            return (
              <View key={o._id} style={styles.sessionBatchRow}>
                <Text style={styles.sessionBatchIndex}>#{i + 1}</Text>
                <Text style={styles.sessionBatchName} numberOfLines={1}>
                  {o.customerName}
                </Text>
                <View style={[styles.sessionChipDot, { backgroundColor: m.color }]} />
                <Text style={styles.sessionBatchStatus}>{o.status}</Text>
                <Text style={styles.sessionBatchTotal}>₹{formatMoney(o.totalPrice)}</Text>
              </View>
            );
          })}
        </View>
        <TouchableOpacity style={styles.sessionReviewBtn} onPress={openSession} activeOpacity={0.85}>
          <Text style={styles.sessionReviewBtnText} numberOfLines={1}>
            Review batches
          </Text>
          <ChevronRight size={17} color="#c2410c" />
        </TouchableOpacity>
      </LinearGradient>
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
        <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
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
      {liveOrders.length > 0 && (
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
        data={renderedOrders}
        keyExtractor={(group: any[]) => group[0]?.tableSessionId || group[0]?._id}
        renderItem={({ item: tableOrders, index }: { item: any[]; index: number }) => (
          // In grid mode each cell must be allowed to shrink to half the row,
          // otherwise the cards keep their intrinsic width and overflow.
          <View>
            {tableOrders.length === 1
              ? viewMode === "grid"
                ? renderOrderCard(tableOrders[0])
                : renderOrderRow(tableOrders[0])
              : renderSessionGroupCard(tableOrders, index, viewMode)}
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
        onEndReached={() => setVisibleCount((n) => n + ORDER_PAGE_SIZE)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          groupedVisibleOrders.length > 0 ? (
            <LoadMoreButton
              onPress={() => setVisibleCount((n) => n + ORDER_PAGE_SIZE)}
              hasMore={hasMoreOrders}
              shown={renderedOrders.length}
              total={groupedVisibleOrders.length}
              showEndMarker={groupedVisibleOrders.length > 8}
              endLabel="No more orders"
            />
          ) : null
        }
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
              <Text style={styles.modalSubtitle}>
                {(activeSession?.orders.length || 0) > 1
                  ? `${activeSession?.orders.length} batches · ₹${formatMoney(
                      (activeSession?.orders || []).reduce((sum, o) => sum + o.totalPrice, 0),
                    )} this visit`
                  : activeSession?.orders[0]?.customerName
                    ? `Order from ${activeSession.orders[0].customerName}`
                    : "Order detail"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setActiveSession(null)} style={styles.modalCloseBtn}>
              <XCircle size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            <View style={styles.modalCardStack}>
              {activeSession?.orders.map((order) => renderOrderCard(order, true))}
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
  // Flat, not raised. A drop shadow on every row turned the list into a stack
  // of floating tiles; a plain border reads as a list.
  card: { backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" },
  cardAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, zIndex: 1 },

  // LIST row. Deliberately flat and tight: the point of list view is to see
  // many orders at once, so nothing here has a shadow, a big pad, or a label
  // where an icon will do.
  row: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  rowAccent: { width: 4 },
  rowBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTableBadge: {
    backgroundColor: "#ffedd5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rowTableBadgeText: { color: "#c2410c", fontSize: 11, fontWeight: "800" },
  // flex so a long name truncates instead of shoving the total off the row.
  rowCustomer: { flex: 1, fontSize: 15, fontWeight: "800", color: "#1f2937" },
  rowTotal: { fontSize: 15, fontWeight: "900", color: "#15803d" },
  rowMeta: { flexShrink: 1, fontSize: 11, fontWeight: "600", color: "#9ca3af" },
  rowMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowPayment: { marginLeft: "auto", fontSize: 11, fontWeight: "800" },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  statusChipDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 10, fontWeight: "800" },
  // flexGrow 0 keeps the strip its own height inside the row's column.
  rowActionsScroll: { flexGrow: 0, flexShrink: 0 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 2 },
  // 36pt square: comfortably tappable without labels, and seven of them fit
  // in one scrollable strip.
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconBtnInactive: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
  // A stage the server would refuse. Faded rather than hidden: the row still
  // reads as a six-stage journey, it is just clear which stages are reachable
  // from here.
  iconBtnBlocked: { opacity: 0.35 },
  iconBtnCancel: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
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

  // Combined session - light-on-gradient, so it can never be confused with
  // a white single-order row.
  sessionGradient: {
    borderRadius: 18,
    padding: 14,
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  sessionTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  sessionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionTitleWrap: { flex: 1, minWidth: 0 },
  sessionLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#ffedd5",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sessionTable: { fontSize: 17, fontWeight: "900", color: "#ffffff", marginTop: 1 },
  sessionTotalWrap: { alignItems: "flex-end" },
  sessionBatchCount: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffedd5",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sessionTotal: { fontSize: 18, fontWeight: "900", color: "#ffffff", marginTop: 1 },
  sessionChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  sessionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 100,
    maxWidth: "100%",
  },
  sessionChipDot: { width: 7, height: 7, borderRadius: 4 },
  sessionChipText: { flexShrink: 1, fontSize: 11, fontWeight: "800", color: "#7c2d12" },
  sessionHintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.25)",
    paddingTop: 10,
  },
  sessionHint: { fontSize: 12, fontWeight: "700", color: "#ffedd5" },
  sessionBatchList: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 12,
  },
  sessionBatchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  sessionBatchIndex: { fontSize: 11, fontWeight: "900", color: "#ffedd5", width: 22 },
  sessionBatchName: { flex: 1, fontSize: 13, fontWeight: "800", color: "#ffffff" },
  sessionBatchStatus: { fontSize: 11, fontWeight: "700", color: "#ffedd5" },
  sessionBatchTotal: { fontSize: 13, fontWeight: "900", color: "#ffffff" },
  sessionReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 12,
  },
  sessionReviewBtnText: { color: "#c2410c", fontWeight: "900", fontSize: 14 },

  // Review-all-batches modal
  modalContainer: { flex: 1, backgroundColor: "#f3f4f6" },
  modalCardStack: { padding: 16, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, paddingTop: 50, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1f2937" },
  modalSubtitle: { fontSize: 12, color: "#9ca3af", fontWeight: "600", marginTop: 4, maxWidth: 260 },
  modalCloseBtn: { padding: 8, backgroundColor: "#f9fafb", borderRadius: 100 },
  modalContent: { padding: 16, paddingBottom: 40 },
});

export default OrderManager;
