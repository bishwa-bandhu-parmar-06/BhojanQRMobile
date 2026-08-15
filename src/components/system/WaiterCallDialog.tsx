import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";
import { BellRing, Check, X } from "lucide-react-native";

import { respondToWaiterCall } from "../../API/serviceRequestApi";
import { useThemeColors, useThemedStyles, type ThemeColors } from "../../theme";

export interface WaiterCall {
  requestId: string;
  tableNumber: number | string;
  message: string;
  createdAt?: string;
}

interface WaiterCallDialogProps {
  call: WaiterCall | null;
  // How many more are waiting behind this one, so the dialog can say so
  // rather than appearing to be the only thing that happened.
  queuedCount: number;
  onDismiss: () => void;
}

/**
 * The interruption a waiter call deserves.
 *
 * A tray notification is easy to miss on a phone propped at a counter, and a
 * customer sitting at a table has no way to tell whether their request landed.
 * This takes over the screen, states the table number at a size readable from
 * arm's length, and quotes what they actually asked for - "Bring the bill" and
 * "Need water" are answered by different people carrying different things.
 */
const WaiterCallDialog = ({ call, queuedCount, onDismiss }: WaiterCallDialogProps) => {
  const c = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const [responding, setResponding] = useState(false);

  // Answering follows respond_service (or the broader manage_orders) - the
  // same pair serviceRoutes.js enforces. Someone without it still SEES the
  // call, which is the point: a waiter who cannot formally acknowledge can
  // still walk to the table.
  const user = useSelector((state: any) => state.auth?.user);
  const isOwner = user?.role === "restaurant";
  const perms: string[] = isOwner ? [] : user?.permissions || [];
  const canRespond =
    isOwner || perms.includes("respond_service") || perms.includes("manage_orders");

  const acknowledge = async () => {
    if (!call || responding) return;
    setResponding(true);
    try {
      await respondToWaiterCall(call.requestId, {
        status: "Acknowledged",
        responseMsg: "On our way",
      });
      Toast.show({
        type: "success",
        text1: `Table ${call.tableNumber} acknowledged`,
        text2: "The customer has been told someone is coming",
      });
      onDismiss();
    } catch (error: any) {
      // Left open on failure: dismissing here would drop the call silently
      // and the table would go on waiting with nobody aware of it.
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Could not send the response",
      });
    } finally {
      setResponding(false);
    }
  };

  return (
    <Modal
      visible={!!call}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconRing}>
            <BellRing size={30} color={c.primary} />
          </View>

          <Text style={styles.eyebrow}>Assistance requested</Text>
          <Text style={styles.table}>Table {call?.tableNumber}</Text>

          {/* The reason, verbatim. The customer picked one of a fixed set of
              options on the public menu, so this is short and specific. */}
          <View style={styles.messageBox}>
            <Text style={styles.message}>{call?.message || "Need assistance"}</Text>
          </View>

          {queuedCount > 0 && (
            <Text style={styles.queued}>
              {queuedCount} more table{queuedCount === 1 ? "" : "s"} waiting
            </Text>
          )}

          {canRespond && (
          <TouchableOpacity
            style={[styles.primaryBtn, responding && styles.btnBusy]}
            onPress={acknowledge}
            disabled={responding}
            activeOpacity={0.85}
          >
            {responding ? (
              <ActivityIndicator size="small" color={c.primaryText} />
            ) : (
              <>
                <Check size={17} color={c.primaryText} />
                <Text style={styles.primaryBtnText}>On our way</Text>
              </>
            )}
          </TouchableOpacity>
          )}

          {/* Dismiss closes the dialog WITHOUT answering the customer - the
              request stays pending so it is still visible in notifications.
              Worded so it does not read as "handled". */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onDismiss}
            disabled={responding}
            activeOpacity={0.75}
          >
            <X size={15} color={c.textMuted} />
            <Text style={styles.secondaryBtnText}>
              {canRespond ? "Close without replying" : "Close"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default WaiterCallDialog;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.6)",
      alignItems: "center",
      justifyContent: "center",
      padding: 28,
    },
    card: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: c.surface,
      borderRadius: 24,
      padding: 26,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    iconRing: {
      width: 74,
      height: 74,
      borderRadius: 37,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: c.textFaint,
    },
    // Large on purpose: this is read from across a counter, not held up close.
    table: { fontSize: 30, fontWeight: "900", color: c.text, marginTop: 4 },
    messageBox: {
      alignSelf: "stretch",
      marginTop: 16,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoftBorder,
    },
    message: {
      fontSize: 15,
      fontWeight: "700",
      color: c.primary,
      textAlign: "center",
      lineHeight: 21,
    },
    queued: { fontSize: 12, fontWeight: "700", color: c.textFaint, marginTop: 14 },
    primaryBtn: {
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 52,
      borderRadius: 14,
      backgroundColor: c.primary,
      marginTop: 22,
    },
    btnBusy: { opacity: 0.75 },
    primaryBtnText: { fontSize: 15, fontWeight: "800", color: c.primaryText },
    secondaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 14,
      paddingVertical: 8,
    },
    secondaryBtnText: { fontSize: 13, fontWeight: "700", color: c.textMuted },
  });
