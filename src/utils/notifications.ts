import { Platform, TurboModuleRegistry, NativeModules } from "react-native";

// System-tray notifications for new orders and waiter calls.
//
// Same defensive shape as utils/alerts.ts and for the same reason: notifee is
// a NATIVE module, so it only exists in a binary built after it was installed.
// Probing the registry with get() (which returns null) rather than letting the
// package's own getEnforcing() run at import time is what stops an older APK
// showing a redbox over the whole dashboard.
const hasNativeModule = (name: string) => {
  try {
    return !!TurboModuleRegistry.get(name) || !!(NativeModules as any)[name];
  } catch {
    return false;
  }
};

let notifee: any = null;
let AndroidImportance: any = null;
let AndroidVisibility: any = null;
let EventType: any = null;
let loadFailed = false;

const getNotifee = () => {
  if (notifee || loadFailed) return notifee;
  if (!hasNativeModule("NotifeeApiModule")) {
    loadFailed = true;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@notifee/react-native");
    notifee = mod?.default || mod;
    AndroidImportance = mod?.AndroidImportance;
    AndroidVisibility = mod?.AndroidVisibility;
    EventType = mod?.EventType;
  } catch {
    loadFailed = true;
  }
  return notifee;
};

export const isSystemNotificationAvailable = () => !!getNotifee();

// One channel per kind of alert, so the OS settings screen lets an owner
// silence waiter calls without silencing orders. Android ignores changes to a
// channel after it is created, which is why the sound is baked in here rather
// than passed per-notification.
const ORDER_CHANNEL = "bhojanqr-orders";
const SERVICE_CHANNEL = "bhojanqr-service";

let channelsReady = false;

export const ensureNotificationSetup = async () => {
  const n = getNotifee();
  if (!n || Platform.OS !== "android") return false;

  try {
    // Android 13+ refuses to post anything without this. Asking on first use
    // rather than at launch means the prompt arrives with a reason attached.
    await n.requestPermission();

    if (!channelsReady) {
      await n.createChannel({
        id: ORDER_CHANNEL,
        name: "New orders",
        description: "A customer placed an order",
        // HIGH pops a heads-up banner over whatever is on screen and plays
        // the sound. Anything lower is silent and easy to miss in a kitchen.
        importance: AndroidImportance?.HIGH ?? 4,
        // order_alert is the chime generated into res/raw - the same tone the
        // in-app alert plays, so both sound like this app.
        sound: "order_alert",
        vibration: true,
        vibrationPattern: [300, 400],
        visibility: AndroidVisibility?.PUBLIC ?? 1,
      });

      await n.createChannel({
        id: SERVICE_CHANNEL,
        name: "Waiter calls",
        description: "A table is asking for assistance",
        importance: AndroidImportance?.HIGH ?? 4,
        sound: "order_alert",
        vibration: true,
        vibrationPattern: [300, 400],
        visibility: AndroidVisibility?.PUBLIC ?? 1,
      });

      channelsReady = true;
    }
    return true;
  } catch {
    return false;
  }
};

type NotifyInput = {
  title: string;
  body: string;
  // Carried through the tap so the app knows where to land.
  data?: Record<string, string>;
  channel?: "order" | "service";
};

/**
 * Posts a notification to the system tray.
 *
 * The phone's ringer decides whether it makes a noise: a channel with a sound
 * plays it on a phone that is not silenced, and shows silently on one that is.
 * That is the platform behaviour and deliberately not overridden - an app that
 * forced audio through silent mode would be the kind that gets uninstalled.
 */
export const showSystemNotification = async ({
  title,
  body,
  data,
  channel = "order",
}: NotifyInput) => {
  const n = getNotifee();
  if (!n) return false;

  try {
    await ensureNotificationSetup();
    await n.displayNotification({
      title,
      body,
      data: data || {},
      android: {
        channelId: channel === "service" ? SERVICE_CHANNEL : ORDER_CHANNEL,
        smallIcon: "ic_launcher",
        pressAction: { id: "default", launchActivity: "default" },
        // Dismissed by tapping it, not by swiping the whole tray away - an
        // order alert should survive a casual clear-all.
        autoCancel: true,
      },
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Registers the tap handler.
 *
 * `onOpen` is called with the notification's data payload both when the app is
 * already running (foreground/background event) and when the tap is what
 * launched it (initial notification). The caller decides where to navigate -
 * this file deliberately knows nothing about screens or auth state.
 */
export const registerNotificationTapHandler = (
  onOpen: (data: Record<string, any>) => void,
) => {
  const n = getNotifee();
  if (!n) return () => {};

  // A tap that cold-started the app is not delivered as an event; it has to
  // be read once at startup or the notification silently does nothing.
  n.getInitialNotification?.()
    .then((initial: any) => {
      if (initial?.notification?.data) onOpen(initial.notification.data);
    })
    .catch(() => {});

  const unsubForeground = n.onForegroundEvent?.(({ type, detail }: any) => {
    if (type === (EventType?.PRESS ?? 1) && detail?.notification?.data) {
      onOpen(detail.notification.data);
    }
  });

  return () => {
    try {
      unsubForeground?.();
    } catch {
      // Unsubscribing a listener that never attached is not worth reporting.
    }
  };
};
