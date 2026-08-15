import React, { useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Bell } from 'lucide-react-native';

import { getRestaurantNotifications } from '../API/notificationApi';
import { setHasUnread, markUnreadArrived } from '../Features/NotificationSlice';
import { socket } from '../utils/socket';

// The app's top bar: brand icon on the left, notification bell on the right.
//
// Things that used to live here and have moved out: a hamburger (the drawer is
// gone), a five-tap admin shortcut (now on the auth screen's brand icon), and
// a back button (every screen this appears on is a terminal destination now).
//
// The dashboards no longer draw their own "Welcome back, <restaurant>" bar
// with a logout button - this is the only chrome above their content, and
// logout moved into the More page and the Profile section.
const Header = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const user = useSelector((state: any) => state.auth?.user);
  const hasUnread = useSelector((state: any) => state.notifications?.hasUnread);

  // /notifications is a restaurant-scoped endpoint (owner or staff). Admins
  // would just collect a 403, so the bell is theirs alone.
  const isRestaurantSide = user?.role === 'restaurant' || user?.role === 'staff';

  useEffect(() => {
    if (!isRestaurantSide) return;

    let cancelled = false;

    // Seed the badge from the real list, so it is accurate on a cold start
    // rather than only reacting to events that happen while the app is open.
    (async () => {
      try {
        const res = await getRestaurantNotifications();
        const list = res.data?.data || [];
        if (!cancelled) {
          dispatch(setHasUnread(list.some((n: any) => !n.isRead)));
        }
      } catch {
        // The badge is an affordance, not information the user is relying on -
        // a failed fetch should leave the header alone, not surface an error.
      }
    })();

    // Keep it live. The server creates a Notification for the restaurant on
    // every new order and emits into the restaurant's room at the same time,
    // so this event arriving means there is something new to read.
    const onOrderActivity = () => dispatch(markUnreadArrived());
    socket.on('order:status-changed', onOrderActivity);

    return () => {
      cancelled = true;
      socket.off('order:status-changed', onOrderActivity);
    };
  }, [isRestaurantSide, dispatch]);

  return (
    <View style={styles.headerContainer}>
      <Image
        source={require('../../assets/bhojanqr-icon.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />

      <View style={styles.spacer} />

      {isRestaurantSide && (
        <TouchableOpacity
          onPress={() =>
            // Params rather than shared state: RestaurantDashboard owns which
            // panel is showing, and reads this to jump to Notifications.
            navigation.navigate('RestaurantDashboard', { openTab: 'notifications' })
          }
          style={styles.bellButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={hasUnread ? 'Notifications, unread' : 'Notifications'}
        >
          <Bell size={22} color="#374151" />
          {hasUnread && <View style={styles.badge} />}
        </TouchableOpacity>
      )}
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
  logoImage: {
    width: 38,
    height: 38,
  },
  spacer: { flex: 1 },
  bellButton: {
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
