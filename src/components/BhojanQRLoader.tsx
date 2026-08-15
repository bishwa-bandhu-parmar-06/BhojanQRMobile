import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';


const RING_SIZE = 40;
const RING_THICKNESS = 4;
const TRACK = '#ffedd5'; 
const ACCENT = '#ea580c'; 

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
