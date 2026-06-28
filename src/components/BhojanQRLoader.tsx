import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, AccessibilityInfo } from 'react-native';

// Mirrors the website's BhojanQRLoader.jsx - each letter of "BhojanQR"
// ("Bhojan" orange, "QR" green) lifts and settles with a soft bounce, one
// letter at a time left-to-right, looping forever. No spinner/progress bar.
// The website's keyframe is driven by a single shared 3.2s CSS animation
// with per-letter `animation-delay` (400ms apart, 8 letters); this recreates
// that with one Animated.loop per letter, each with the same total cycle
// length so their 400ms relative stagger never drifts across loops.
const LETTERS = ['B', 'h', 'o', 'j', 'a', 'n', 'Q', 'R'];
const CYCLE_MS = 3200;
const STEP_MS = 400;

interface BhojanQRLoaderProps {
  fullScreen?: boolean;
  message?: string;
}

const Letter = ({ char, index, color }: { char: string; index: number; color: string }) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delayBefore = index * STEP_MS;
    const motionDuration = 150 + 120 + 180;
    const delayAfter = CYCLE_MS - delayBefore - motionDuration;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayBefore),
        Animated.timing(translateY, { toValue: -6, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.delay(Math.max(delayAfter, 0)),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [index, translateY]);

  return (
    <Animated.Text style={[styles.letter, { color, transform: [{ translateY }] }]}>
      {char}
    </Animated.Text>
  );
};

const BhojanQRLoader = ({ fullScreen = true, message }: BhojanQRLoaderProps) => {
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : styles.inline]}>
      <View style={styles.wordmark}>
        {LETTERS.map((char, i) => (
          <Letter key={i} char={char} index={i} color={i < 6 ? '#f97316' : '#16a34a'} />
        ))}
      </View>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  fullScreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', zIndex: 999 },
  inline: { width: '100%', paddingVertical: 24, paddingHorizontal: 16 },
  wordmark: { flexDirection: 'row', alignItems: 'flex-end' },
  letter: { fontSize: 22, fontWeight: '600', letterSpacing: -0.5 },
  message: { fontSize: 13, fontWeight: '500', color: '#6b7280', textAlign: 'center' },
});

export default BhojanQRLoader;
