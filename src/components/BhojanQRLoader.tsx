import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';

// The app's single loading indicator, used from ~15 screens.
//
// It used to animate the letters of "BhojanQR" one at a time (a port of the
// website's BhojanQRLoader.jsx). That is now a plain spinning ring: it reads
// as "working" instantly, at any size, and does not depend on the wordmark
// being legible in a small inline slot.
//
// The name and props are unchanged so every existing call site keeps working
// untouched - `fullScreen` and `message` behave exactly as before.

const RING_SIZE = 40;
const RING_THICKNESS = 4;
const TRACK = '#ffedd5'; // pale orange, the unfilled part of the ring
const ACCENT = '#ea580c'; // brand orange, the travelling arc

interface BhojanQRLoaderProps {
  fullScreen?: boolean;
  message?: string;
}

const BhojanQRLoader = ({ fullScreen = true, message }: BhojanQRLoaderProps) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Linear easing keeps the rotation at a constant rate - anything eased
    // makes a continuous spinner visibly stutter once per revolution.
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : styles.inline]}>
      {/* A full ring in the pale track colour with a single side overridden to
          the brand orange; rotating it turns that arc into the moving part. */}
      <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  fullScreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', zIndex: 999 },
  inline: { width: '100%', paddingVertical: 24, paddingHorizontal: 16 },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_THICKNESS,
    borderColor: TRACK,
    borderTopColor: ACCENT,
  },
  message: { fontSize: 13, fontWeight: '500', color: '#6b7280', textAlign: 'center' },
});

export default BhojanQRLoader;
