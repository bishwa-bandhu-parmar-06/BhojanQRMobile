import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  LifeBuoy,
  X,
  CircleDot,
  Loader,
  CheckCircle2,
  Store,
  Paperclip,
} from "lucide-react-native";

import { getAllTickets, updateTicketStatus } from "../../API/supportTicketApi";
import { SkeletonBlock } from "../Skeleton";
import SectionError from "../SectionError";

type TicketStatus = "open" | "in_progress" | "resolved";

const STATUS_META: Record<
  TicketStatus,
  { label: string; color: string; bg: string; icon: React.ComponentType<any> }
> = {
  open: { label: "Open", color: "#d97706", bg: "#fffbeb", icon: CircleDot },
  in_progress: { label: "In progress", color: "#2563eb", bg: "#eff6ff", icon: Loader },
  resolved: { label: "Resolved", color: "#16a34a", bg: "#f0fdf4", icon: CheckCircle2 },
};

const FILTERS: { id: "all" | TicketStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
];

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const AdminSupportManager = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [detail, setDetail] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setLoadError(false);
      // Fetched unfiltered and filtered on the device: the counts on the
      // pills have to reflect every ticket, and re-requesting per pill would
      // make each tap wait on the network for data already held.
      const res = await getAllTickets();
      setTickets(res?.data?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load support tickets" });
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
    }),
    [tickets],
  );

  const visible = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const changeStatus = async (id: string, status: TicketStatus) => {
    setUpdatingId(id);
    // Optimistic: the admin is looking at the row they just changed, and a
    // round trip before the chip moves reads as an unresponsive tap.
    setTickets((prev) => prev.map((t) => (t._id === id ? { ...t, status } : t)));
    setDetail((prev: any) => (prev && prev._id === id ? { ...prev, status } : prev));
    try {
      await updateTicketStatus(id, status);
      Toast.show({ type: "success", text1: `Marked ${STATUS_META[status].label}` });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Could not update the ticket",
      });
      load(true); // fall back to server truth
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.card}>
              <SkeletonBlock width="60%" height={14} borderRadius={6} />
              <SkeletonBlock width="90%" height={12} borderRadius={6} style={styles.gap8} />
              <SkeletonBlock width="35%" height={12} borderRadius={6} style={styles.gap8} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (loadError && tickets.length === 0) {
    return (
      <View style={styles.container}>
        <SectionError message="Failed to load support tickets." onRetry={() => load()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{f.label}</Text>
              {counts[f.id] > 0 && (
                <View style={[styles.pillCount, active && styles.pillCountActive]}>
                  <Text style={[styles.pillCountText, active && styles.pillCountTextActive]}>
                    {counts[f.id]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={visible}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            colors={["#f97316"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <LifeBuoy size={44} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>
              {filter === "all" ? "No tickets yet" : `No ${STATUS_META[filter as TicketStatus].label.toLowerCase()} tickets`}
            </Text>
            <Text style={styles.emptyBody}>
              Restaurants raise these from their dashboard when something blocks them.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status as TicketStatus] || STATUS_META.open;
          const Icon = meta.icon;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setDetail(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <Text style={styles.subject} numberOfLines={1}>
                  {item.subject}
                </Text>
                <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                  <Icon size={11} color={meta.color} />
                  <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>

              <Text style={styles.desc} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.cardFoot}>
                <Store size={12} color="#94a3b8" />
                {/* Which restaurant raised it is the first thing an admin
                    needs; the ticket is meaningless without it. */}
                <Text style={styles.footText} numberOfLines={1}>
                  {item.restaurant?.restaurantName || item.raisedByName || "Unknown restaurant"}
                </Text>
                <Text style={styles.footDate}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={!!detail}
        animationType="slide"
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderText}>
              <Text style={styles.detailTitle} numberOfLines={2}>
                {detail?.subject}
              </Text>
              <Text style={styles.detailMeta}>
                {detail?.restaurant?.restaurantName || "Unknown restaurant"} ·{" "}
                {formatDate(detail?.createdAt)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setDetail(null)} style={styles.detailClose}>
              <X size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.detailDesc}>{detail?.description}</Text>

            {detail?.attachments?.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>
                  <Paperclip size={12} color="#475569" /> Attachments
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachRow}>
                  {detail.attachments.map((a: any, i: number) =>
                    a.fileType === "image" ? (
                      <Image key={i} source={{ uri: a.fileUrl }} style={styles.attachImage} />
                    ) : (
                      <View key={i} style={styles.attachFile}>
                        <Paperclip size={16} color="#64748b" />
                        <Text style={styles.attachFileText} numberOfLines={1}>
                          {a.originalName || a.fileType}
                        </Text>
                      </View>
                    ),
                  )}
                </ScrollView>
              </>
            )}

            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.statusPicker}>
              {(Object.keys(STATUS_META) as TicketStatus[]).map((key) => {
                const meta = STATUS_META[key];
                const Icon = meta.icon;
                const active = detail?.status === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.statusOption,
                      active && { backgroundColor: meta.bg, borderColor: meta.color },
                    ]}
                    onPress={() => detail && changeStatus(detail._id, key)}
                    disabled={updatingId === detail?._id}
                    activeOpacity={0.8}
                  >
                    {updatingId === detail?._id && active ? (
                      <ActivityIndicator size="small" color={meta.color} />
                    ) : (
                      <>
                        <Icon size={15} color={active ? meta.color : "#94a3b8"} />
                        <Text
                          style={[styles.statusOptionText, active && { color: meta.color }]}
                        >
                          {meta.label}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default AdminSupportManager;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  gap8: { marginTop: 8 },

  filterScroll: { flexGrow: 0, backgroundColor: "#ffffff" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: "#f1f5f9",
  },
  pillActive: { backgroundColor: "#f97316" },
  pillText: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  pillTextActive: { color: "#ffffff" },
  pillCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 100,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
  },
  pillCountActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  pillCountText: { fontSize: 11, fontWeight: "800", color: "#475569" },
  pillCountTextActive: { color: "#ffffff" },

  listContent: { padding: 16, paddingBottom: 32, gap: 10 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  subject: { flex: 1, fontSize: 14, fontWeight: "800", color: "#0f172a" },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  statusChipText: { fontSize: 10, fontWeight: "800" },
  desc: { fontSize: 12, color: "#64748b", lineHeight: 18, marginTop: 8 },
  cardFoot: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  footText: { flex: 1, fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  footDate: { fontSize: 11, fontWeight: "600", color: "#cbd5e1" },

  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#334155", marginTop: 8 },
  emptyBody: { fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 19 },

  detailContainer: { flex: 1, backgroundColor: "#f8fafc" },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 18,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  detailHeaderText: { flex: 1 },
  detailTitle: { fontSize: 19, fontWeight: "900", color: "#0f172a" },
  detailMeta: { fontSize: 12, fontWeight: "600", color: "#94a3b8", marginTop: 5 },
  detailClose: { padding: 6, borderRadius: 100, backgroundColor: "#f1f5f9" },
  detailBody: { padding: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
  },
  detailDesc: { fontSize: 14, color: "#334155", lineHeight: 21 },
  attachRow: { flexGrow: 0 },
  attachImage: { width: 92, height: 92, borderRadius: 12, marginRight: 10 },
  attachFile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 10,
    maxWidth: 190,
  },
  attachFileText: { fontSize: 12, fontWeight: "600", color: "#475569", flexShrink: 1 },

  statusPicker: { gap: 10 },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statusOptionText: { fontSize: 14, fontWeight: "800", color: "#94a3b8" },
});
