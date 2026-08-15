import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Bell } from 'lucide-react-native';

import { getRestaurantNotifications } from '../API/notificationApi';
import { setHasUnread, markUnreadArrived } from '../Features/NotificationSlice';
import { socket } from '../utils/socket';

export interface HeaderAction {
  key: string;
  icon: React.ComponentType<any>;
  onPress: () => void;
  label: string;
}

interface HeaderProps {
  // Centred page heading - "Overview", "Orders", "Tables", "Menu", "More".
  title?: string;
  // Supplying this is what puts the bell on screen. Screens with no
  // notifications view of their own (AdminDashboard, PendingApproval) simply
  // omit it and get a bell-free bar, rather than one that navigates nowhere.
  onBellPress?: () => void;
  // Page-specific controls, rendered to the LEFT of the bell in the order
  // given. Whether the bell appears at all is decided independently by
  // onBellPress, so a page can have actions with the bell (most tabs), actions
  // instead of it (Menu, where + takes its place), or neither (More).
  actions?: HeaderAction[];
}

const Header = ({ title, onBellPress, actions }: HeaderProps) => {
  const dispatch = useDispatch();

  const user = useSelector((state: any) => state.auth?.user);
  const hasUnread = useSelector((state: any) => state.notifications?.hasUnread);

  // /notifications is restaurant-scoped (owner or staff); an admin would only
  // collect a 403. Paired with onBellPress so the badge is only maintained
  // where it is actually drawn.
  const hasActions = !!actions?.length;
  const isRestaurantSide = user?.role === 'restaurant' || user?.role === 'staff';
  const showBell = isRestaurantSide && !!onBellPress;

  useEffect(() => {
    if (!showBell) return;

    let cancelled = false;

    // Seed from the real list so the badge is right on a cold start, not just
    // reactive to events that happen while the app is open.
    (async () => {
      try {
        const res = await getRestaurantNotifications();
        const list = res.data?.data || [];
        if (!cancelled) {
          dispatch(setHasUnread(list.some((n: any) => !n.isRead)));
        }
      } catch {
        // The badge is an affordance, not information being relied on - a
        // failed fetch should leave the bar alone rather than raise an error.
      }
    })();

    // The server writes a Notification for the restaurant and emits into its
    // room at the same moment, so this event means there is something new.
    const onOrderActivity = () => dispatch(markUnreadArrived());
    socket.on('order:status-changed', onOrderActivity);

    return () => {
      cancelled = true;
      socket.off('order:status-changed', onOrderActivity);
    };
  }, [showBell, dispatch]);

  return (
    <View style={styles.headerContainer}>
      {/* Absolutely positioned and centred across the FULL bar, rather than
          being a flex child between the logo and the actions. The two flanks
          are different widths (and the right one changes with how many actions
          a page ships), so a flex-centred heading would drift as those change.
          pointerEvents none so it never swallows a tap meant for an action. */}
      <Text style={styles.title} numberOfLines={1} pointerEvents="none">
        {title}
      </Text>

      <Image
        source={require('../../assets/bhojanqr-icon.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />

      <View style={styles.spacer} />

      <View style={styles.actions}>
        {hasActions &&
          actions!.map(({ key, icon: Icon, onPress, label }) => (
            <TouchableOpacity
              key={key}
              onPress={onPress}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Icon size={22} color="#374151" />
            </TouchableOpacity>
          ))}

        {showBell && (
          <TouchableOpacity
            onPress={onBellPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={hasUnread ? 'Notifications, unread' : 'Notifications'}
          >
            <Bell size={22} color="#374151" />
            {hasUnread && <View style={styles.badge} />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  headerContainer: {
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  spacer: { flex: 1 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  logoImage: {
    width: 38,
    height: 38,
  },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
