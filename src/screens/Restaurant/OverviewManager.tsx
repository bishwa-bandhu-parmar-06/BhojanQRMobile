import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import Toast from "react-native-toast-message";
import LinearGradient from "react-native-linear-gradient";
import { LineChart } from "react-native-chart-kit";
import {
  UtensilsCrossed,
  ShoppingBag,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Trophy,
  Maximize2,
  LayoutGrid,
  Sparkles,
  Users,
  History,
  ChevronRight,
  QrCode,
  User,
} from "lucide-react-native";

import { getDashboardStats } from "../../API/restaurentApi";
import { formatMoney } from "../../utils/money";
import SalesReportPanel from "./SalesReportPanel";
import { SkeletonBlock } from "../../components/Skeleton";
import SectionError from "../../components/SectionError";
import TopSellingItemsScreen from "../../components/Restaurant/TopSellingItemsScreen";

interface DayRevenue {
  name: string;
  revenue: number;
}

interface SoldItem {
  _id: string;
  totalQuantity: number;
  revenue: number;
}

type OverviewManagerProps = {
  // Supplied by the dashboard, which owns `activeTab`. Overview cannot
  // navigate on its own - it is a panel inside the dashboard, not a screen in
  // the navigator - so tapping a card asks the parent to switch section.
  onNavigate?: (tabId: string) => void;
  // Same access rule the dashboard applies to its own tabs. Without it a
  // staff account would see tiles whose taps silently do nothing - the
  // dashboard's onNavigate gate refuses the switch but the tile stays.
  canOpenTab?: (tabId: string) => boolean;
};

// Indian-unit compact money for tight spots (chart labels, hero sub-stats)
// where "₹12,34,567.89" would overflow: 1.2k, 3.4L, 1.1Cr. Full precision
// stays available where there is room, via formatMoney.
const compactINR = (value: number): string => {
  const n = Number(value) || 0;
  const fmt = (v: number, suffix: string) =>
    `${v.toFixed(1).replace(/\.0$/, "")}${suffix}`;
  if (n >= 10000000) return fmt(n / 10000000, "Cr");
  if (n >= 100000) return fmt(n / 100000, "L");
  if (n >= 1000) return fmt(n / 1000, "k");
  return formatMoney(n);
};

