import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import Toast from "react-native-toast-message";
import {
  Store,
  IndianRupee,
  ShoppingBag,
  Mail,
  LifeBuoy,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react-native";

import { getAdminOverview } from "../../API/adminApi";
import { SkeletonBlock } from "../Skeleton";
import SectionError from "../SectionError";
import { formatMoney } from "../../utils/money";

// Compact money for tiles: a platform total runs to lakhs, and the full digits
// would wrap a tile that has to sit beside two others.
const compactMoney = (value: number) => {
  const n = Number(value) || 0;
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return formatMoney(n);
};

const AdminOverviewManager = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setLoadError(false);
      const res = await getAdminOverview();
      setData(res?.data?.data || null);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load platform overview" });
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.tileRow}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.tile}>
                <SkeletonBlock width="60%" height={11} borderRadius={5} />
                <SkeletonBlock width="80%" height={20} borderRadius={6} style={styles.skeletonGap} />
              </View>
            ))}
          </View>
          {[1, 2].map((i) => (
            <View key={i} style={[styles.card, styles.skeletonCard]}>
              <SkeletonBlock width="40%" height={13} borderRadius={6} />
              <SkeletonBlock width="90%" height={12} borderRadius={6} />
              <SkeletonBlock width="70%" height={12} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (loadError && !data) {
    return (
      <View style={styles.container}>
        <SectionError message="Failed to load platform overview." onRetry={() => load()} />
      </View>
    );
  }

  const counts = data?.restaurantCounts || {};
  const revenue = data?.revenue || {};
  const trend: any[] = data?.revenueTrend || [];
  const peak = Math.max(1, ...trend.map((d) => Number(d.revenue) || 0));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#f97316"]} />
      }
    >
      {/* Revenue across the three windows an operator actually compares. */}
      <View style={styles.tileRow}>
        <View style={[styles.tile, styles.tileAmber]}>
          <Text style={styles.tileLabel}>TODAY</Text>
          <Text style={styles.tileValue}>₹{compactMoney(revenue.todaysRevenue)}</Text>
        </View>
        <View style={[styles.tile, styles.tileBlue]}>
          <Text style={styles.tileLabel}>THIS MONTH</Text>
          <Text style={styles.tileValue}>₹{compactMoney(revenue.thisMonthRevenue)}</Text>
        </View>
        <View style={[styles.tile, styles.tileGreen]}>
          <Text style={styles.tileLabel}>ALL TIME</Text>
          <Text style={styles.tileValue}>₹{compactMoney(revenue.totalRevenue)}</Text>
        </View>
      </View>

      {/* 14-day revenue. Bars rather than a line: the daily figure is what
          matters, and a sparse platform has zero days that a line would
          smooth over and hide. */}
      {trend.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 14 days</Text>
          <View style={styles.chartRow}>
            {trend.map((point, i) => {
              const value = Number(point.revenue) || 0;
              return (
                <View key={i} style={styles.chartCol}>
                  <View style={styles.chartTrack}>
                    <View
                      style={[
                        styles.chartBar,
                        // Floor of 2% so a zero day is still a visible tick
                        // rather than a gap that reads as missing data.
                        { height: `${Math.max(2, (value / peak) * 100)}%` },
                        value === 0 && styles.chartBarEmpty,
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.chartAxis}>
            <Text style={styles.chartAxisText}>{trend[0]?.date}</Text>
            <Text style={styles.chartAxisText}>{trend[trend.length - 1]?.date}</Text>
          </View>
        </View>
      )}

      {/* Restaurant pipeline - the number an admin is here to act on is
          "pending", so it leads. */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Restaurants</Text>
        <View style={styles.statusRow}>
          <StatusPill
            icon={Clock}
            color="#d97706"
            bg="#fffbeb"
            label="Pending"
            value={counts.pending || 0}
          />
          <StatusPill
            icon={CheckCircle2}
            color="#16a34a"
            bg="#f0fdf4"
            label="Approved"
            value={counts.approved || 0}
          />
          <StatusPill
            icon={XCircle}
            color="#dc2626"
            bg="#fef2f2"
            label="Rejected"
            value={counts.rejected || 0}
          />
        </View>
      </View>

      <View style={styles.card}>
        <MetricRow
          icon={Store}
          color="#f97316"
          label="Total restaurants"
          value={data?.totalRestaurants ?? 0}
        />
        <MetricRow
          icon={ShoppingBag}
          color="#2563eb"
          label="Orders placed"
          value={data?.totalOrders ?? 0}
        />
        <MetricRow
          icon={Mail}
          color="#7c3aed"
          label="Newsletter subscribers"
          value={data?.newsletterSubscribers ?? 0}
        />
        <MetricRow
          icon={LifeBuoy}
          color="#dc2626"
          label="Open support tickets"
          value={data?.openTickets ?? 0}
          last
        />
      </View>

      {data?.topRestaurants?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top restaurants by revenue</Text>
          {data.topRestaurants.slice(0, 5).map((r: any, i: number) => (
            <View key={r._id || i} style={styles.listRow}>
              <Text style={styles.listRank}>{i + 1}</Text>
              <Text style={styles.listName} numberOfLines={1}>
                {r.restaurantName || "Unnamed"}
              </Text>
              <View style={styles.listAmountWrap}>
                <IndianRupee size={12} color="#15803d" />
                <Text style={styles.listAmount}>{compactMoney(r.revenue)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {data?.recentSignups?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent signups</Text>
          {data.recentSignups.slice(0, 5).map((r: any, i: number) => (
            <View key={r._id || i} style={styles.listRow}>
              <Text style={styles.listName} numberOfLines={1}>
                {r.restaurantName || "Unnamed"}
              </Text>
              <Text style={styles.listMeta}>
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const StatusPill = ({ icon: Icon, color, bg, label, value }: any) => (
  <View style={[styles.statusPill, { backgroundColor: bg }]}>
    <Icon size={15} color={color} />
    <Text style={[styles.statusValue, { color }]}>{value}</Text>
    <Text style={styles.statusLabel}>{label}</Text>
  </View>
);

const MetricRow = ({ icon: Icon, color, label, value, last }: any) => (
  <View style={[styles.metricRow, !last && styles.metricRowBordered]}>
    <View style={[styles.metricIcon, { backgroundColor: `${color}1a` }]}>
      <Icon size={16} color={color} />
    </View>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

export default AdminOverviewManager;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 32, gap: 14 },

  tileRow: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, borderRadius: 14, padding: 12, minHeight: 74, justifyContent: "center" },
  tileAmber: { backgroundColor: "#fff7ed" },
  tileBlue: { backgroundColor: "#eff6ff" },
  tileGreen: { backgroundColor: "#f0fdf4" },
  tileLabel: { fontSize: 9, fontWeight: "800", color: "#64748b", letterSpacing: 0.5 },
  // adjustsFontSizeToFit is not available on Text inside a flex row reliably,
  // so the compact format above is what keeps these on one line.
  tileValue: { fontSize: 17, fontWeight: "900", color: "#0f172a", marginTop: 6 },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  skeletonGap: { marginTop: 10 },
  skeletonCard: { gap: 10 },
  cardTitle: { fontSize: 13, fontWeight: "800", color: "#0f172a", marginBottom: 12 },

  chartRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 90 },
  chartCol: { flex: 1, height: "100%", justifyContent: "flex-end" },
  chartTrack: { height: "100%", justifyContent: "flex-end" },
  chartBar: { width: "100%", backgroundColor: "#f97316", borderRadius: 3 },
  chartBarEmpty: { backgroundColor: "#e2e8f0" },
  chartAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  chartAxisText: { fontSize: 10, fontWeight: "600", color: "#94a3b8" },

  statusRow: { flexDirection: "row", gap: 10 },
  statusPill: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, gap: 3 },
  statusValue: { fontSize: 19, fontWeight: "900" },
  statusLabel: { fontSize: 10, fontWeight: "700", color: "#64748b" },

  metricRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  metricRowBordered: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  metricLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: "#475569" },
  metricValue: { fontSize: 16, fontWeight: "900", color: "#0f172a" },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  listRank: { fontSize: 12, fontWeight: "900", color: "#f97316", minWidth: 16 },
  listName: { flex: 1, fontSize: 13, fontWeight: "700", color: "#334155" },
  listMeta: { fontSize: 11, fontWeight: "600", color: "#94a3b8" },
  listAmountWrap: { flexDirection: "row", alignItems: "center" },
  listAmount: { fontSize: 13, fontWeight: "800", color: "#15803d" },
});
