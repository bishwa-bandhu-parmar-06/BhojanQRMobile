import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import DeviceInfo from "react-native-device-info";
import {
  Sun,
  Moon,
  Smartphone,
  Languages,
  Bell,
  Volume2,
  MonitorSmartphone,
  Info,
  Check,
  Play,
} from "lucide-react-native";

import { setPreference } from "../../Features/PreferencesSlice";
import { useThemeColors, useThemedStyles, type ThemeColors } from "../../theme";
import { useTranslation, LANGUAGES } from "../../i18n";
import { playOrderAlert, isSoundAvailable, isKeepAwakeAvailable } from "../../utils/alerts";

// Device-level app preferences. Everything about the RESTAURANT - name,
// addresses, logo, login email, password, government documents - lives on
// Profile Details instead. The split is deliberate: that data is account data
// held on the server and shared by every device signed into it, while these
// are choices belonging to this phone.

const THEME_OPTIONS = [
  { id: "light", labelKey: "settings.themeLight", icon: Sun },
  { id: "dark", labelKey: "settings.themeDark", icon: Moon },
  { id: "system", labelKey: "settings.themeSystem", icon: Smartphone },
];

interface SectionProps {
  title: string;
  caption?: string;
  children: React.ReactNode;
  styles: any;
}

const Section = ({ title, caption, children, styles }: SectionProps) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    <View style={styles.card}>{children}</View>
  </View>
);

interface ToggleRowProps {
  icon: any;
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  isLast?: boolean;
  disabled?: boolean;
  accessory?: React.ReactNode;
  styles: any;
  c: ThemeColors;
}

const ToggleRow = ({
  icon: Icon,
  label,
  hint,
  value,
  onValueChange,
  isLast,
  disabled,
  accessory,
  styles,
  c,
}: ToggleRowProps) => (
  <View style={[styles.row, !isLast && styles.rowDivider, disabled && styles.rowDisabled]}>
    <View style={styles.rowIcon}>
      <Icon size={18} color={c.primary} />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowHint}>{hint}</Text>
    </View>
    {accessory}
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: c.switchTrackOff, true: c.primaryMuted }}
      thumbColor={value ? c.primary : c.switchThumbOff}
    />
  </View>
);

const AppSettingsManager = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state: any) => state.preferences);
  const c = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [appVersion, setAppVersion] = useState("");
  const [buildNumber, setBuildNumber] = useState("");

  useEffect(() => {
    setAppVersion(DeviceInfo.getVersion());
    setBuildNumber(String(DeviceInfo.getBuildNumber()));
  }, []);

  const update = (key: string, value: any) => dispatch(setPreference({ key, value }));

  // Both are native modules. Until the app is rebuilt with them, the toggles
  // would be switches that change a stored value and nothing else - so they
  // are disabled and say why, rather than lying about what they do.
  const soundReady = isSoundAvailable();
  const keepAwakeReady = isKeepAwakeAvailable();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Section
        title={t("settings.appearance")}
        caption={t("settings.appearanceCaption")}
        styles={styles}
      >
        <View style={styles.segmented}>
          {THEME_OPTIONS.map(({ id, labelKey, icon: Icon }) => {
            const isActive = preferences?.theme === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.segment, isActive && styles.segmentActive]}
                onPress={() => update("theme", id)}
                activeOpacity={0.8}
              >
                <Icon size={18} color={isActive ? c.primary : c.textFaint} />
                <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      <Section
        title={t("settings.language")}
        caption={t("settings.languageCaption")}
        styles={styles}
      >
        {LANGUAGES.map(({ id, label, native }, index) => {
          const isActive = preferences?.language === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.row, index !== LANGUAGES.length - 1 && styles.rowDivider]}
              onPress={() => update("language", id)}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Languages size={18} color={c.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowHint}>{native}</Text>
              </View>
              {isActive && (
                <View style={styles.checkCircle}>
                  <Check size={13} color={c.primaryText} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </Section>

      <Section
        title={t("settings.alerts")}
        caption={t("settings.alertsCaption")}
        styles={styles}
      >
        <ToggleRow
          icon={Bell}
          label={t("settings.orderAlerts")}
          hint={t("settings.orderAlertsHint")}
          value={!!preferences?.orderAlerts}
          onValueChange={(next) => update("orderAlerts", next)}
          styles={styles}
          c={c}
        />
        <ToggleRow
          icon={Volume2}
          label={t("settings.alertSound")}
          hint={
            soundReady
              ? t("settings.alertSoundHint")
              : "Needs an app update to take effect"
          }
          value={!!preferences?.alertSound}
          onValueChange={(next) => update("alertSound", next)}
          disabled={!soundReady}
          // Hearing it is the only way to know whether it is loud enough over
          // a busy kitchen, which is the actual question being asked.
          accessory={
            soundReady && preferences?.alertSound ? (
              <TouchableOpacity
                style={styles.previewBtn}
                onPress={playOrderAlert}
                activeOpacity={0.75}
                accessibilityLabel={t("settings.alertSoundPreview")}
              >
                <Play size={13} color={c.primary} />
              </TouchableOpacity>
            ) : null
          }
          styles={styles}
          c={c}
        />
        <ToggleRow
          icon={MonitorSmartphone}
          label={t("settings.keepScreenAwake")}
          hint={
            keepAwakeReady
              ? t("settings.keepScreenAwakeHint")
              : "Needs an app update to take effect"
          }
          value={!!preferences?.keepScreenAwake}
          onValueChange={(next) => update("keepScreenAwake", next)}
          disabled={!keepAwakeReady}
          isLast
          styles={styles}
          c={c}
        />
      </Section>

      <Section title={t("settings.about")} styles={styles}>
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Info size={18} color={c.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{t("settings.appVersion")}</Text>
            <Text style={styles.rowHint}>
              {appVersion ? `${appVersion} (build ${buildNumber})` : "—"}
            </Text>
          </View>
        </View>
      </Section>

      <Text style={styles.footnote}>{t("settings.footnote")}</Text>
    </ScrollView>
  );
};

export default AppSettingsManager;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 40 },

    section: { marginBottom: 24 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: c.textFaint,
      marginBottom: 2,
    },
    sectionCaption: { fontSize: 12, color: c.textFaint, marginBottom: 10 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    // A hairline between rows rather than gaps between cards - keeps a group of
    // related settings reading as one block.
    rowDivider: { borderBottomWidth: 1, borderBottomColor: c.divider },
    rowDisabled: { opacity: 0.55 },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: "700", color: c.text },
    rowHint: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    previewBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoftBorder,
    },

    // Three mutually exclusive choices sit better as one segmented control than
    // as three rows with radio ticks - it shows all options and the current one
    // in a single glance.
    segmented: { flexDirection: "row", padding: 6, gap: 6 },
    segment: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: "transparent",
    },
    segmentActive: { backgroundColor: c.primarySoft, borderColor: c.primarySoftBorder },
    segmentLabel: { fontSize: 12, fontWeight: "700", color: c.textFaint },
    segmentLabelActive: { color: c.primary },

    footnote: {
      fontSize: 12,
      lineHeight: 18,
      color: c.textFaint,
      textAlign: "center",
      paddingHorizontal: 24,
    },
  });
