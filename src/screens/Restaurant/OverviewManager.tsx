import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import Toast from "react-native-toast-message";
import {
  UtensilsCrossed,
  ShoppingBag,
  IndianRupee,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  CalendarRange,
  Trophy,
} from "lucide-react-native";

import { getDashboardStats } from "../../API/restaurentApi";
import SalesReportPanel from "./SalesReportPanel";
import { SkeletonBlock } from "../../components/Skeleton";
import SectionError from "../../components/SectionError";

interface DayRevenue {
  name: string;
  revenue: number;
}

interface SoldItem {
  _id: string;
  totalQuantity: number;
  revenue: number;
}

const OverviewManager = () => {
  const [stats, setStats] = useState({
    totalMenuItems: 0,
    activeMenuItems: 0,
    outOfStockItems: 0,
    totalOrders: 0,
    totalRevenue: 0,
    todaysRevenue: 0,
    thisMonthRevenue: 0,
    thisYearRevenue: 0,
  });
  const [weeklyChartData, setWeeklyChartData] = useState<DayRevenue[]>([]);
  const [topSellingItems, setTopSellingItems] = useState<SoldItem[]>([]);
  const [bestSellingItem, setBestSellingItem] = useState<SoldItem | null>(null);
  const [worstSellingItem, setWorstSellingItem] = useState<SoldItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchStats = async () => {
      try {
        setLoadError(false);
        const response = await getDashboardStats(true);
        if (response.data.success) {
          // Backend returns a nested shape (menuStats/revenueStats/...), not
          // the flat one this screen used to render - see restaurantController.js's
          // getDashboardStats finalResponseData.
          const { menuStats, revenueStats, weeklyChartData: weekly, topSellingItems: topItems, bestSellingItem: best, worstSellingItem: worst } =
            response.data.data;
          setStats({
            totalMenuItems: menuStats?.totalMenuItems ?? 0,
            activeMenuItems: menuStats?.activeMenuItems ?? 0,
            outOfStockItems: menuStats?.outOfStockItems ?? 0,
            totalOrders: revenueStats?.totalOrders ?? 0,
            totalRevenue: revenueStats?.totalRevenue ?? 0,
            todaysRevenue: revenueStats?.todaysRevenue ?? 0,
            thisMonthRevenue: revenueStats?.thisMonthRevenue ?? 0,
            thisYearRevenue: revenueStats?.thisYearRevenue ?? 0,
          });
          setWeeklyChartData(weekly || []);
          setTopSellingItems(topItems || []);
          setBestSellingItem(best || null);
          setWorstSellingItem(worst || null);
        }
      } catch {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load dashboard statistics",
        });
        setLoadError(true);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <SkeletonBlock width="60%" height={28} borderRadius={6} />
          <SkeletonBlock width="80%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
        </View>

        <View style={styles.revenueRow}>
          <SkeletonBlock height={70} borderRadius={14} style={{ flex: 1 }} />
          <SkeletonBlock height={70} borderRadius={14} style={{ flex: 1 }} />
          <SkeletonBlock height={70} borderRadius={14} style={{ flex: 1 }} />
        </View>

        <SkeletonBlock height={180} borderRadius={16} style={{ marginBottom: 16 }} />

        <View style={styles.grid}>
          <SkeletonBlock height={88} borderRadius={16} />
          <SkeletonBlock height={88} borderRadius={16} />
          <SkeletonBlock height={88} borderRadius={16} />
        </View>
      </ScrollView>
    );
  }

  if (
    loadError &&
    stats.totalMenuItems === 0 &&
    stats.totalOrders === 0 &&
    stats.totalRevenue === 0 &&
    weeklyChartData.length === 0
  ) {
    return (
      <View style={styles.container}>
        <SectionError message="Failed to load dashboard statistics." onRetry={fetchStats} />
      </View>
    );
  }

  const maxRevenue = Math.max(1, ...weeklyChartData.map((d) => d.revenue));

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* Revenue Breakdown Row */}
      <View style={styles.revenueRow}>
        <View style={[styles.revenueCard, { backgroundColor: "#fff7ed" }]}>
          <CalendarDays size={16} color="#ea580c" />
          <Text style={styles.revenueLabel}>Today</Text>
          <Text style={styles.revenueValue}>₹{(stats.todaysRevenue || 0).toLocaleString()}</Text>
        </View>
        <View style={[styles.revenueCard, { backgroundColor: "#eff6ff" }]}>
          <CalendarRange size={16} color="#3b82f6" />
          <Text style={styles.revenueLabel}>This Month</Text>
          <Text style={styles.revenueValue}>₹{(stats.thisMonthRevenue || 0).toLocaleString()}</Text>
        </View>
        <View style={[styles.revenueCard, { backgroundColor: "#ecfdf5" }]}>
          <TrendingUp size={16} color="#059669" />
          <Text style={styles.revenueLabel}>This Year</Text>
          <Text style={styles.revenueValue}>₹{(stats.thisYearRevenue || 0).toLocaleString()}</Text>
        </View>
      </View>

      {/* 7-Day Revenue Chart */}
      {weeklyChartData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          <View style={styles.chartRow}>
            {weeklyChartData.map((day, idx) => (
              <View key={idx} style={styles.barColumn}>
                <Text style={styles.barValue}>
                  {day.revenue > 0 ? `₹${Math.round(day.revenue)}` : ""}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max(4, (day.revenue / maxRevenue) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{day.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Stats Container (Flex Wrap behaves like a Grid) */}
      <View style={styles.grid}>

        {/* Menu Items Card */}
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#fff7ed" }]}>
            <UtensilsCrossed size={28} color="#ea580c" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardLabel}>Total Menu Items</Text>
            <Text style={styles.cardValue}>{stats.totalMenuItems}</Text>
          </View>
        </View>

        {/* Active Items Card */}
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#f0fdf4" }]}>
            <TrendingUp size={28} color="#16a34a" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardLabel}>Active / Available</Text>
            <Text style={styles.cardValue}>{stats.activeMenuItems}</Text>
          </View>
        </View>

        {/* Out of Stock Card */}
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#fef2f2" }]}>
            <AlertCircle size={28} color="#ef4444" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardLabel}>Out of Stock</Text>
            <Text style={styles.cardValue}>{stats.outOfStockItems}</Text>
          </View>
        </View>

        {/* Orders Card */}
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#eff6ff" }]}>
            <ShoppingBag size={28} color="#3b82f6" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardLabel}>Total Orders</Text>
            <Text style={styles.cardValue}>{stats.totalOrders}</Text>
          </View>
        </View>

        {/* Revenue Card */}
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#ecfdf5" }]}>
            <IndianRupee size={28} color="#059669" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardLabel}>Total Revenue</Text>
            <Text style={styles.cardValue}>
              ₹{stats.totalRevenue.toLocaleString()}
            </Text>
          </View>
        </View>

      </View>

      {/* Best / Worst Seller Callouts */}
      {(bestSellingItem || worstSellingItem) && (
        <View style={styles.calloutRow}>
          {bestSellingItem && (
            <View style={[styles.calloutCard, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
              <TrendingUp size={18} color="#16a34a" />
              <Text style={styles.calloutLabel}>Best Seller</Text>
              <Text style={styles.calloutItemName} numberOfLines={1}>{bestSellingItem._id}</Text>
              <Text style={styles.calloutSub}>{bestSellingItem.totalQuantity} sold · ₹{Math.round(bestSellingItem.revenue).toLocaleString()}</Text>
            </View>
          )}
          {worstSellingItem && worstSellingItem._id !== bestSellingItem?._id && (
            <View style={[styles.calloutCard, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
              <TrendingDown size={18} color="#ef4444" />
              <Text style={styles.calloutLabel}>Needs a Push</Text>
              <Text style={styles.calloutItemName} numberOfLines={1}>{worstSellingItem._id}</Text>
              <Text style={styles.calloutSub}>{worstSellingItem.totalQuantity} sold · ₹{Math.round(worstSellingItem.revenue).toLocaleString()}</Text>
            </View>
          )}
        </View>
      )}

      {/* Top 5 Selling Items */}
      {topSellingItems.length > 0 && (
        <View style={styles.topItemsCard}>
          <View style={styles.topItemsHeader}>
            <Trophy size={18} color="#ea580c" />
            <Text style={styles.sectionTitle}>Top Selling Items</Text>
          </View>
          {topSellingItems.map((item, idx) => (
            <View key={item._id} style={styles.topItemRow}>
              <View style={styles.topItemRank}>
                <Text style={styles.topItemRankText}>{idx + 1}</Text>
              </View>
              <Text style={styles.topItemName} numberOfLines={1}>{item._id}</Text>
              <Text style={styles.topItemQty}>{item.totalQuantity}×</Text>
              <Text style={styles.topItemRevenue}>₹{Math.round(item.revenue).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      <SalesReportPanel />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "900", // extabold/black approximation
    color: "#111827", // gray-900
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280", // gray-500
    marginTop: 4,
    fontWeight: "500",
  },

  // Revenue breakdown row
  revenueRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  revenueCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  revenueLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1f2937",
  },

  // Chart
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 12,
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  barValue: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9ca3af",
    marginBottom: 4,
  },
  barTrack: {
    width: 18,
    height: 90,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    backgroundColor: "#ea580c",
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6b7280",
    marginTop: 6,
  },

  grid: {
    flexDirection: "column",
    gap: 16, // spacing between cards
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f3f4f6", // border-gray-100
    // Shadows
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 56, // w-14
    height: 56, // h-14
    borderRadius: 16, // rounded-2xl
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20, // gap-5 equivalent
  },
  textContainer: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12, // text-sm
    fontWeight: "bold",
    color: "#6b7280", // text-gray-500
    textTransform: "uppercase",
    letterSpacing: 0.5, // tracking-wider
    marginBottom: 4, // mb-1
  },
  cardValue: {
    fontSize: 28, // text-3xl
    fontWeight: "900", // font-black
    color: "#1f2937", // text-gray-800
  },

  // Best/worst callouts
  calloutRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  calloutCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 2,
  },
  calloutLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
    marginTop: 6,
  },
  calloutItemName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2937",
  },
  calloutSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },

  // Top selling items
  topItemsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  topItemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  topItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f9fafb",
    gap: 10,
  },
  topItemRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  topItemRankText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ea580c",
  },
  topItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
  },
  topItemQty: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  topItemRevenue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#059669",
  },
});

export default OverviewManager;
