import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The app's ONLY splash screen. react-native-bootsplash and its native
// BootTheme have been removed - there is no second splash image anywhere.
//
// What Android still shows before this can draw is unavoidable and is not a
// splash: from the instant the icon is tapped until the JS bundle has loaded,
// the OS displays a window built from the launch activity's theme. That is
// pure OS behaviour, ahead of any app code. It is painted the same #fff7ed
// as this screen (AppTheme's windowBackground, see
// android/app/src/main/res/values/styles.xml), so instead of the default
// white flash the launch simply opens in this screen's own colour and this
// screen draws its logo onto it. Same cream is HomeScreen's background tint
// too, so the whole launch is one colour end to end.
//
// BACKGROUND below and @color/launch_background must be changed together.
//
// This component is presentational only and deliberately owns NO timer. An
// earlier version gated its dismissal timer behind a prop, and because the JS
// thread is still busy mounting the app at that moment the timer could be
// queued behind that work and never fire, leaving the splash up forever.
// App.tsx owns the dismissal, so nothing here decides whether it goes away.

const BACKGROUND = '#fff7ed';
const BRAND_ORANGE = '#ea580c';
const BRAND_GREEN = '#166534';
const MUTED = '#9ca3af';

// Free design choice now: nothing else draws this logo at launch, so there is
// no generated native asset whose size this has to match.
const LOGO_SIZE = 200;

// Distance below the screen's midpoint at which the accent rule sits. Measured
// from the midpoint rather than from the logo box because the source PNG is a
// square canvas with the wide lockup band centred in it - most of the box
// below the artwork is transparent padding, so laying the rule out relative to
// the box would leave it visibly detached.
const RULE_GAP = 46;

const SplashScreen = () => {
  const insets = useSafeAreaInsets();

  // A single value drives the whole entrance. The launch window before this is
  // a flat cream field with no artwork, so everything here - logo included -
  // is genuinely new to the user and can animate in together.
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 550,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />

      {/* The ONLY flex child, so it lands on the exact centre of this screen.
          Everything else is absolutely positioned specifically so it cannot
          drag the logo off-centre - when the credits were a sibling in the
          same flex column they pushed it 25px up, which is what made it look
          not-quite-centred. */}
      <Animated.Image
        source={require('../assets/logo.png')}
        resizeMode="contain"
        style={[
          styles.logo,
          {
            opacity: enter,
            transform: [
              {
                scale: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1],
                }),
              },
            ],
          },
        ]}
      />

      {/* Short two-tone rule picking up the wordmark's own colours, so the
          lockup sits on a base instead of floating.
          Offset from the screen's midpoint rather than from the logo box: the
          source PNG is a square canvas with the wide lockup band centred in
          it, so most of the box below the artwork is transparent padding and
          laying this out relative to the box would leave it detached. */}
      <Animated.View style={[styles.ruleRow, { opacity: enter }]}>
        <View style={[styles.rule, styles.ruleOrange]} />
        <View style={[styles.rule, styles.ruleGreen]} />
      </Animated.View>

      <Animated.View
        style={[styles.credits, { opacity: enter, bottom: insets.bottom + 32 }]}
      >
        <Text style={styles.creditsLabel}>DEVELOPED BY</Text>
        <Text style={styles.creditsName}>Bishwa Bandhu Parmar</Text>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  // absoluteFillObject so this covers the already-mounted app: the real UI
  // boots underneath while this is up, so dismissing it reveals a screen that
  // has finished rendering rather than one just starting.
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  ruleRow: {
    position: 'absolute',
    top: '50%',
    marginTop: RULE_GAP,
    flexDirection: 'row',
  },
  rule: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  ruleOrange: {
    backgroundColor: BRAND_ORANGE,
    marginRight: 5,
  },
  ruleGreen: {
    backgroundColor: BRAND_GREEN,
  },
  credits: {
    position: 'absolute',
    alignItems: 'center',
  },
  creditsLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: MUTED,
    marginBottom: 5,
  },
  creditsName: {
    fontSize: 15,
    fontWeight: '800',
    color: BRAND_GREEN,
    letterSpacing: 0.2,
  },
});
