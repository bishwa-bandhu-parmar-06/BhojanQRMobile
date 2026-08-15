import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { ChevronDown } from "lucide-react-native";

import { useThemeColors, useThemedStyles, type ThemeColors } from "../theme";

interface LoadMoreButtonProps {
  onPress: () => void;
  loading?: boolean;
  // False once everything is shown - the button is replaced by the end marker
  // rather than sitting there disabled, which reads as something being broken.
  hasMore: boolean;
  // How many rows are on screen out of how many exist. Shown under the button
  // because "Load more" alone gives no sense of whether one tap remains or
  // twenty.
  shown?: number;
  total?: number;
  // Suppresses the end marker on short lists, where nobody was wondering
  // whether more was still coming.
  showEndMarker?: boolean;
  endLabel?: string;
}

/**
 * The shared "Load more" footer for the paged lists (Menu, Live Orders,
 * Active Tables).
 *
 * These lists also load automatically as you approach the bottom. The button
 * is not a replacement for that - it is the visible, reliable way to ask for
 * the next batch, because onEndReached is easy to miss: it can simply not
 * fire when the list is short, when the content does not overflow its
 * container, or when the scroll ends up owned by a parent view.
 */
const LoadMoreButton = ({
  onPress,
  loading,
  hasMore,
  shown,
  total,
  showEndMarker = true,
  endLabel = "That's everything",
}: LoadMoreButtonProps) => {
  const c = useThemeColors();
  const styles = useThemedStyles(makeStyles);

  if (!hasMore) {
    return showEndMarker ? <Text style={styles.endText}>{endLabel}</Text> : null;
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Load more"
      >
        {loading ? (
          <ActivityIndicator size="small" color={c.primary} />
        ) : (
          <>
            <ChevronDown size={15} color={c.primary} />
            <Text style={styles.buttonText}>Load more</Text>
          </>
        )}
      </TouchableOpacity>

      {typeof shown === "number" && typeof total === "number" && total > 0 && (
        <Text style={styles.countText}>
          Showing {shown} of {total}
        </Text>
      )}
    </View>
  );
};

export default LoadMoreButton;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { alignItems: "center", gap: 8, marginTop: 16, marginBottom: 8 },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      minWidth: 160,
      minHeight: 44,
      paddingHorizontal: 22,
      borderRadius: 12,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoftBorder,
    },
    buttonText: { fontSize: 13, fontWeight: "800", color: c.primary },
    countText: { fontSize: 11, fontWeight: "600", color: c.textFaint },
    endText: {
      fontSize: 11,
      fontWeight: "600",
      color: c.textFaint,
      textAlign: "center",
      marginTop: 16,
      marginBottom: 8,
    },
  });
