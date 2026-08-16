import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Toast from "react-native-toast-message";
import { Star, MessageSquare, Globe, EyeOff, Store } from "lucide-react-native";

import { getAllFeedback, setFeedbackPublished } from "../../API/adminApi";
import { SkeletonBlock } from "../Skeleton";
import SectionError from "../SectionError";

const FILTERS: { id: "all" | "published" | "unpublished"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "published", label: "On home page" },
  { id: "unpublished", label: "Not shown" },
];

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const Stars = ({ rating }: { rating: number }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={13}
        color={n <= rating ? "#f59e0b" : "#e2e8f0"}
        fill={n <= rating ? "#f59e0b" : "transparent"}
      />
    ))}
  </View>
);

const AdminFeedbackManager = () => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<"all" | "published" | "unpublished">("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setLoadError(false);
      // Fetched unfiltered: the pill counts have to reflect every response,
      // and re-requesting per pill would stall on the network for data the
      // device already holds.
      const res = await getAllFeedback();
      setFeedback(res?.data?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load feedback" });
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
      all: feedback.length,
      published: feedback.filter((f) => f.isPublished).length,
      unpublished: feedback.filter((f) => !f.isPublished).length,
    }),
    [feedback],
  );

  const visible =
    filter === "all"
      ? feedback
      : feedback.filter((f) => (filter === "published" ? f.isPublished : !f.isPublished));

  const togglePublish = async (item: any) => {
    const next = !item.isPublished;
    setSavingId(item._id);
    // Optimistic: the admin is looking at the row they just tapped, and a
    // round trip before the badge moves reads as an unresponsive control.
    setFeedback((prev) =>
      prev.map((f) => (f._id === item._id ? { ...f, isPublished: next } : f)),
    );
    try {
      await setFeedbackPublished(item._id, next);
      Toast.show({
        type: "success",
        text1: next ? "Published to the home page" : "Removed from the home page",
      });
    } catch (error: any) {
      setFeedback((prev) =>
        prev.map((f) => (f._id === item._id ? { ...f, isPublished: !next } : f)),
      );
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Could not update this feedback",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.card}>
              <SkeletonBlock width="35%" height={13} borderRadius={6} />
              <SkeletonBlock width="90%" height={12} borderRadius={6} style={styles.gap8} />
              <SkeletonBlock width="60%" height={12} borderRadius={6} style={styles.gap8} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (loadError && feedback.length === 0) {
    return (
      <View style={styles.container}>
        <SectionError message="Failed to load feedback." onRetry={() => load()} />
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
            <Text style={styles.emptyTitle}>
              {filter === "all" ? "No feedback yet" : "Nothing in this view"}
            </Text>
            <Text style={styles.emptyBody}>
              Customers are asked how the ordering felt right after they pay.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.isPublished && styles.cardPublished]}>
            <View style={styles.cardTop}>
              <Stars rating={item.rating} />
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>

            {/* The message is optional - everything except the rating is, so
                that a leaving customer is never blocked from submitting. */}
            {item.message ? (
              <Text style={styles.message}>{item.message}</Text>
            ) : (
              <Text style={styles.noMessage}>Rating only - no comment left.</Text>
            )}

            <View style={styles.metaRow}>
              <Text style={styles.author}>{item.name || "Anonymous"}</Text>
              {!!item.restaurant?.restaurantName && (
                <>
                  <Store size={11} color="#cbd5e1" />
                  <Text style={styles.venue} numberOfLines={1}>
                    {item.restaurant.restaurantName}
                  </Text>
                </>
              )}
            </View>

            {/* Publishing puts a stranger's words on the marketing site, so
                the control says exactly what it will do rather than being a
                bare switch. A rating with no message is allowed but rarely
                worth showing - the label makes that visible before tapping. */}
            <TouchableOpacity
              style={[styles.publishBtn, item.isPublished && styles.publishBtnOn]}
              onPress={() => togglePublish(item)}
              disabled={savingId === item._id}
              activeOpacity={0.8}
            >
              {savingId === item._id ? (
                <ActivityIndicator size="small" color={item.isPublished ? "#16a34a" : "#64748b"} />
              ) : (
                <>
                  {item.isPublished ? (
                    <Globe size={13} color="#16a34a" />
                  ) : (
                    <EyeOff size={13} color="#64748b" />
                  )}
                  <Text
                    style={[styles.publishText, item.isPublished && styles.publishTextOn]}
                  >
                    {item.isPublished ? "Showing on home page" : "Show on home page"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

export default AdminFeedbackManager;

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
  cardPublished: { borderColor: "#bbf7d0", backgroundColor: "#fbfffc" },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  starRow: { flexDirection: "row", gap: 2 },
  date: { fontSize: 11, fontWeight: "600", color: "#94a3b8" },
  message: { fontSize: 13, color: "#334155", lineHeight: 19, marginTop: 10 },
  noMessage: { fontSize: 12, color: "#94a3b8", fontStyle: "italic", marginTop: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  author: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  venue: { flexShrink: 1, fontSize: 11, fontWeight: "600", color: "#94a3b8" },

  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 13,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  publishBtnOn: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  publishText: { fontSize: 12, fontWeight: "800", color: "#64748b" },
  publishTextOn: { color: "#16a34a" },

  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#334155", marginTop: 8 },
  emptyBody: { fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 19 },
});
