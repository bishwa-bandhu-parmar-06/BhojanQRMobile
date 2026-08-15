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
} from "lucide-react-native";

import { setPreference } from "../../Features/PreferencesSlice";

// Device-level app preferences. Everything about the RESTAURANT - name,
// addresses, logo, login email, password, government documents - lives on
// Profile Details instead. The split is deliberate: that data is account data
// held on the server and shared by every device signed into it, while these
// are choices belonging to this phone.

const THEME_OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Smartphone },
];

// Kept to the languages the venue-facing product actually targets today
// rather than a long list that mostly cannot be served.
const LANGUAGE_OPTIONS = [
  { id: "en", label: "English", native: "English" },
  { id: "hi", label: "Hindi", native: "हिन्दी" },
  { id: "bn", label: "Bengali", native: "বাংলা" },
  { id: "mr", label: "Marathi", native: "मराठी" },
];

interface SectionProps {
  title: string;
  caption?: string;
  children: React.ReactNode;
}

const Section = ({ title, caption, children }: SectionProps) => (
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
}

const ToggleRow = ({
  icon: Icon,
  label,
  hint,
  value,
  onValueChange,
  isLast,
}: ToggleRowProps) => (
  <View style={[styles.row, !isLast && styles.rowDivider]}>
    <View style={styles.rowIcon}>
      <Icon size={18} color="#ea580c" />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowHint}>{hint}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#e5e7eb", true: "#fdba74" }}
      thumbColor={value ? "#ea580c" : "#f9fafb"}
    />
  </View>
);

const AppSettingsManager = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state: any) => state.preferences);

  const [appVersion, setAppVersion] = useState("");
  const [buildNumber, setBuildNumber] = useState("");

  useEffect(() => {
    setAppVersion(DeviceInfo.getVersion());
    setBuildNumber(String(DeviceInfo.getBuildNumber()));
  }, []);

  const update = (key: string, value: any) => dispatch(setPreference({ key, value }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Section title="Appearance" caption="How the app looks on this device.">
        <View style={styles.segmented}>
          {THEME_OPTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = preferences?.theme === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.segment, isActive && styles.segmentActive]}
                onPress={() => update("theme", id)}
                activeOpacity={0.8}
              >
                <Icon size={18} color={isActive ? "#ea580c" : "#9ca3af"} />
                <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      <Section title="Language" caption="Used across the dashboard.">
        {LANGUAGE_OPTIONS.map(({ id, label, native }, index) => {
          const isActive = preferences?.language === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.row, index !== LANGUAGE_OPTIONS.length - 1 && styles.rowDivider]}
              onPress={() => update("language", id)}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Languages size={18} color="#ea580c" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowHint}>{native}</Text>
              </View>
              {isActive && (
                <View style={styles.checkCircle}>
                  <Check size={13} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </Section>

      <Section title="Alerts" caption="What happens when a new order lands.">
        <ToggleRow
          icon={Bell}
          label="Order alerts"
          hint="Show a badge on the header bell"
          value={!!preferences?.orderAlerts}
          onValueChange={(next) => update("orderAlerts", next)}
        />
        <ToggleRow
          icon={Volume2}
          label="Alert sound"
          hint="Play a sound for each new order"
          value={!!preferences?.alertSound}
          onValueChange={(next) => update("alertSound", next)}
        />
        <ToggleRow
          icon={MonitorSmartphone}
          label="Keep screen awake"
          hint="For a tablet mounted at the counter"
          value={!!preferences?.keepScreenAwake}
          onValueChange={(next) => update("keepScreenAwake", next)}
          isLast
        />
      </Section>

      <Section title="About">
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Info size={18} color="#ea580c" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>App version</Text>
            <Text style={styles.rowHint}>
              {appVersion ? `${appVersion} (build ${buildNumber})` : "—"}
            </Text>
          </View>
        </View>
      </Section>

      <Text style={styles.footnote}>
        Restaurant name, addresses, logo, login details and documents are managed in
        Profile Details.
      </Text>
    </ScrollView>
  );
};

export default AppSettingsManager;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 40 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#9ca3af",
    marginBottom: 2,
  },
  sectionCaption: { fontSize: 12, color: "#9ca3af", marginBottom: 10 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
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
  rowDivider: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  rowHint: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentActive: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  segmentLabel: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  segmentLabelActive: { color: "#ea580c" },

  footnote: {
    fontSize: 12,
    lineHeight: 18,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
