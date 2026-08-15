import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { Bell, CheckCircle2, Info, ShoppingBag, ShieldAlert, ShieldCheck, Trash2, Check } from "lucide-react-native";

import {
  getRestaurantNotifications,
  markAllNotificationsAsRead,
  markSingleNotificationAsRead,
  deleteSingleNotification,
  deleteAllNotifications,
} from "../../API/notificationApi";
import CustomModal from "../../components/CustomModal";
import { SkeletonBlock } from "../../components/Skeleton";
import SectionError from "../../components/SectionError";
import { setHasUnread } from "../../Features/NotificationSlice";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const ICONS: Record<string, { Icon: any; color: string }> = {
  ORDER_PLACED: { Icon: ShoppingBag, color: "#16a34a" },
  NEW_ORDER: { Icon: ShoppingBag, color: "#16a34a" },
  ORDER_UPDATE: { Icon: Info, color: "#ea580c" },
  ACCOUNT_APPROVED: { Icon: ShieldCheck, color: "#2563eb" },
  ACCOUNT_REJECTED: { Icon: ShieldAlert, color: "#dc2626" },
};

const NotificationManager = () => {
  const dispatch = useDispatch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);

  const fetchNotifs = async () => {
    try {
      setLoadError(false);
      const res = await getRestaurantNotifications();
      if (res.data?.success) {
        const list = res.data.data || [];
        setNotifications(list);
        // Keep the header bell honest: this is the freshest read of the list
        // anywhere in the app, so it is the right place to settle the badge.
        dispatch(setHasUnread(list.some((n: Notification) => !n.isRead)));
      }
    } catch {
      Toast.show({ type: "error", text1: "Could not load notifications" });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    if (notifications.length === 0 || !notifications.some((n) => !n.isRead)) {
      Toast.show({ type: "success", text1: "Already caught up!" });
      return;
    }
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      dispatch(setHasUnread(false));
      await markAllNotificationsAsRead();
    } catch {
      Toast.show({ type: "error", text1: "Failed to mark all as read" });
      fetchNotifs();
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    try {
      await markSingleNotificationAsRead(id);
    } catch {
      fetchNotifs();
    }
  };

  const handleDeleteSingle = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await deleteSingleNotification(id);
    } catch {
      Toast.show({ type: "error", text1: "Failed to delete" });
      fetchNotifs();
    }
  };

  const confirmClearAll = async () => {
    setClearModalOpen(false);
    try {
      await deleteAllNotifications();
      setNotifications([]);
      Toast.show({ type: "success", text1: "All notifications cleared" });
    } catch {
      Toast.show({ type: "error", text1: "Failed to clear notifications" });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="40%" height={24} borderRadius={6} />
            <SkeletonBlock width="70%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        </View>
        <View style={styles.list}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.notifCard, { gap: 8 }]}>
              <SkeletonBlock width={38} height={38} borderRadius={12} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBlock width="60%" height={13} borderRadius={6} />
                <SkeletonBlock width="90%" height={12} borderRadius={6} />
                <SkeletonBlock width="30%" height={10} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Stay updated on your restaurant's latest activity.</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={handleMarkAllRead}
          disabled={notifications.length === 0}
          style={[styles.actionBtn, notifications.length === 0 && styles.actionBtnDisabled]}
        >
          <CheckCircle2 size={15} color="#16a34a" />
          <Text style={styles.actionBtnText}>Mark all read</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => notifications.length > 0 && setClearModalOpen(true)}
          disabled={notifications.length === 0}
          style={[styles.actionBtn, styles.actionBtnDanger, notifications.length === 0 && styles.actionBtnDisabled]}
        >
          <Trash2 size={15} color="#dc2626" />
          <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>Clear all</Text>
        </TouchableOpacity>
      </View>

      {loadError && notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <SectionError message="Could not load notifications." onRetry={fetchNotifs} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Bell size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>
            When you receive new orders or account updates, they'll appear here.
          </Text>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {notifications.map((notif) => {
            const meta = ICONS[notif.type] || { Icon: Bell, color: "#6b7280" };
            const Icon = meta.Icon;
            return (
              <View key={notif._id} style={[styles.notifCard, !notif.isRead && styles.notifCardUnread]}>
                <View style={[styles.notifIconBox, { backgroundColor: `${meta.color}1A` }]}>
                  <Icon size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.notifTopRow}>
                    <Text style={[styles.notifTitle, !notif.isRead && styles.notifTitleUnread]} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    {!notif.isRead && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifMessage}>{notif.message}</Text>
                  <Text style={styles.notifDate}>
                    {new Date(notif.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <View style={styles.notifActions}>
                    {!notif.isRead && (
                      <TouchableOpacity onPress={() => handleMarkSingleRead(notif._id)} style={styles.notifActionBtn}>
                        <Check size={13} color="#16a34a" />
                        <Text style={[styles.notifActionText, { color: "#16a34a" }]}>Mark read</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDeleteSingle(notif._id)} style={styles.notifActionBtn}>
                      <Trash2 size={13} color="#dc2626" />
                      <Text style={[styles.notifActionText, { color: "#dc2626" }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <CustomModal
        visible={clearModalOpen}
        type="error"
        title="Clear All Notifications?"
        message="This cannot be undone. All read and unread notifications will be permanently deleted."
        confirmText="Yes, Clear"
        cancelText="Cancel"
        onConfirm={confirmClearAll}
        onCancel={() => setClearModalOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  container: { flex: 1, backgroundColor: "#f9fafb" },
  headerRow: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6b7280", fontWeight: "500", marginTop: 4 },
  actionsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  actionBtnDanger: { borderColor: "#fecaca" },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: "#16a34a" },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, marginHorizontal: 16, backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#1f2937" },
  emptySubtitle: { fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 6, paddingHorizontal: 24 },

  list: { padding: 16, gap: 10 },
  notifCard: { flexDirection: "row", gap: 12, backgroundColor: "#ffffff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#f3f4f6" },
  notifCardUnread: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  notifIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notifTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifTitle: { fontSize: 13, fontWeight: "700", color: "#6b7280", flexShrink: 1 },
  notifTitleUnread: { color: "#1f2937", fontWeight: "800" },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ea580c" },
  notifMessage: { fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 17 },
  notifDate: { fontSize: 10, color: "#9ca3af", fontWeight: "600", marginTop: 6 },
  notifActions: { flexDirection: "row", gap: 14, marginTop: 8 },
  notifActionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  notifActionText: { fontSize: 11, fontWeight: "700" },
});

export default NotificationManager;
