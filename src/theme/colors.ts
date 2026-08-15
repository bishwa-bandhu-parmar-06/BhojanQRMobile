// The app's colour palette, expressed as roles rather than shades.
//
// Every screen used to hardcode hex values (#f8fafc for a page, #ffffff for a
// card, #6b7280 for secondary text). That made a dark mode impossible without
// editing hundreds of literals by hand and, worse, made it impossible to tell
// from a style sheet whether "#f3f4f6" meant a divider, a chip background or
// a disabled state. Naming the role once here means a screen asks for
// `c.border` and gets the right thing in either theme.
//
// The brand orange is deliberately NOT inverted: it is the one colour that
// must stay recognisably BhojanQR in both themes. It is only lightened
// slightly in dark mode, because #ea580c on a near-black surface does not
// carry enough luminance contrast for text.

export interface ThemeColors {
  // Surfaces, from furthest back to nearest front.
  bg: string; // the page behind everything
  surface: string; // cards, sheets, the header bar
  surfaceAlt: string; // inset areas: segmented controls, skeletons, wells
  surfaceSunken: string; // chips and counters sitting ON a card

  // Text, in descending emphasis.
  text: string; // headings and primary values
  textBody: string; // ordinary body copy
  textMuted: string; // hints, captions, secondary lines
  textFaint: string; // timestamps, counters, placeholder text

  border: string; // card and input outlines
  divider: string; // hairlines between rows in a list

  primary: string; // brand orange - actions, active states
  primaryText: string; // text/icons placed ON primary
  primarySoft: string; // tinted background for icon tiles and soft pills
  primarySoftBorder: string; // outline for those soft pills
  primaryMuted: string; // a disabled primary button

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  // Switch tracks and thumbs, which take flat colours rather than roles.
  switchTrackOff: string;
  switchThumbOff: string;

  // Android's status bar content: "dark-content" on a light theme.
  statusBarStyle: "dark-content" | "light-content";
  isDark: boolean;
}

export const lightColors: ThemeColors = {
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceAlt: "#f9fafb",
  surfaceSunken: "#f3f4f6",

  text: "#111827",
  textBody: "#374151",
  textMuted: "#6b7280",
  textFaint: "#9ca3af",

  border: "#e5e7eb",
  divider: "#f3f4f6",

  primary: "#ea580c",
  primaryText: "#ffffff",
  primarySoft: "#fff7ed",
  primarySoftBorder: "#fed7aa",
  primaryMuted: "#fdba74",

  success: "#16a34a",
  successSoft: "#f0fdf4",
  warning: "#d97706",
  warningSoft: "#fffbeb",
  danger: "#ef4444",
  dangerSoft: "#fef2f2",
  info: "#2563eb",
  infoSoft: "#eff6ff",

  switchTrackOff: "#e5e7eb",
  switchThumbOff: "#f9fafb",

  statusBarStyle: "dark-content",
  isDark: false,
};

// Not a mechanical inversion. Surfaces step UP in lightness as they come
// forward (the opposite of the light theme, where they step towards white),
// because on a dark ground a raised card reads as lighter, not whiter. The
// soft accent backgrounds become dark, low-saturation tints of their hue -
// #f0fdf4 on black would glare.
export const darkColors: ThemeColors = {
  bg: "#0b1120",
  surface: "#151d2c",
  surfaceAlt: "#1c2637",
  surfaceSunken: "#243044",

  text: "#f1f5f9",
  textBody: "#cbd5e1",
  textMuted: "#94a3b8",
  textFaint: "#64748b",

  border: "#2b3648",
  divider: "#232e41",

  primary: "#fb7c3c",
  primaryText: "#1a0f07",
  primarySoft: "#2a1a10",
  primarySoftBorder: "#4a2a16",
  primaryMuted: "#7c4426",

  success: "#4ade80",
  successSoft: "#10241a",
  warning: "#fbbf24",
  warningSoft: "#2a2010",
  danger: "#f87171",
  dangerSoft: "#2c1618",
  info: "#60a5fa",
  infoSoft: "#141f33",

  switchTrackOff: "#33415a",
  switchThumbOff: "#94a3b8",

  statusBarStyle: "light-content",
  isDark: true,
};
