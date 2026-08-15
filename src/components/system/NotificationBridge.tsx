import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import { socket } from "../../utils/socket";
import { markUnreadArrived } from "../../Features/NotificationSlice";
import { playOrderAlert } from "../../utils/alerts";
import {
  ensureNotificationSetup,
  showSystemNotification,
  registerNotificationTapHandler,
  isSystemNotificationAvailable,
} from "../../utils/notifications";
import { navigateWhenReady } from "../../navigation/navigationRef";
import WaiterCallDialog, { type WaiterCall } from "./WaiterCallDialog";

/**
 * Turns server events into alerts: a system-tray notification for anything
 * that lands, plus a full-screen dialog for a waiter call, which is urgent
 * enough to interrupt whatever is on screen.
 *
 * It sits above the navigator so it is mounted for the whole signed-in
 * session rather than only while a particular screen is open - a new order
 * has to alert the owner whichever tab they are on, or none at all, and the
 * dialog has to be able to cover a full-screen order detail.
 *
 * IMPORTANT LIMIT: these are LOCAL notifications, raised by this app in
 * response to a socket event. They arrive while the app is running, including
 * in the background. They do NOT arrive once Android has killed the process,
 * because the socket dies with it. Alerting a closed app needs a real push
 * service (FCM) delivering to the device rather than to this code.
 */
const NotificationBridge = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.auth?.user);
  const orderAlerts = useSelector((state: any) => state.preferences?.orderAlerts);
  const alertSound = useSelector((state: any) => state.preferences?.alertSound);

  const isRestaurantSide = user?.role === "restaurant" || user?.role === "staff";

  // A QUEUE, not a single value. Two tables calling within seconds of each
  // other is normal at service time, and holding only the latest would drop
  // the first one silently - the table would sit there waiting while nobody
  // ever saw the request.
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);

  const dismissCurrentCall = useCallback(() => {
    setWaiterCalls((prev) => prev.slice(1));
  }, []);

  // Read inside the socket handler, which is registered once - without a ref
  // the handler would capture whatever the preferences were at mount.
  const prefsRef = useRef({ orderAlerts, alertSound, isRestaurantSide });
  prefsRef.current = { orderAlerts, alertSound, isRestaurantSide };

  // Channels and the Android 13+ permission. Only asked for once someone is
  // actually signed in to a restaurant, so the prompt lands with a reason
  // rather than on the login screen.
  useEffect(() => {
    if (!isRestaurantSide) {
      setWaiterCalls([]);
      return;
    }
    ensureNotificationSetup();
  }, [isRestaurantSide]);

  useEffect(() => {
    if (!isRestaurantSide) return;

    const notify = async (title: string, body: string, channel: "order" | "service") => {
      const { orderAlerts: on, alertSound: sound } = prefsRef.current;
      if (!on) return;

      dispatch(markUnreadArrived());

      // The tray notification carries its own sound through the channel. The
      // in-app chime is only for when the app is in front, where Android
      // shows a heads-up banner but the notification sound can be suppressed.
      if (sound && AppState.currentState === "active") playOrderAlert();

      await showSystemNotification({
        title,
        body,
        channel,
        data: { screen: "notifications" },
      });
    };

    const onOrderActivity = (payload: any) => {
      notify(
        payload?.title || "New order",
        payload?.body || "A new order has arrived.",
        "order",
      );
    };

    // Raised by the server when a table presses "Call waiter" on the public
    // menu. Its own channel so an owner can silence one kind without the
    // other, and because a customer waiting at a table is a different
    // urgency from an order ticket.
    const onServiceRequest = (payload: any) => {
      notify(
        payload?.title || "Table calling",
        payload?.message || "A table needs assistance.",
        "service",
      );

      if (!payload?.requestId) return;
      setWaiterCalls((prev) =>
        // The server can re-emit, and a reconnect can replay - showing the
        // same table twice would have someone walk over for nothing.
        prev.some((call) => call.requestId === payload.requestId)
          ? prev
          : [
              ...prev,
              {
                requestId: payload.requestId,
                tableNumber: payload.tableNumber,
                message: payload.message || "Need assistance",
                createdAt: payload.createdAt,
              },
            ],
      );
    };

    socket.on("order:status-changed", onOrderActivity);
    socket.on("service:requested", onServiceRequest);

    return () => {
      socket.off("order:status-changed", onOrderActivity);
      socket.off("service:requested", onServiceRequest);
    };
  }, [isRestaurantSide, dispatch]);

  // Tapping a notification. Kept separate from the posting effect because it
  // must be registered even when signed out - that is the case it exists for.
  useEffect(() => {
    if (!isSystemNotificationAvailable()) return;

    const unsubscribe = registerNotificationTapHandler(() => {
      const signedIn = !!user?.role;

      if (signedIn && (user.role === "restaurant" || user.role === "staff")) {
        // Already signed in: go straight there, no questions.
        navigateWhenReady("MainApp", {
          screen: "RestaurantDashboard",
          params: { openTab: "notifications" },
        });
        return;
      }

      // Signed out. Offering navigation to a screen they cannot see would
      // just bounce them, so ask first and take no for an answer - the app is
      // left exactly where it was if they decline.
      Alert.alert(
        "Sign in to view",
        "Log in to your restaurant account to open this notification.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Log in",
            onPress: () => navigateWhenReady("MainApp", { screen: "Login" }),
          },
        ],
      );
    });

    return unsubscribe;
  }, [user]);

  // Rendered here rather than inside a screen so it covers whatever is on
  // top - including a full-screen order detail or a settings sub-screen.
  return (
    <WaiterCallDialog
      call={waiterCalls[0] || null}
      queuedCount={Math.max(0, waiterCalls.length - 1)}
      onDismiss={dismissCurrentCall}
    />
  );
};

export default NotificationBridge;
