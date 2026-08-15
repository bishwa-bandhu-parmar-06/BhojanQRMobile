import React, { useEffect } from "react";
import { StatusBar, View, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";

import { useThemeColors } from "../../theme";
import { setKeepScreenAwake, preloadOrderAlert } from "../../utils/alerts";

/**
 * The pieces of app chrome that live OUTSIDE any screen and so cannot theme
 * themselves from a screen's style sheet: the status bar, the root
 * background behind the navigator, and the toast host.
 *
 * It also owns the two device-level preferences that are not tied to a
 * screen either - keeping the display awake, and warming the alert chime -
 * because both must apply wherever the user happens to be in the app.
 */
const ThemedChrome = ({ children }: { children: React.ReactNode }) => {
  const c = useThemeColors();
  const keepScreenAwake = useSelector((s: any) => s.preferences?.keepScreenAwake);
  const alertSound = useSelector((s: any) => s.preferences?.alertSound);

  // Applied here rather than in App Settings so the setting survives leaving
  // that screen - the flag belongs to the session, not to the panel that
  // happens to toggle it.
  useEffect(() => {
    setKeepScreenAwake(!!keepScreenAwake);
    return () => {
      setKeepScreenAwake(false);
    };
  }, [keepScreenAwake]);

  // Decoding the file on the first order is what makes that one alert late.
  useEffect(() => {
    if (alertSound) preloadOrderAlert();
  }, [alertSound]);

  const toastConfig = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: c.success,
          backgroundColor: c.successSoft,
          borderColor: c.border,
          borderWidth: c.isDark ? 1 : 0,
          borderLeftWidth: 5,
          marginTop: 10,
          height: "auto",
          minHeight: 60,
          paddingVertical: 5,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 16, fontWeight: "800", color: c.success }}
        text2Style={{ fontSize: 13, color: c.textBody }}
        renderTrailingIcon={() => (
          <TouchableOpacity
            onPress={() => Toast.hide()}
            style={{ padding: 10, justifyContent: "center", alignItems: "center" }}
          >
            <FontAwesome5 name="times" size={16} color={c.success} />
          </TouchableOpacity>
        )}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{
          borderLeftColor: c.danger,
          backgroundColor: c.dangerSoft,
          borderColor: c.border,
          borderWidth: c.isDark ? 1 : 0,
          borderLeftWidth: 5,
          marginTop: 10,
          height: "auto",
          minHeight: 60,
          paddingVertical: 5,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 16, fontWeight: "800", color: c.danger }}
        text2Style={{ fontSize: 13, color: c.textBody }}
        renderTrailingIcon={() => (
          <TouchableOpacity
            onPress={() => Toast.hide()}
            style={{ padding: 10, justifyContent: "center", alignItems: "center" }}
          >
            <FontAwesome5 name="times" size={16} color={c.danger} />
          </TouchableOpacity>
        )}
      />
    ),
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar barStyle={c.statusBarStyle} backgroundColor={c.surface} />
      {children}
      <Toast config={toastConfig} />
    </View>
  );
};

export default ThemedChrome;
