import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from "react-native";
import { Check, Clock } from "lucide-react-native";

// Bottom-sheet time picker speaking plain 24-hour "HH:mm" strings, the same
// format the offer schedule (and the server's HH:MM validation) already
// uses. Everything is visible at once - AM/PM toggle, a 12-button hour grid
// and a 5-minute-step minute grid - so picking a time is two taps with zero
// scrolling, replacing the free-text "HH:MM" inputs that accepted typos the
// server then had to reject.
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export const to12Hour = (time24: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24 || "");
  if (!match) return { hour: 12, minute: 0, period: "AM" as "AM" | "PM" };
  const h = Number(match[1]);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  let hour = h % 12;
  if (hour === 0) hour = 12;
  return { hour, minute: Number(match[2]), period };
};

const to24Hour = (hour: number, minute: number, period: "AM" | "PM") => {
  let h = hour % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const formatTime12 = (time24: string) => {
  if (!/^\d{1,2}:\d{2}$/.test(time24 || "")) return "Select time";
  const { hour, minute, period } = to12Hour(time24);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
};

type TimePickerSheetProps = {
  visible: boolean;
  title: string;
  // Current "HH:mm" 24-hour value; the sheet edits a draft and only commits
  // on Done, so backing out never half-changes the form.
  value: string;
  onClose: () => void;
  onConfirm: (value24: string) => void;
};

const TimePickerSheet = ({ visible, title, value, onClose, onConfirm }: TimePickerSheetProps) => {
  const [draft, setDraft] = useState(() => to12Hour(value));

  // Re-seed the draft each time the sheet opens for a (possibly different)
  // field - the component instance is shared between Start and End.
  useEffect(() => {
    if (visible) setDraft(to12Hour(value));
  }, [visible, value]);

  const minuteOnGrid = MINUTES.includes(draft.minute);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Stop taps inside the sheet from closing it */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Clock size={16} color="#ea580c" />
              <Text style={styles.title}>{title}</Text>
            </View>
            <Text style={styles.preview}>
              {formatTime12(to24Hour(draft.hour, draft.minute, draft.period))}
            </Text>
          </View>

          {/* AM / PM */}
          <View style={styles.periodTrack}>
            {(["AM", "PM"] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, draft.period === p && styles.periodBtnActive]}
                onPress={() => setDraft((d) => ({ ...d, period: p }))}
              >
                <Text style={[styles.periodText, draft.period === p && styles.periodTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.gridLabel}>Hour</Text>
          <View style={styles.grid}>
            {HOURS.map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.cell, draft.hour === h && styles.cellActive]}
                onPress={() => setDraft((d) => ({ ...d, hour: h }))}
              >
                <Text style={[styles.cellText, draft.hour === h && styles.cellTextActive]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.gridLabel}>Minute</Text>
          <View style={styles.grid}>
            {MINUTES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.cell, minuteOnGrid && draft.minute === m && styles.cellActive]}
                onPress={() => setDraft((d) => ({ ...d, minute: m }))}
              >
                <Text style={[styles.cellText, minuteOnGrid && draft.minute === m && styles.cellTextActive]}>
                  {String(m).padStart(2, "0")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              onConfirm(to24Hour(draft.hour, draft.minute, draft.period));
              onClose();
            }}
          >
            <Check size={16} color="#fff" />
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
  },
  preview: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ea580c",
  },
  periodTrack: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 100,
    padding: 4,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 100,
    alignItems: "center",
  },
  periodBtnActive: {
    backgroundColor: "#ea580c",
  },
  periodText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#64748b",
  },
  periodTextActive: {
    color: "#ffffff",
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  cell: {
    // Six per row: (100% - 5 gaps of 8) / 6 ≈ 14.5%
    flexBasis: "14.5%",
    flexGrow: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  cellActive: {
    backgroundColor: "#ea580c",
  },
  cellText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  cellTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ea580c",
    height: 50,
    borderRadius: 14,
  },
  doneText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
});

export default TimePickerSheet;
