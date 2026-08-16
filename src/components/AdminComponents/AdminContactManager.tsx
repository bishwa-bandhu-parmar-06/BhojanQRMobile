import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Linking,
  Modal,
} from "react-native";
import Toast from "react-native-toast-message";
import { MessageSquare, Mail, Phone, X, CheckCircle2, Eye, Clock } from "lucide-react-native";

import { getContactMessages, updateContactStatus } from "../../API/adminApi";
import { SkeletonBlock } from "../Skeleton";
import SectionError from "../SectionError";

// The Contact model's enum, spelled out rather than collected from whatever
// happens to be in the list. Deriving it from the data meant a fresh inbox -
// where every message is "pending" - offered no way to move anything out of
// pending, which is the one thing this screen is for.
//
// "replied" IS the completed state: an admin answers by email or phone from
// the buttons below and then marks it. There is no separate "completed"
// because a replied enquiry is a finished one.
const STATUSES = [
  {
    id: "pending",
    label: "Pending",
    action: "Move to pending",
    icon: Clock,
    color: "#d97706",
    bg: "#fffbeb",
  },
  {
    id: "read",
    label: "Read",
    action: "Mark as read",
    icon: Eye,
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    id: "replied",
    label: "Replied",
    action: "Mark as replied",
    icon: CheckCircle2,
    color: "#16a34a",
    bg: "#f0fdf4",
  },
];

const statusMeta = (id: string) => STATUSES.find((s) => s.id === id) || STATUSES[0];

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const AdminContactManager = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [detail, setDetail] = useState<any>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setLoadError(false);
      const res = await getContactMessages();
      setMessages(res?.data?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load messages" });
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: messages.length };
    STATUSES.forEach((s) => {
      c[s.id] = messages.filter((m) => m.status === s.id).length;
    });
    return c;
  }, [messages]);

  const visible = filter === "all" ? messages : messages.filter((m) => m.status === filter);

  const markStatus = async (item: any, status: string) => {
    const previous = item.status;
    setMessages((prev) => prev.map((m) => (m._id === item._id ? { ...m, status } : m)));
    setDetail((prev: any) => (prev && prev._id === item._id ? { ...prev, status } : prev));
    try {
      await updateContactStatus(item._id, status);
    } catch (error: any) {
      setMessages((prev) =>
        prev.map((m) => (m._id === item._id ? { ...m, status: previous } : m)),
      );
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Could not update this message",
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.card}>
              <SkeletonBlock width="45%" height={13} borderRadius={6} />
              <SkeletonBlock width="90%" height={12} borderRadius={6} style={styles.gap8} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (loadError && messages.length === 0) {
    return (
      <View style={styles.container}>
        <SectionError message="Failed to load messages." onRetry={() => load()} />
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
        {["all", ...STATUSES.map((x) => x.id)].map((id) => {
            const active = filter === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setFilter(id)}
                activeOpacity={0.8}
              >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {id === "all" ? "All" : statusMeta(id).label}
              </Text>
                {counts[id] > 0 && (
                  <View style={[styles.pillCount, active && styles.pillCountActive]}>
                    <Text style={[styles.pillCountText, active && styles.pillCountTextActive]}>
                      {counts[id]}
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
            <MessageSquare size={44} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No messages</Text>
            <Text style={styles.emptyBody}>
              Anything sent through the website contact form arrives here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setDetail(item)}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <Text style={styles.subject} numberOfLines={1}>
                {item.subject || "General Inquiry"}
              </Text>
              {!!item.status && (
                <View
                  style={[styles.statusChip, { backgroundColor: statusMeta(item.status).bg }]}
                >
                  <Text
                    style={[styles.statusChipText, { color: statusMeta(item.status).color }]}
                  >
                    {statusMeta(item.status).label}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.preview} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={styles.cardFoot}>
              <Text style={styles.sender} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>

            {/* Closing an enquiry is the common action once it has been
                answered, so it does not require opening the message first.
                Hidden once replied - there is nothing further to do. */}
            {item.status !== "replied" && (
              <TouchableOpacity
                style={styles.quickDone}
                onPress={() => markStatus(item, "replied")}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={13} color="#16a34a" />
                <Text style={styles.quickDoneText}>Mark as replied</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.detailRoot}>
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderText}>
              <Text style={styles.detailTitle} numberOfLines={2}>
                {detail?.subject || "General Inquiry"}
              </Text>
              <Text style={styles.detailMeta}>
                {detail?.name} · {formatDate(detail?.createdAt)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setDetail(null)} style={styles.detailClose}>
              <X size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.detailMessage}>{detail?.message}</Text>

            {/* Tappable, because the only useful next step for a contact
                message is replying to it, and retyping an address off a
                screen is how a reply does not happen. */}
            <Text style={styles.sectionLabel}>Reply to</Text>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => detail?.email && Linking.openURL(`mailto:${detail.email}`)}
              activeOpacity={0.8}
            >
              <Mail size={15} color="#f97316" />
              <Text style={styles.contactBtnText}>{detail?.email}</Text>
            </TouchableOpacity>
            {!!detail?.mobile && (
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => Linking.openURL(`tel:${detail.mobile}`)}
                activeOpacity={0.8}
              >
                <Phone size={15} color="#f97316" />
                <Text style={styles.contactBtnText}>{detail.mobile}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.statusPicker}>
              {STATUSES.map((st) => {
                const Icon = st.icon;
                const active = detail?.status === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[
                      styles.statusOption,
                      active && { backgroundColor: st.bg, borderColor: st.color },
                    ]}
                    onPress={() => detail && markStatus(detail, st.id)}
                    activeOpacity={0.8}
                  >
                    <Icon size={15} color={active ? st.color : "#94a3b8"} />
                    <Text
                      style={[styles.statusOptionText, active && { color: st.color }]}
                    >
                      {active ? st.label : st.action}
                    </Text>
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

export default AdminContactManager;

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
  pillText: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "capitalize" },
  pillTextActive: { color: "#ffffff" },
  pillCount: {
    minWidth: 20,
    paddingHorizontal: 5,
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
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#f1f5f9" },
  statusChipText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#64748b",
    textTransform: "uppercase",
  },
  preview: { fontSize: 12, color: "#64748b", lineHeight: 18, marginTop: 8 },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 11 },
  sender: { flexShrink: 1, fontSize: 12, fontWeight: "700", color: "#475569" },
  date: { fontSize: 11, fontWeight: "600", color: "#94a3b8" },

  quickDone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  quickDoneText: { fontSize: 12, fontWeight: "800", color: "#16a34a" },

  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#334155", marginTop: 8 },
  emptyBody: { fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 19 },

  detailRoot: { flex: 1, backgroundColor: "#f8fafc" },
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
  detailMessage: { fontSize: 14, color: "#334155", lineHeight: 21 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 24,
    marginBottom: 9,
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  contactBtnText: { flexShrink: 1, fontSize: 13, fontWeight: "700", color: "#334155" },

  statusPicker: { gap: 10 },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statusOptionOn: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  statusOptionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "capitalize",
  },
  statusOptionTextOn: { color: "#f97316" },
});
