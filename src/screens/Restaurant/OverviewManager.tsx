import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import Toast from "react-native-toast-message";
import {
  UtensilsCrossed,
  ShoppingBag,
  IndianRupee,
  AlertCircle,
  TrendingUp,
} from "lucide-react-native";

import { getDashboardStats } from "../../API/restaurentApi";

const OverviewManager = () => {
  const [stats, setStats] = useState({
    totalMenuItems: 0,
    activeMenuItems: 0,
    outOfStockItems: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getDashboardStats();
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load dashboard statistics",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard Overview</Text>
        <Text style={styles.subtitle}>
          A quick glance at your restaurant's performance and menu status.
        </Text>
      </View>

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
  grid: {
    flexDirection: "column",
    gap: 16, // spacing between cards
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
});

export default OverviewManager;