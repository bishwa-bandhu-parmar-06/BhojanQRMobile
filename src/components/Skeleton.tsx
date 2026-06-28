import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

// Generic shimmering placeholder block - used to build skeleton loading
// states (e.g. a row of boxes shaped like a menu card) instead of a single
// centered spinner, so the page's final layout is recognizable while data
// is still loading.
interface SkeletonBlockProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width: width as any, height: height as any, borderRadius, opacity },
        style,
      ]}
    />
  );
};

// A single skeleton row shaped like the compact horizontal MenuItemCard -
// thumbnail on the left, a few text lines on the right.
export const MenuCardSkeleton: React.FC = () => (
  <View style={styles.menuCardSkeleton}>
    <SkeletonBlock width={72} height={72} borderRadius={12} />
    <View style={{ flex: 1, gap: 8 }}>
      <SkeletonBlock width="40%" height={10} />
      <SkeletonBlock width="80%" height={16} />
      <SkeletonBlock width="60%" height={12} />
    </View>
  </View>
);

export const MenuListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <View style={{ gap: 12 }}>
    {Array.from({ length: count }).map((_, i) => (
      <MenuCardSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  block: {
    backgroundColor: "#e5e7eb",
  },
  menuCardSkeleton: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 12,
  },
});

export default SkeletonBlock;