// One quick-access tile in the 2-column "Manage" grid: icon + headline
// number, then the section name it opens full-screen (the dashboard swaps
// its active panel). `value` is optional so the load-error branch can keep
// the navigation without printing counts it does not actually have.
const ManageTile = ({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  hint,
  onPress,
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string | number;
  hint?: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    style={styles.manageTile}
    onPress={onPress}
    activeOpacity={onPress ? 0.75 : 1}
    disabled={!onPress}
    accessibilityRole="button"
    accessibilityLabel={value !== undefined ? `${label}: ${value}` : label}
  >
    <View style={styles.manageTileTop}>
      <View style={[styles.manageTileIcon, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} />
      </View>
      {value !== undefined && <Text style={styles.manageTileValue}>{value}</Text>}
    </View>
    <Text style={styles.manageTileLabel} numberOfLines={1}>
      {label}
    </Text>
    {!!hint && (
      <Text style={styles.manageTileHint} numberOfLines={1}>
        {hint}
      </Text>
    )}
  </TouchableOpacity>
);

const OverviewManager = ({ onNavigate, canOpenTab }: OverviewManagerProps) => {
  const [stats, setStats] = useState({
    totalMenuItems: 0,
    activeMenuItems: 0,
    totalStaff: 0,
    staffByRole: [] as { role: string; count: number }[],
    totalOffers: 0,
    activeOffers: 0,
    activeTables: 0,
    totalQRCodes: 0,
    completedOrders: 0,
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
  // The full-screen "every item ever sold" drill-in behind the top-five card.
  const [showAllSold, setShowAllSold] = useState(false);
  // Chart width = screen minus the screen padding (16*2) and card padding
  // (16*2); chart-kit needs an absolute pixel width up front.
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = windowWidth - 64;

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
            totalStaff: response.data.data?.staffStats?.totalStaff ?? 0,
            staffByRole: response.data.data?.staffStats?.byRole ?? [],
            totalOffers: response.data.data?.offerStats?.totalOffers ?? 0,
            activeOffers: response.data.data?.offerStats?.activeOffers ?? 0,
            activeTables: response.data.data?.tableStats?.activeTables ?? 0,
            // Older cached dashboard payloads predate qrStats, so default 0
            // until the hourly cache rolls over.
            totalQRCodes: response.data.data?.qrStats?.totalQRCodes ?? 0,
            completedOrders: response.data.data?.historyStats?.completedOrders ?? 0,
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

  // No canOpenTab prop (e.g. an older caller) keeps every tile visible -
  // the dashboard's own gate still refuses a switch it should not allow.
  const showTab = (tabId: string) => (canOpenTab ? canOpenTab(tabId) : true);
  const openTab = (tabId: string) =>
    onNavigate ? () => onNavigate(tabId) : undefined;

  // The "Manage" grid, rendered on both the normal screen and (without
  // counts) the load-error screen. Defined once so the two can never drift.
  const renderManageGrid = (withValues: boolean) => (
    <View style={styles.manageGrid}>
      {showTab("active_tables") && (
        <ManageTile
          icon={LayoutGrid}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          label="Active Tables"
          value={withValues ? stats.activeTables : undefined}
          hint="Dining right now"
          onPress={openTab("active_tables")}
        />
      )}
      {showTab("marketing") && (
        <ManageTile
          icon={Sparkles}
          iconBg="#fef3c7"
          iconColor="#d97706"
          label="Happy Hours"
          value={withValues ? stats.activeOffers : undefined}
          // Two numbers matter here and they differ: how many offers are
          // switched on now, out of how many exist at all.
          hint={withValues ? `${stats.activeOffers} active of ${stats.totalOffers}` : "Offers & discounts"}
          onPress={openTab("marketing")}
        />
      )}
      {showTab("qr") && (
        <ManageTile
          icon={QrCode}
          iconBg="#eef2ff"
          iconColor="#4f46e5"
          label="Table QR Codes"
          value={withValues ? stats.totalQRCodes : undefined}
          hint="Saved table codes"
          onPress={openTab("qr")}
        />
      )}
      {showTab("staff") && (
        <ManageTile
          icon={Users}
          iconBg="#f5f3ff"
          iconColor="#7c3aed"
          label="Staff"
          value={withValues ? stats.totalStaff : undefined}
          // The role split is what an owner actually reads - "4 staff" says
          // far less than "2 waiters, 1 chef, 1 manager".
          hint={
            withValues && stats.staffByRole.length > 0
              ? stats.staffByRole
                  .map((r) => `${r.count} ${r.role.toLowerCase()}`)
                  .join(" · ")
              : "Team & permissions"
          }
          onPress={openTab("staff")}
        />
      )}
      {showTab("order_history") && (
        <ManageTile
          icon={History}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
          label="Order History"
          value={withValues ? stats.completedOrders : undefined}
          hint="All past orders"
          onPress={openTab("order_history")}
        />
      )}
      {showTab("profile") && (
        <ManageTile
          icon={User}
          iconBg="#f9fafb"
          iconColor="#6b7280"
          label="Profile Details"
          hint="Info, documents & login"
          onPress={openTab("profile")}
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <SkeletonBlock height={168} borderRadius={20} style={{ marginBottom: 14 }} />
        <SkeletonBlock height={190} borderRadius={18} style={{ marginBottom: 14 }} />
        <View style={styles.statPairRow}>
          <SkeletonBlock height={84} borderRadius={18} style={{ flex: 1 }} />
          <SkeletonBlock height={84} borderRadius={18} style={{ flex: 1 }} />
        </View>
        <SkeletonBlock height={100} borderRadius={18} style={{ marginBottom: 14 }} />
        <View style={styles.manageGrid}>
          <SkeletonBlock height={104} borderRadius={18} style={styles.manageSkeleton} />
          <SkeletonBlock height={104} borderRadius={18} style={styles.manageSkeleton} />
          <SkeletonBlock height={104} borderRadius={18} style={styles.manageSkeleton} />
          <SkeletonBlock height={104} borderRadius={18} style={styles.manageSkeleton} />
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
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <SectionError message="Failed to load dashboard statistics." onRetry={fetchStats} />

        {/* Stats failed to load, so the tiles keep working as plain
            navigation - minus the counts, which would all be lying
            zeros here. */}
        <Text style={styles.sectionHeading}>Manage</Text>
        {renderManageGrid(false)}
      </ScrollView>
    );
  }

  const weekTotal = weeklyChartData.reduce((sum, d) => sum + d.revenue, 0);
  const todayIdx = weeklyChartData.length - 1;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* ─── Revenue hero ─────────────────────────────────────────────
          Today's figure is the one an owner checks first, several times a
          day - it gets the spotlight. Month and year ride along as
          secondary columns instead of three equal-weight boxes. */}
      <LinearGradient
        colors={["#fb923c", "#ea580c", "#c2410c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1.2, y: 1.2 }}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <CalendarDays size={13} color="#ffedd5" />
          <Text style={styles.heroBadgeText}>Today's Revenue</Text>
        </View>
        <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
          ₹{formatMoney(stats.todaysRevenue)}
        </Text>
        <View style={styles.heroDivider} />
        <View style={styles.heroSubRow}>
          <View style={styles.heroSubCol}>
            <Text style={styles.heroSubLabel}>This Month</Text>
            <Text style={styles.heroSubValue}>₹{compactINR(stats.thisMonthRevenue)}</Text>
          </View>
          <View style={styles.heroSubDivider} />
          <View style={styles.heroSubCol}>
            <Text style={styles.heroSubLabel}>This Year</Text>
            <Text style={styles.heroSubValue}>₹{compactINR(stats.thisYearRevenue)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ─── 7-day chart ────────────────────────────────────────────── */}
      {weeklyChartData.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Last 7 Days</Text>
            <View style={styles.chartTotalPill}>
              <TrendingUp size={12} color="#ea580c" />
              <Text style={styles.chartTotalText}>₹{compactINR(weekTotal)}</Text>
            </View>
          </View>
          {/* Smooth revenue curve with a soft orange area fill - the same
              7 numbers the old bar row showed, but the shape of the week
              (up, down, flat) is readable at a glance. */}
          <LineChart
            data={{
              labels: weeklyChartData.map((d, i) => (i === todayIdx ? "Today" : d.name)),
              datasets: [{ data: weeklyChartData.map((d) => d.revenue) }],
            }}
            width={chartWidth}
            height={190}
            bezier
            fromZero
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLines={false}
            segments={3}
            formatYLabel={(v) => `₹${compactINR(Number(v))}`}
            chartConfig={{
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(234, 88, 12, ${opacity})`,
              labelColor: () => "#94a3b8",
              fillShadowGradientFrom: "#fb923c",
              fillShadowGradientFromOpacity: 0.35,
              fillShadowGradientTo: "#ffffff",
              fillShadowGradientToOpacity: 0.02,
              strokeWidth: 3,
              propsForDots: { r: "4", strokeWidth: "2", stroke: "#ea580c", fill: "#ffffff" },
              propsForLabels: { fontSize: 10, fontWeight: "700" },
            }}
            style={styles.lineChart}
          />
        </View>
      )}

      {/* ─── All-time pair: orders & revenue ────────────────────────── */}
      <View style={styles.statPairRow}>
        <View style={styles.statPairCard}>
          <View style={[styles.statPairIcon, { backgroundColor: "#eff6ff" }]}>
            <ShoppingBag size={18} color="#3b82f6" />
          </View>
          <View style={styles.statPairText}>
            <Text style={styles.statPairValue}>{stats.totalOrders}</Text>
            <Text style={styles.statPairLabel}>Total Orders</Text>
          </View>
        </View>
        <View style={styles.statPairCard}>
          <View style={[styles.statPairIcon, { backgroundColor: "#ecfdf5" }]}>
            <IndianRupee size={18} color="#059669" />
          </View>
          <View style={styles.statPairText}>
            <Text style={styles.statPairValue} numberOfLines={1} adjustsFontSizeToFit>
              ₹{compactINR(stats.totalRevenue)}
            </Text>
            <Text style={styles.statPairLabel}>Lifetime Revenue</Text>
          </View>
        </View>
      </View>

      {/* ─── Menu snapshot ──────────────────────────────────────────────
          Three numbers, one card - they describe the same thing, so three
          separate full-width cards was hierarchy noise. The whole card
          opens Manage Menu. */}
      <TouchableOpacity
        style={styles.menuCard}
        onPress={() => onNavigate?.("menu")}
        activeOpacity={onNavigate ? 0.75 : 1}
        disabled={!onNavigate}
        accessibilityRole="button"
      >
        <View style={styles.menuCardHeader}>
          <View style={[styles.statPairIcon, { backgroundColor: "#fff7ed" }]}>
            <UtensilsCrossed size={18} color="#ea580c" />
          </View>
          <Text style={styles.menuCardTitle}>Your Menu</Text>
          {!!onNavigate && <ChevronRight size={18} color="#d1d5db" />}
        </View>
        <View style={styles.menuStatsRow}>
          <View style={styles.menuStatCol}>
            <Text style={styles.menuStatValue}>{stats.totalMenuItems}</Text>
            <Text style={styles.menuStatLabel}>Items</Text>
          </View>
          <View style={styles.menuStatDivider} />
          <View style={styles.menuStatCol}>
            <Text style={[styles.menuStatValue, styles.menuStatValueOk]}>{stats.activeMenuItems}</Text>
            <Text style={styles.menuStatLabel}>Available</Text>
          </View>
          <View style={styles.menuStatDivider} />
          <View style={styles.menuStatCol}>
            <Text style={[styles.menuStatValue, stats.outOfStockItems > 0 && styles.menuStatValueBad]}>
              {stats.outOfStockItems}
            </Text>
            <Text style={styles.menuStatLabel}>Out of Stock</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ─── Manage: sections an owner can jump straight into ──────────
          Each tile is the headline number for a screen, and tapping it
          opens that screen full-size. Tiles for sections this account
          cannot open are hidden, not rendered inert. */}
      <Text style={styles.sectionHeading}>Manage</Text>
      {renderManageGrid(true)}

      {/* ─── Insights ───────────────────────────────────────────────── */}
      {(bestSellingItem || worstSellingItem || topSellingItems.length > 0) && (
        <Text style={styles.sectionHeading}>Insights</Text>
      )}

      {(bestSellingItem || worstSellingItem) && (
        <View style={styles.calloutRow}>
          {bestSellingItem && (
            <View style={[styles.calloutCard, styles.calloutCardGood]}>
              <View style={styles.calloutTopRow}>
                <TrendingUp size={16} color="#16a34a" />
                <Text style={[styles.calloutLabel, styles.calloutLabelGood]}>Best Seller</Text>
              </View>
              <Text style={styles.calloutItemName} numberOfLines={1}>{bestSellingItem._id}</Text>
              <Text style={styles.calloutSub}>{bestSellingItem.totalQuantity} sold · ₹{compactINR(bestSellingItem.revenue)}</Text>
            </View>
          )}
          {worstSellingItem && worstSellingItem._id !== bestSellingItem?._id && (
            <View style={[styles.calloutCard, styles.calloutCardBad]}>
              <View style={styles.calloutTopRow}>
                <TrendingDown size={16} color="#ef4444" />
                <Text style={[styles.calloutLabel, styles.calloutLabelBad]}>Needs a Push</Text>
              </View>
              <Text style={styles.calloutItemName} numberOfLines={1}>{worstSellingItem._id}</Text>
              <Text style={styles.calloutSub}>{worstSellingItem.totalQuantity} sold · ₹{compactINR(worstSellingItem.revenue)}</Text>
            </View>
          )}
        </View>
      )}

      {topSellingItems.length > 0 && (
        <View style={styles.topItemsCard}>
          <View style={styles.topItemsHeader}>
            <Trophy size={16} color="#ea580c" />
            <Text style={styles.sectionTitle}>Top Selling Items</Text>
            {/* The card is a top five by design - it has to stay scannable
                next to everything else on this screen. This is the way to the
                rest of the list, and to the export. */}
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={() => setShowAllSold(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="See all sold items"
            >
              <Maximize2 size={15} color="#ea580c" />
            </TouchableOpacity>
          </View>
          {topSellingItems.map((item, idx) => {
            const share = topSellingItems[0].totalQuantity > 0
              ? item.totalQuantity / topSellingItems[0].totalQuantity
              : 0;
            return (
              <View key={item._id} style={styles.topItemRow}>
                <View style={[styles.topItemRank, idx === 0 && styles.topItemRankFirst]}>
                  <Text style={[styles.topItemRankText, idx === 0 && styles.topItemRankTextFirst]}>{idx + 1}</Text>
                </View>
                <View style={styles.topItemBody}>
                  <View style={styles.topItemNameRow}>
                    <Text style={styles.topItemName} numberOfLines={1}>{item._id}</Text>
                    <Text style={styles.topItemQty}>{item.totalQuantity}×</Text>
                    <Text style={styles.topItemRevenue}>₹{compactINR(item.revenue)}</Text>
                  </View>
                  {/* A quantity bar makes the ranking legible at a glance -
                      "how far ahead is #1" is the question this list answers. */}
                  <View style={styles.topItemBarTrack}>
                    <View style={[styles.topItemBarFill, { width: `${Math.max(4, share * 100)}%` }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <SalesReportPanel />

      <TopSellingItemsScreen visible={showAllSold} onClose={() => setShowAllSold(false)} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  // Section headings between card groups
  sectionHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
  },

  // Revenue hero
  hero: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffedd5",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroValue: {
    fontSize: 38,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginVertical: 14,
  },
  heroSubRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroSubCol: {
    flex: 1,
    gap: 2,
  },
  heroSubDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginHorizontal: 14,
  },
  heroSubLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fed7aa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroSubValue: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
  },

  // Chart
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  chartTotalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff7ed",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  chartTotalText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ea580c",
  },
  lineChart: {
    // chart-kit reserves a wide gutter for y-labels; pulling it left keeps
    // the plot visually centred inside the card.
    marginLeft: -14,
    borderRadius: 16,
  },

  // All-time orders / revenue pair
  statPairRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  statPairCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statPairIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statPairText: {
    flex: 1,
  },
  statPairValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
  },
  statPairLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    marginTop: 1,
  },

  // Menu snapshot
  menuCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  menuCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
  },
  menuStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuStatCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  menuStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#f1f5f9",
  },
  menuStatValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
  },
  menuStatValueOk: {
    color: "#16a34a",
  },
  menuStatValueBad: {
    color: "#ef4444",
  },
  menuStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },

  // Manage grid
  manageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  manageSkeleton: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  manageTile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  manageTileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  manageTileIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  manageTileValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
  },
  manageTileLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1e293b",
  },
  manageTileHint: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 2,
  },

  // Best/worst callouts
  calloutRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  calloutCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  calloutCardGood: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  calloutCardBad: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  calloutTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calloutLabel: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  calloutLabelGood: {
    color: "#16a34a",
  },
  calloutLabelBad: {
    color: "#ef4444",
  },
  calloutItemName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
  },
  calloutSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },

  // Top selling items
  topItemsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topItemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  // Pushes the expand button to the far right of the header row.
  expandBtn: {
    marginLeft: "auto",
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    padding: 7,
    borderRadius: 9,
  },
  topItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  topItemRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  topItemRankFirst: {
    backgroundColor: "#ea580c",
  },
  topItemRankText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
  },
  topItemRankTextFirst: {
    color: "#ffffff",
  },
  topItemBody: {
    flex: 1,
    gap: 6,
  },
  topItemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  topItemQty: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },
  topItemRevenue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#059669",
    minWidth: 56,
    textAlign: "right",
  },
  topItemBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
  },
  topItemBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#fb923c",
  },
});

export default OverviewManager;
