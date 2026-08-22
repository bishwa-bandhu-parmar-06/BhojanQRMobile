import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Bell } from 'lucide-react-native';

import { getRestaurantNotifications } from '../API/notificationApi';
import { setHasUnread, markUnreadArrived } from '../Features/NotificationSlice';
import { socket } from '../utils/socket';
import { playOrderAlert } from '../utils/alerts';
import { useThemeColors, useThemedStyles, type ThemeColors } from '../theme';

export interface HeaderAction {
  key: string;
  icon: React.ComponentType<any>;
  onPress: () => void;
  label: string;
  // Renders as a filled pill carrying the label rather than a bare icon.
  // For the one primary action on a screen, where an unlabelled icon would
  // leave people guessing. Honoured by the dashboard's section bar; the app
  // header always draws icons, since its corner has no room for a pill.
  showLabel?: boolean;
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
  // Makes the logo a "go home" button. Omitted where there is no home to go
  // to - PendingApproval takes this header from the navigator and has exactly
  // one screen - and the logo then stays a plain, unpressable image rather
  // than a button that appears to do nothing.
  onLogoPress?: () => void;
}

const Header = ({ title, onBellPress, actions, onLogoPress }: HeaderProps) => {
  const dispatch = useDispatch();
  const c = useThemeColors();
  const styles = useThemedStyles(makeStyles);

  const user = useSelector((state: any) => state.auth?.user);
  const hasUnread = useSelector((state: any) => state.notifications?.hasUnread);
  // App Settings' two alert switches. Read here because this is where the
  // socket event that represents "a new order landed" is already handled.
  const orderAlerts = useSelector((state: any) => state.preferences?.orderAlerts);
  const alertSound = useSelector((state: any) => state.preferences?.alertSound);

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
    // reactive to events that happen while the app is open. Skipped entirely
    // when order alerts are off - there is no badge to be right about.
    (async () => {
      if (!orderAlerts) {
        dispatch(setHasUnread(false));
        return;
      }
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
    const onOrderActivity = () => {
      if (!orderAlerts) return;
      dispatch(markUnreadArrived());
      // The two switches are independent on purpose: a kitchen wants the
      // noise, a manager on the floor usually wants only the badge.
      if (alertSound) playOrderAlert();
    };
    socket.on('order:status-changed', onOrderActivity);

    return () => {
      cancelled = true;
      socket.off('order:status-changed', onOrderActivity);
    };
  }, [showBell, dispatch, orderAlerts, alertSound]);

  const logo = (
    <Image
      source={require('../../assets/bhojanqr-icon.png')}
      style={styles.logoImage}
      resizeMode="contain"
    />
  );

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

      {onLogoPress ? (
        <TouchableOpacity
          onPress={onLogoPress}
          // The mark is small and sits hard against the screen edge, so it
          // needs a target well beyond its own bounds to be tappable.
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go to home"
        >
          {logo}
        </TouchableOpacity>
      ) : (
        logo
      )}

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
              <Icon size={22} color={c.textBody} />
            </TouchableOpacity>
          ))}

        {showBell && (
          <TouchableOpacity
            onPress={onBellPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={hasUnread ? 'Notifications, unread' : 'Notifications'}
          >
            <Bell size={22} color={c.textBody} />
            {hasUnread && orderAlerts && <View style={styles.badge} />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default Header;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    headerContainer: {
      height: 55,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
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
      color: c.text,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.danger,
      borderWidth: 2,
      borderColor: c.surface,
    },
  });
