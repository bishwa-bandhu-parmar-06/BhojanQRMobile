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
import { SafeAreaView } from "react-native-safe-area-context";
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
  ArrowLeft,
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
  // The stage buttons, shared by the board card and the detail screen so the
  // two can never disagree about which transitions are on offer - which is
  // the whole point of canTransitionTo mirroring the server's guards.
  const renderStatusActions = (order: any) => (
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
  );

  // One standalone order. Deliberately NOT shared with renderSessionGroupCard,
  // which keeps its own orange-gradient treatment so a multi-batch table can
  // never be misread as one more single order.
  const renderOrderCard = (order: any, expanded = false) => {
    const meta = getStatusMeta(order.status);
    const items = order.items || [];
    const itemCount = items.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
    // Long orders are truncated on the board and shown in full on the detail
    // screen. A ten-line card pushes every other order off screen, which is
    // the opposite of what a live board is for.
    const visibleItems = expanded ? items : items.slice(0, 3);
    const hiddenCount = items.length - visibleItems.length;
    const isPaid = order.paymentStatus === "Paid";

    // How long this order has been open. On a kitchen board "18m" is the
    // number people actually act on - a wall-clock time makes you do the
    // subtraction yourself. Computed at render rather than on a dedicated
    // timer: the 30s poll and every socket event re-render this list, so it
    // is never more than a poll behind.
    const ageMs = Date.now() - new Date(order.createdAt || 0).getTime();
    const ageMin = Number.isFinite(ageMs) ? Math.max(0, Math.floor(ageMs / 60000)) : 0;
    const ageLabel = ageMin < 60 ? `${ageMin}m` : `${Math.floor(ageMin / 60)}h ${ageMin % 60}m`;
    // Only once it is genuinely lingering, and never for an order nobody is
    // waiting on any more.
    const isStale = ageMin >= 20 && !TERMINAL_ORDER_STATUSES.includes(order.status);

    return (
      <View key={order._id} style={styles.card}>
        {/* The status colour is carried by a full-width top rail rather than a
            thin left edge: at a glance across a grid of cards it reads as the
            card's own colour, not a stripe that has to be looked for. */}
        <View style={[styles.cardRail, { backgroundColor: meta.color }]} />

        {/* Header doubles as the tap target for the full detail screen, so an
            order whose items are truncated is always one tap from complete.
            Disabled inside the detail screen, where it would reopen itself. */}
        <TouchableOpacity
          style={styles.cardHeader}
          activeOpacity={expanded ? 1 : 0.7}
          disabled={expanded}
          onPress={() =>
            setActiveSession({ tableNumber: order.tableNumber, orders: [order] })
          }
        >
          <View style={styles.cardTableChip}>
            <Text style={styles.cardTableChipText}>T{order.tableNumber}</Text>
          </View>

          <View style={styles.cardIdentity}>
            <Text style={styles.cardCustomer} numberOfLines={1}>
              {order.customerName || "Guest"}
            </Text>
            <View style={styles.cardMetaRow}>
              {/* Status as a dot + word, not a colour alone - colour is the
                  fast signal, the word is the one that survives being
                  colour-blind or glanced at in bright sun. */}
              <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
              <Text style={[styles.cardStatusText, { color: meta.color }]} numberOfLines={1}>
                {meta.label}
              </Text>
              <Text style={styles.cardMetaDivider}>·</Text>
              <Text style={[styles.cardAge, isStale && styles.cardAgeStale]}>{ageLabel}</Text>
            </View>
          </View>

          {/* Payment as a proper pill. This used to be "✅ Paid" / "⏳ Pending"
              - emoji render differently on every OS and cannot be tinted. */}
          <View style={[styles.payPill, isPaid ? styles.payPillPaid : styles.payPillDue]}>
            <Text style={[styles.payPillText, isPaid ? styles.payPillTextPaid : styles.payPillTextDue]}>
              {isPaid ? "Paid" : "Due"}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.cardBody}>
          {visibleItems.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemPrice}>
                ₹{formatMoney(item.price * item.quantity)}
              </Text>
            </View>
          ))}
          {hiddenCount > 0 && (
            <Text style={styles.itemsMore}>
              +{hiddenCount} more item{hiddenCount === 1 ? "" : "s"}
            </Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          {/* Count on the left, money on the right: the two numbers a manager
              scans for, on one line instead of a labelled "Total" row. */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </Text>
            <View style={styles.totalValueContainer}>
              <IndianRupee size={15} color="#15803d" />
              <Text style={styles.totalAmount}>{formatMoney(order.totalPrice)}</Text>
            </View>
          </View>

          {canUpdateStatus && renderStatusActions(order)}
        </View>
      </View>
    );
  };

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

      {/* ORDER / SESSION DETAIL */}
      <Modal visible={!!activeSession} animationType="slide" onRequestClose={() => setActiveSession(null)}>
        {(() => {
          const detailOrders = activeSession?.orders || [];
          const isSession = detailOrders.length > 1;
          const grandTotal = detailOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
          const detailItemCount = detailOrders.reduce(
            (sum, o) => sum + (o.items || []).reduce((n: number, it: any) => n + (it.quantity || 0), 0),
            0,
          );
          const lead = detailOrders[0];
          const leadMeta = lead ? getStatusMeta(lead.status) : null;

          return (
            // SafeAreaView, not the hardcoded paddingTop:50 this used to
            // carry - that number was a guess at one device's status bar and
            // was wrong on every other.
            <SafeAreaView style={styles.detailContainer}>
              {/* The same back bar every other drill-in in this app uses
                  (Menu item detail, Top Selling Items), rather than an
                  XCircle in the corner - a red cancel glyph reads as
                  "discard", not "go back". */}
              <View style={styles.detailBar}>
                <TouchableOpacity
                  style={styles.detailBack}
                  onPress={() => setActiveSession(null)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                >
                  <ArrowLeft size={18} color="#374151" />
                  <Text style={styles.detailBarTitle} numberOfLines={1}>
                    Table {activeSession?.tableNumber}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.detailContent}
                showsVerticalScrollIndicator={false}
              >
                {/* A summary the old screen never had: it opened straight
                    into the batch cards, so the one thing you came to check -
                    who, what state, how much - had to be assembled by eye. */}
                <View style={styles.detailSummary}>
                  <View style={styles.detailSummaryTop}>
                    <View style={styles.detailNameBlock}>
                      <Text style={styles.detailName} numberOfLines={1}>
                        {lead?.customerName || "Guest"}
                      </Text>
                      {!!leadMeta && !isSession && (
                        <View style={styles.detailStatusRow}>
                          <View style={[styles.statusDot, { backgroundColor: leadMeta.color }]} />
                          <Text style={[styles.detailStatusText, { color: leadMeta.color }]}>
                            {leadMeta.label}
                          </Text>
                        </View>
                      )}
                      {isSession && (
                        <Text style={styles.detailStatusText}>Combined session</Text>
                      )}
                    </View>
                    <View style={styles.detailTableChip}>
                      <Text style={styles.detailTableChipText}>T{activeSession?.tableNumber}</Text>
                    </View>
                  </View>

                  <View style={styles.detailStatsRow}>
                    {/* A single order has exactly one batch, so counting them
                        is noise - it gets payment state in that slot instead,
                        which is the thing actually worth knowing here. */}
                    {isSession && (
                      <>
                        <View style={styles.detailStat}>
                          <Text style={styles.detailStatValue}>{detailOrders.length}</Text>
                          <Text style={styles.detailStatLabel}>Batches</Text>
                        </View>
                        <View style={styles.detailStatDivider} />
                      </>
                    )}
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatValue}>{detailItemCount}</Text>
                      <Text style={styles.detailStatLabel}>Items</Text>
                    </View>
                    <View style={styles.detailStatDivider} />
                    <View style={styles.detailStat}>
                      <Text style={[styles.detailStatValue, styles.detailStatMoney]}>
                        ₹{formatMoney(grandTotal)}
                      </Text>
                      <Text style={styles.detailStatLabel}>
                        {isSession ? "This visit" : "Total"}
                      </Text>
                    </View>
                    {!isSession && (
                      <>
                        <View style={styles.detailStatDivider} />
                        <View style={styles.detailStat}>
                          <Text
                            style={[
                              styles.detailStatValue,
                              lead?.paymentStatus === "Paid" ? styles.textGreen : styles.textAmber,
                            ]}
                          >
                            {lead?.paymentStatus === "Paid" ? "Paid" : "Due"}
                          </Text>
                          <Text style={styles.detailStatLabel}>Payment</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                {isSession ? (
                  // Several distinct orders, so each keeps its own card: the
                  // header is what tells one batch from the next.
                  <>
                    <Text style={styles.detailSectionLabel}>Batches</Text>
                    <View style={styles.detailStack}>
                      {detailOrders.map((order) => renderOrderCard(order, true))}
                    </View>
                  </>
                ) : (
                  // One order. Rendering the board card here as well put the
                  // customer, table, status and total on screen twice, one
                  // card under the other - the duplication that made this
                  // screen look wrong. The summary above owns the identity;
                  // these two panels own the contents and the controls, and
                  // neither repeats it.
                  lead && (
                    <>
                      <Text style={styles.detailSectionLabel}>Items</Text>
                      <View style={styles.detailPanel}>
                        {(lead.items || []).map((item: any, idx: number) => (
                          <View key={idx} style={styles.detailItemRow}>
                            <Text style={styles.itemQty}>{item.quantity}×</Text>
                            <Text style={styles.detailItemName}>{item.name}</Text>
                            <Text style={styles.detailItemPrice}>
                              ₹{formatMoney(item.price * item.quantity)}
                            </Text>
                          </View>
                        ))}
                        <View style={styles.detailTotalRow}>
                          <Text style={styles.detailTotalLabel}>Total</Text>
                          <Text style={styles.detailTotalValue}>
                            ₹{formatMoney(lead.totalPrice)}
                          </Text>
                        </View>
                      </View>

                      {canUpdateStatus && (
                        <>
                          <Text style={styles.detailSectionLabel}>Update status</Text>
                          <View style={styles.detailActionsPanel}>
                            {renderStatusActions(lead)}
                          </View>
                        </>
                      )}
                    </>
                  )
                )}
              </ScrollView>
            </SafeAreaView>
          );
        })()}
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
  // Full-width status rail across the top. Reads as the card's own colour
  // from across the room, unlike a 4px left edge you have to hunt for.
  cardRail: { height: 4, width: "100%" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  // "T5" rather than "Table 5": on a board every card is a table, so the word
  // is nine repeated characters that push the customer's name sideways.
  cardTableChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTableChipText: { color: "#c2410c", fontSize: 14, fontWeight: "900" },
  cardIdentity: { flex: 1, gap: 3 },
  cardCustomer: { fontWeight: "800", color: "#111827", fontSize: 15 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  cardStatusText: { fontSize: 12, fontWeight: "800", flexShrink: 1 },
  cardMetaDivider: { fontSize: 12, color: "#d1d5db" },
  cardAge: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  // An order sitting past 20 minutes is the one worth walking over to.
  cardAgeStale: { color: "#dc2626", fontWeight: "800" },
  payPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  payPillPaid: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  payPillDue: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  payPillText: { fontSize: 11, fontWeight: "800" },
  payPillTextPaid: { color: "#15803d" },
  payPillTextDue: { color: "#b45309" },
  // Still used by the list-view row, which is a separate treatment from the
  // card and was deliberately left as it is.
  textGreen: { color: "#16a34a" },
  textAmber: { color: "#d97706" },

  cardBody: { paddingHorizontal: 14, paddingVertical: 12, gap: 9 },
  // Three columns on one line - quantity, name, money - so the prices form a
  // straight right-hand edge instead of drifting with each name's length.
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemQty: { fontWeight: "800", color: "#ea580c", fontSize: 13, minWidth: 26 },
  itemName: { color: "#374151", fontSize: 14, flex: 1 },
  itemPrice: { color: "#6b7280", fontSize: 13, fontWeight: "700" },
  itemsMore: { color: "#9ca3af", fontSize: 12, fontWeight: "700", fontStyle: "italic" },

  cardFooter: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#f3f4f6", backgroundColor: "#fafafa" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  totalLabel: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  totalValueContainer: { flexDirection: "row", alignItems: "center" },
  totalAmount: { fontSize: 18, fontWeight: "900", color: "#15803d", marginLeft: 1 },
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
  detailContainer: { flex: 1, backgroundColor: "#f9fafb" },
  detailBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailBack: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  detailBarTitle: { fontSize: 16, fontWeight: "800", color: "#1f2937", flexShrink: 1 },
  // Single padding, not the 32px the old screen produced by padding the
  // scroll content AND the stack inside it.
  detailContent: { padding: 16, paddingBottom: 40 },

  detailSummary: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 16,
    marginBottom: 16,
  },
  detailSummaryTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailNameBlock: { flex: 1, gap: 4 },
  detailName: { fontSize: 18, fontWeight: "800", color: "#111827" },
  detailStatusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailStatusText: { fontSize: 12, fontWeight: "800", color: "#6b7280" },
  detailTableChip: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    alignItems: "center",
    justifyContent: "center",
  },
  detailTableChipText: { color: "#c2410c", fontSize: 16, fontWeight: "900" },
  // Three figures on one line - the answer to "what is this table costing me
  // and how far along is it" without scrolling through the batches.
  detailStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  detailStat: { flex: 1, alignItems: "center", gap: 2 },
  detailStatDivider: { width: 1, height: 26, backgroundColor: "#f1f5f9" },
  detailStatValue: { fontSize: 16, fontWeight: "900", color: "#1f2937" },
  detailStatMoney: { color: "#15803d" },
  detailStatLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "700" },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailStack: { gap: 14 },

  // Plain panels for the single-order case - no header of their own, because
  // the summary card above already carries the identity.
  detailPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
  },
  detailItemName: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  detailItemPrice: { fontSize: 14, color: "#4b5563", fontWeight: "700" },
  detailTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  detailTotalLabel: { fontSize: 13, fontWeight: "800", color: "#6b7280" },
  detailTotalValue: { fontSize: 18, fontWeight: "900", color: "#15803d" },
  detailActionsPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    paddingVertical: 12,
    paddingLeft: 12,
    marginBottom: 16,
  },
});

export default OrderManager;
