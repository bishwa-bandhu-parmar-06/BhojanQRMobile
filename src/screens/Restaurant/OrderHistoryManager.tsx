import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  History,
  RefreshCw,
  IndianRupee,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";

import { getOrderHistory } from "../../API/orderApi";
import { getStatusMeta } from "../../constants/orderStatus";
import { SkeletonBlock } from "../../components/Skeleton";
import type { HeaderAction } from "../../components/Header";
import { useThemeColors, useThemedStyles, type ThemeColors } from "../../theme";

const PAGE_SIZE = 20;

const formatDateTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDayKey = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
};

type OrderHistoryManagerProps = {
  onHeaderActions?: (actions: HeaderAction[]) => void;
};

const OrderHistoryManager = ({ onHeaderActions }: OrderHistoryManagerProps) => {
  const c = useThemeColors();
  const styles = useThemedStyles(makeStyles);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pageRef = useRef(1);

  const load = useCallback(async (page: number, mode: "replace" | "append") => {
    try {
      const res = await getOrderHistory(page, PAGE_SIZE);
      const batch = res?.data?.data || [];

      setOrders((prev) => {
        if (mode === "replace") return batch;
        // The cutoff moves while paging, so a row can shift between pages and
        // arrive twice. De-duplicate on id rather than trusting the offset.
        const seen = new Set(prev.map((o) => o._id));
        return [...prev, ...batch.filter((o: any) => !seen.has(o._id))];
      });

      setHasMore(!!res?.data?.hasMore);
      setTotal(res?.data?.total || 0);
      pageRef.current = page;
    } catch {
      Toast.show({ type: "error", text1: "Failed to load order history" });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1, "replace");
  }, [load]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    load(1, "replace");
  }, [load]);

  const handleEndReached = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    load(pageRef.current + 1, "append");
  };

  const handlersRef = useRef({ refresh: () => {} });
  handlersRef.current = { refresh: handleRefresh };

  useEffect(() => {
    onHeaderActions?.([
      {
        key: "refresh",
        icon: RefreshCw,
        label: "Refresh",
        onPress: () => handlersRef.current.refresh(),
      },
    ]);
  }, [onHeaderActions]);

  useEffect(() => () => onHeaderActions?.([]), [onHeaderActions]);

  // Day headings, computed once per list rather than per row. History is read
  // as "what happened when", so the date is the spine of the list; without it
  // every card would have to repeat a full timestamp to be readable.
  const rows = useMemo(() => {
    const out: any[] = [];
    let lastDay = "";
    orders.forEach((order) => {
      const day = formatDayKey(order.statusUpdatedAt || order.updatedAt);
      if (day && day !== lastDay) {
        out.push({ _id: `day-${day}`, __day: day });
        lastDay = day;
      }
      out.push(order);
    });
    return out;
  }, [orders]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.list}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.card, { gap: 10 }]}>
              <SkeletonBlock width="45%" height={15} borderRadius={6} />
              <SkeletonBlock width="70%" height={12} borderRadius={6} />
              <SkeletonBlock width="30%" height={12} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconRing}>
            <View style={styles.emptyIconCircle}>
              <History size={30} color={c.primary} />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No past orders yet</Text>
          <Text style={styles.emptySubtitle}>
            Orders land here a minute after they are completed or cancelled, so the live
            board stays clear while you still have time to undo a mistaken tap.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={11}
        removeClippedSubviews
        ListHeaderComponent={
          <Text style={styles.summary}>
            {total} past order{total === 1 ? "" : "s"}
          </Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={c.primary} style={styles.footerSpinner} />
          ) : hasMore ? null : (
            <Text style={styles.endOfList}>That's all of it</Text>
          )
        }
        renderItem={({ item }) => {
          if (item.__day) {
            return <Text style={styles.dayHeading}>{item.__day}</Text>;
          }

          const isOpen = expandedId === item._id;
          const items = item.items || [];
          const itemCount = items.reduce(
            (sum: number, it: any) => sum + (it.quantity || 0),
            0,
          );

          // History now holds both outcomes, and a cancelled order looks
          // identical to a completed one without this - same table, same
          // total, same time. The status is what a manager is scanning for.
          const meta = getStatusMeta(item.status);
          const StatusIcon = meta.Icon;
          const isCancelled = item.status === "Cancelled";

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => setExpandedId(isOpen ? null : item._id)}
            >
              <View style={styles.cardTop}>
                <View style={styles.tableChip}>
                  <Text style={styles.tableChipText}>T{item.tableNumber}</Text>
                </View>
                <View style={styles.cardHeadText}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.customerName || "Guest"}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {formatDateTime(item.statusUpdatedAt || item.updatedAt)}
                  </Text>
                </View>
                <View style={styles.amountBlock}>
                  <View style={styles.amountRow}>
                    <IndianRupee size={13} color={isCancelled ? c.textFaint : c.text} />
                    {/* Struck through when cancelled: the number is still
                        worth seeing, but it is not money that was taken. */}
                    <Text style={[styles.amount, isCancelled && styles.amountVoid]}>
                      {item.totalPrice}
                    </Text>
                  </View>
                  {isOpen ? (
                    <ChevronUp size={15} color={c.textFaint} />
                  ) : (
                    <ChevronDown size={15} color={c.textFaint} />
                  )}
                </View>
              </View>

              <View style={styles.cardFoot}>
                <View style={[styles.statusChip, { backgroundColor: `${meta.color}1a` }]}>
                  <StatusIcon size={11} color={meta.color} />
                  <Text style={[styles.statusChipText, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
                <ShoppingBag size={12} color={c.textFaint} />
                <Text style={styles.cardFootText}>
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </Text>
              </View>

              {/* Why it was cancelled is the whole reason to look a cancelled
                  order up later, so it sits on the collapsed card rather than
                  behind a tap. */}
              {isCancelled && !!item.cancellationReason && (
                <Text style={styles.reason} numberOfLines={2}>
                  {item.cancellationReason}
                </Text>
              )}

              {/* Collapsed by default: a manager scanning history wants the
                  table, the total and the time. The line items matter only
                  once one row is worth querying. */}
              {isOpen && (
                <View style={styles.itemList}>
                  {items.map((it: any, index: number) => (
                    <View key={`${item._id}-${index}`} style={styles.itemRow}>
                      <Text style={styles.itemQty}>{it.quantity}×</Text>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {it.name}
                      </Text>
                      <Text style={styles.itemPrice}>₹{it.price}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

export default OrderHistoryManager;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    list: { padding: 16, paddingBottom: 32, gap: 10 },

    summary: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textFaint,
      marginBottom: 4,
    },
    dayHeading: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: c.textFaint,
      marginTop: 10,
      marginBottom: 2,
    },

    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    tableChip: {
      minWidth: 40,
      height: 40,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    tableChipText: { fontSize: 13, fontWeight: "800", color: c.primary },
    cardHeadText: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: "800", color: c.text },
    cardMeta: { fontSize: 11, fontWeight: "600", color: c.textFaint, marginTop: 2 },
    amountBlock: { alignItems: "flex-end", gap: 2 },
    amountRow: { flexDirection: "row", alignItems: "center" },
    amount: { fontSize: 16, fontWeight: "900", color: c.text },
    amountVoid: { color: c.textFaint, textDecorationLine: "line-through" },

    cardFoot: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
    cardFootText: { fontSize: 11, fontWeight: "700", color: c.textFaint },
    // Tinted from the status's own colour at low alpha, so the chip works on
    // either theme's card without a second palette entry per status.
    statusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 7,
    },
    statusChipText: { fontSize: 10, fontWeight: "800" },
    reason: {
      fontSize: 12,
      lineHeight: 17,
      color: c.textMuted,
      fontStyle: "italic",
      marginTop: 8,
    },

    itemList: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      gap: 8,
    },
    itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    itemQty: { fontSize: 12, fontWeight: "800", color: c.primary, minWidth: 26 },
    itemName: { flex: 1, fontSize: 13, color: c.textBody },
    itemPrice: { fontSize: 13, fontWeight: "700", color: c.text },

    footerSpinner: { marginTop: 14 },
    endOfList: {
      fontSize: 11,
      fontWeight: "600",
      color: c.textFaint,
      textAlign: "center",
      marginTop: 16,
    },

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
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    emptyIconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: c.primarySoftBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: c.text },
    emptySubtitle: {
      fontSize: 13,
      lineHeight: 20,
      color: c.textMuted,
      marginTop: 8,
      textAlign: "center",
    },
  });
