import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useSelector } from "react-redux";

import { lightColors, darkColors, type ThemeColors } from "./colors";

export type { ThemeColors } from "./colors";

// Resolves the user's stored preference against the OS setting and hands the
// answer to the tree. "system" is the default, so a phone in dark mode gets a
// dark dashboard without anyone touching a setting.
//
// useColorScheme subscribes to the OS appearance, so flipping the phone's
// theme while the app is open re-renders straight away rather than waiting
// for a restart.
const ThemeContext = createContext<ThemeColors>(lightColors);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const preference = useSelector((state: any) => state.preferences?.theme) || "system";
  const systemScheme = useColorScheme();

  const colors = useMemo(() => {
    const resolved = preference === "system" ? systemScheme : preference;
    return resolved === "dark" ? darkColors : lightColors;
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
};

// The colours for the active theme. Stable between renders unless the theme
// actually changes, so it is safe as a useMemo dependency.
export const useThemeColors = () => useContext(ThemeContext);

/**
 * Builds a screen's StyleSheet from the active palette.
 *
 * Screens keep their styles in a `makeStyles(c)` factory instead of a
 * module-level StyleSheet.create, and call this at the top of the component:
 *
 *   const styles = useThemedStyles(makeStyles);
 *
 * The sheet is memoised on the palette, so switching theme rebuilds it once
 * and ordinary renders reuse it - StyleSheet.create on every render would
 * throw away RN's style registration caching on every keystroke in a form.
 */
export const useThemedStyles = <T,>(factory: (colors: ThemeColors) => T): T => {
  const colors = useThemeColors();
  return useMemo(() => factory(colors), [factory, colors]);
};
