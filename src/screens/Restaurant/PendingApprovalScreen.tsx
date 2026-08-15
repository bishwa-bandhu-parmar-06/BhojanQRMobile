import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import {
  Clock,
  Store,
  Mail,
  Phone,
  LogOut,
  ShieldCheck,
  RefreshCw,
} from "lucide-react-native";

import { logoutRestaurant, checkRestaurantStatus } from "../../API/restaurentApi";
import { logout, updateUser } from "../../Features/AuthSlice";

// Mirrors the website's PendingApproval.jsx - same copy, same two actions
// (re-check status / sign out), same fields shown. The website's gate lives
// in ProtectedRoute.jsx; here RestaurentAuth's login handler and
// RestaurantDashboard's profile fetch both redirect here instead.
const PendingApprovalScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);
  const [isChecking, setIsChecking] = useState(false);

  // Every move off this screen is a reset rather than a navigate. This screen
  // is a gate: once an owner is past it (approved) or has dropped out of it
  // (signed out / rejected) it must not remain in the back stack for a
  // gesture to return to.
  const resetTo = useCallback(
    (screen: string) => navigation.reset({ index: 0, routes: [{ name: screen }] }),
    [navigation],
  );

  useEffect(() => {
    if (!user) {
      resetTo("Login/Signup");
    } else if (user.status === "approved") {
      resetTo("RestaurantDashboard");
    }
  }, [user, resetTo]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const res = await checkRestaurantStatus();
      const currentStatus = res.data.status;

      if (currentStatus === "approved") {
        Toast.show({ type: "success", text1: "Congratulations! Your account is approved." });
        dispatch(updateUser({ status: "approved" }));
        resetTo("RestaurantDashboard");
      } else if (currentStatus === "rejected") {
        Toast.show({ type: "error", text1: "Your application has been rejected." });
        dispatch(updateUser({ status: "rejected" }));
        resetTo("Login/Signup");
      } else {
        Toast.show({ type: "info", text1: "Application is still under review." });
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to check status. Please try again." });
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutRestaurant();
    } catch {
      // Same as the website - logging out client-side regardless of
      // whether the server call succeeds avoids stranding a pending
      // owner who can't reach the backend.
    } finally {
      dispatch(logout());
      resetTo("Login/Signup");
      Toast.show({ type: "success", text1: "Logged out successfully" });
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.topBar} />

          <View style={styles.body}>
            <View style={styles.iconCircle}>
              <Clock size={40} color="#f97316" />
            </View>

            <Text style={styles.title}>Application Under Review</Text>

            <Text style={styles.description}>
              Hi <Text style={styles.bold}>{user.ownerName}</Text>, your registration for{" "}
              <Text style={styles.bold}>{user.restaurantName}</Text> has been received
              successfully. Our team is currently verifying your details.
            </Text>

            <View style={styles.infoGrid}>
              <InfoRow icon={Store} label="Restaurant" value={user.restaurantName} />
              <InfoRow icon={Mail} label="Registered Email" value={user.email} />
              <InfoRow icon={Phone} label="Contact Number" value={user.mobile || "Not provided"} />
              <View style={styles.infoBox}>
                <View style={styles.infoIconWrap}>
                  <ShieldCheck size={20} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <View style={styles.statusRow}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Verification Pending</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.checkBtn, isChecking && styles.btnDisabled]}
                onPress={handleCheckStatus}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.checkBtnText}>Checking...</Text>
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} color="#fff" />
                    <Text style={styles.checkBtnText}>Check Status Again</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut size={18} color="#6b7280" />
                <Text style={styles.logoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>
              Need help? Contact support at{" "}
              <Text style={styles.footerLink}>support@bhojanqr.com</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) => (
  <View style={styles.infoBox}>
    <View style={styles.infoIconWrap}>
      <Icon size={20} color="#f97316" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7ed" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 24, overflow: "hidden", elevation: 4 },
  topBar: { height: 6, backgroundColor: "#fb923c" },
  body: { padding: 28, alignItems: "center" },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "900", color: "#111827", textAlign: "center", marginBottom: 12 },
  description: { fontSize: 15, color: "#6b7280", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  bold: { fontWeight: "800", color: "#111827" },
  infoGrid: { width: "100%", gap: 12, marginBottom: 28 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 16,
    padding: 14,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "700", color: "#111827" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#f59e0b" },
  statusText: { fontSize: 15, fontWeight: "700", color: "#d97706" },
  actions: { width: "100%", gap: 12 },
  checkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#f97316",
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 2,
  },
  checkBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnDisabled: { opacity: 0.7 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 16,
    borderRadius: 16,
  },
  logoutBtnText: { color: "#374151", fontWeight: "700", fontSize: 16 },
  footerText: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 28 },
  footerLink: { color: "#f97316", fontWeight: "700" },
});

export default PendingApprovalScreen;
