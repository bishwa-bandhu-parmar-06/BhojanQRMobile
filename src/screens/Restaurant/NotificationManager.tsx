import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import {
  Bell,
  Info,
  ShoppingBag,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Check,
  CheckCheck,
  RefreshCw,
} from "lucide-react-native";

import {
  getRestaurantNotifications,
  markAllNotificationsAsRead,
  markSingleNotificationAsRead,
  deleteSingleNotification,
  deleteAllNotifications,
} from "../../API/notificationApi";
import CustomModal from "../../components/CustomModal";
import type { HeaderAction } from "../../components/Header";
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

type NotificationManagerProps = {
  // Lets this panel put its controls in the dashboard's section bar. It owns
  // the counts those buttons depend on, so it decides what to publish.
  onHeaderActions?: (actions: HeaderAction[]) => void;
};

const NotificationManager = ({ onHeaderActions }: NotificationManagerProps) => {
  const dispatch = useDispatch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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

  // Mount-only on purpose: the list is re-fetched explicitly on the error
  // paths below, and re-running this whenever fetchNotifs is re-created would
  // refetch on every render.
  useEffect(() => {
    fetchNotifs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Held in a ref so the effect below can depend only on the counts. Without
  // it the handlers change identity every render, the effect re-runs, and it
  // publishes a new array each time - which re-renders the dashboard, which
  // re-renders this, forever.
  const handlersRef = useRef({
    refresh: () => {},
    markAll: () => {},
    clear: () => {},
  });
  handlersRef.current = {
    refresh: fetchNotifs,
    markAll: handleMarkAllRead,
    clear: () => setClearModalOpen(true),
  };

  useEffect(() => {
    // Refresh is always offered - an empty list is exactly when someone wants
    // to check again. The other two only exist when there is something to act
    // on, and "mark all read" additionally goes when everything is already read.
    const actions: HeaderAction[] = [
      {
        key: "refresh",
        icon: RefreshCw,
        label: "Refresh",
        onPress: () => handlersRef.current.refresh(),
      },
    ];

    if (notifications.length > 0 && unreadCount > 0) {
      actions.push({
        key: "read-all",
        icon: CheckCheck,
        label: "Mark all as read",
        onPress: () => handlersRef.current.markAll(),
      });
    }

    if (notifications.length > 0) {
      actions.push({
        key: "clear-all",
        icon: Trash2,
        label: "Delete all",
        onPress: () => handlersRef.current.clear(),
      });
    }

    onHeaderActions?.(actions);
  }, [notifications.length, unreadCount, onHeaderActions]);

  // Leaving the section must take the buttons with it, or they would sit in
  // the bar of whatever opens next.
  useEffect(() => () => onHeaderActions?.([]), [onHeaderActions]);

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
      {/* <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Stay updated on your restaurant's latest activity.</Text>
        </View>
      </View> */}

      {/* Refresh / mark-all-read / delete-all now live in the section bar
          above (published via onHeaderActions), so only the count remains
          here - the one piece of information rather than a second control
          strip stacked under the first. */}
      {notifications.length > 0 && (
        <Text style={styles.unreadSummary}>
          {unreadCount > 0 ? `${unreadCount} unread` : `All caught up · ${notifications.length}`}
        </Text>
      )}

      {loadError && notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <SectionError message="Could not load notifications." onRetry={fetchNotifs} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconRing}>
            <View style={styles.emptyIconCircle}>
              <Bell size={30} color="#ea580c" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>You're all caught up</Text>
          <Text style={styles.emptySubtitle}>
            New orders and account updates land here as they happen. Nothing needs your
            attention right now.
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
                <View style={styles.notifBody}>
                  {/* Title and time share a line: the timestamp is reference
                      information, not a third stacked paragraph, and putting
                      it right keeps the left edge clean down the whole list. */}
                  <View style={styles.notifTopRow}>
                    {!notif.isRead && <View style={styles.unreadDot} />}
                    <Text
                      style={[styles.notifTitle, !notif.isRead && styles.notifTitleUnread]}
                      numberOfLines={1}
                    >
                      {notif.title}
                    </Text>
                    <Text style={styles.notifDate}>
                      {new Date(notif.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>

                  <Text style={styles.notifMessage}>{notif.message}</Text>

                  <View style={styles.notifFooter}>
                    <Text style={styles.notifTime}>
                      {new Date(notif.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>

                    {/* Icon-only, pushed right. Two labelled text buttons under
                        every row turned the list into a wall of repeated
                        words; the icons carry the same meaning at a glance. */}
                    <View style={styles.notifActions}>
                      {!notif.isRead && (
                        <TouchableOpacity
                          onPress={() => handleMarkSingleRead(notif._id)}
                          style={styles.notifActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Mark as read"
                        >
                          <Check size={15} color="#16a34a" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDeleteSingle(notif._id)}
                        style={[styles.notifActionBtn, styles.notifActionBtnDanger]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Delete notification"
                      >
                        <Trash2 size={15} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
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
  unreadSummary: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9ca3af",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },

  // Unboxed and vertically centred, matching every other empty state.
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
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  emptySubtitle: { fontSize: 13, lineHeight: 20, color: "#6b7280", textAlign: "center", marginTop: 8 },

  list: { padding: 16, paddingTop: 0, gap: 10, paddingBottom: 32 },
  notifCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  // Unread keeps the white card but gains a coloured left edge - the old
  // full orange fill made a busy day look like one solid orange block.
  notifCardUnread: { borderLeftWidth: 3, borderLeftColor: "#ea580c" },
  notifIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notifBody: { flex: 1 },
  notifTopRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  notifTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: "#6b7280" },
  notifTitleUnread: { color: "#1f2937", fontWeight: "800" },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ea580c" },
  notifDate: { fontSize: 10, color: "#9ca3af", fontWeight: "700" },
  notifMessage: { fontSize: 12, color: "#6b7280", marginTop: 5, lineHeight: 17 },
  notifFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  notifTime: { fontSize: 10, color: "#b8bec9", fontWeight: "700" },
  notifActions: { flexDirection: "row", gap: 8 },
  notifActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fdf4",
  },
  notifActionBtnDanger: { backgroundColor: "#fef2f2" },
});

export default NotificationManager;
