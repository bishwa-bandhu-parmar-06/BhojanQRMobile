import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  History,
  RefreshCw,
  IndianRupee,
  ShoppingBag,
  ChevronRight,
  XCircle,
} from "lucide-react-native";

import { getOrderHistory } from "../../API/orderApi";
import { getStatusMeta, groupBySession } from "../../constants/orderStatus";
import { formatMoney } from "../../utils/money";
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
  // The row that has been opened into the full detail screen. History used
  // to expand inline, which meant a combined session's four batches unfolded
  // inside a list row and pushed everything below it off screen. It opens the
  // same way the live board does now.
  const [detail, setDetail] = useState<any>(null);

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
    // Repeat orders from one visit stay together here exactly as they do on
    // the live board - the server releases a session as a unit, so history
    // must present it as one, not as loose batches scattered by timestamp.
    const groups = groupBySession(orders).map((group) => {
      if (group.length === 1) return group[0];

      const latest = group.reduce((newest: any, o: any) =>
        new Date(o.statusUpdatedAt || o.updatedAt || 0).getTime() >
        new Date(newest.statusUpdatedAt || newest.updatedAt || 0).getTime()
          ? o
          : newest,
      );

      return {
        _id: `session-${group[0].tableSessionId || group[0]._id}`,
        __session: true,
        orders: group,
        tableNumber: group[0].tableNumber,
        customerName: group[0].customerName,
        statusUpdatedAt: latest.statusUpdatedAt || latest.updatedAt,
        // A session is "cancelled" only if nothing in it survived; one
        // cancelled batch beside three served ones is still a served table.
        status: group.every((o: any) => o.status === "Cancelled")
          ? "Cancelled"
          : "Completed",
        totalPrice: group.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0),
        items: group.flatMap((o: any) => o.items || []),
      };
    });

    const out: any[] = [];
    let lastDay = "";
    groups.forEach((entry: any) => {
      const day = formatDayKey(entry.statusUpdatedAt || entry.updatedAt);
      if (day && day !== lastDay) {
        out.push({ _id: `day-${day}`, __day: day });
        lastDay = day;
      }
      out.push(entry);
    });
    return out;
  }, [orders]);

  const detailBatches = detail?.__session ? detail.orders : detail ? [detail] : [];

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
              onPress={() => setDetail(item)}
            >
              <View style={styles.cardTop}>
                <View style={styles.tableChip}>
                  <Text style={styles.tableChipText}>T{item.tableNumber}</Text>
                </View>
                <View style={styles.cardHeadText}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.__session ? "Combined session" : item.customerName || "Guest"}
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
                      {formatMoney(item.totalPrice)}
                    </Text>
                  </View>
                  <ChevronRight size={15} color={c.textFaint} />
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
                  {item.__session ? `${item.orders.length} batches · ` : ""}
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

            </TouchableOpacity>
          );
        }}
      />

      {/* Full-screen detail, same shape as the live board's - a finished
          order is read here, not worked on, so it carries no status
          controls. Every batch is shown in full: this is the one place the
          whole visit can be reconstructed. */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Table {detail?.tableNumber}</Text>
              <Text style={styles.modalSubtitle}>
                {detail?.__session
                  ? `${detail.orders.length} batches · ${formatDateTime(
                      detail.statusUpdatedAt || detail.updatedAt,
                    )}`
                  : formatDateTime(detail?.statusUpdatedAt || detail?.updatedAt)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setDetail(null)}
              style={styles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <XCircle size={24} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {detailBatches.map((batch: any, batchIndex: number) => {
              const bMeta = getStatusMeta(batch.status);
              const BIcon = bMeta.Icon;
              const bCancelled = batch.status === "Cancelled";

              return (
                <View key={batch._id || batchIndex} style={styles.detailCard}>
                  <View style={styles.detailCardTop}>
                    <View style={styles.detailHeadText}>
                      <Text style={styles.detailCustomer} numberOfLines={1}>
                        {batch.customerName || "Guest"}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {formatDateTime(batch.statusUpdatedAt || batch.updatedAt)}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: `${bMeta.color}1a` }]}>
                      <BIcon size={11} color={bMeta.color} />
                      <Text style={[styles.statusChipText, { color: bMeta.color }]}>
                        {bMeta.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemList}>
                    {(batch.items || []).map((it: any, index: number) => (
                      <View key={`${batch._id}-${index}`} style={styles.itemRow}>
                        <Text style={styles.itemQty}>{it.quantity}×</Text>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {it.name}
                        </Text>
                        <Text style={styles.itemPrice}>
                          ₹{formatMoney((it.price || 0) * (it.quantity || 0))}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {bCancelled && !!batch.cancellationReason && (
                    <Text style={styles.reason}>{batch.cancellationReason}</Text>
                  )}

                  <View style={styles.detailTotalRow}>
                    <Text style={styles.detailTotalLabel}>Batch total</Text>
                    <Text style={[styles.detailTotalValue, bCancelled && styles.amountVoid]}>
                      ₹{formatMoney(batch.totalPrice)}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Only meaningful when there is more than one batch to add up. */}
            {detail?.__session && (
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Session total</Text>
                <Text style={styles.grandTotalValue}>₹{formatMoney(detail.totalPrice)}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
    // ---- Full-screen detail ----------------------------------------------
    modalContainer: { flex: 1, backgroundColor: c.bg },
    modalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 18,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    modalHeaderText: { flex: 1 },
    modalTitle: { fontSize: 22, fontWeight: "900", color: c.text },
    modalSubtitle: { fontSize: 12, fontWeight: "600", color: c.textFaint, marginTop: 4 },
    modalCloseBtn: { padding: 6, borderRadius: 100, backgroundColor: c.surfaceAlt },
    modalContent: { padding: 16, paddingBottom: 40, gap: 14 },

    detailCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },
    detailCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 4,
    },
    detailHeadText: { flex: 1 },
    detailCustomer: { fontSize: 15, fontWeight: "800", color: c.text },
    detailTotalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    detailTotalLabel: { fontSize: 12, fontWeight: "700", color: c.textMuted },
    detailTotalValue: { fontSize: 16, fontWeight: "900", color: c.text },
    grandTotalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderRadius: 14,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoftBorder,
    },
    grandTotalLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: c.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    grandTotalValue: { flexShrink: 1, fontSize: 20, fontWeight: "900", color: c.success },

    emptyTitle: { fontSize: 18, fontWeight: "800", color: c.text },
    emptySubtitle: {
      fontSize: 13,
      lineHeight: 20,
      color: c.textMuted,
      marginTop: 8,
      textAlign: "center",
    },
  });
