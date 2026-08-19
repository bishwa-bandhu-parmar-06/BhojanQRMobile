import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from "react-native";
import { Check, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react-native";

// Bottom-sheet date picker with three modes, built for the sales report
// panel's four tabs without pulling in a native datetimepicker dependency:
//   "date"  -> full month calendar   -> confirms "YYYY-MM-DD"
//   "month" -> 12-month grid         -> confirms "YYYY-MM"
//   "year"  -> pageable year grid    -> confirms "YYYY"
// In "date" mode the header month/year is itself tappable, drilling up to a
// month grid and a year grid, so reaching an old year is three taps rather
// than dozens of chevron presses.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export type CalendarMode = "date" | "month" | "year";

const pad = (n: number) => String(n).padStart(2, "0");

// Human-friendly labels for the trigger fields, e.g. "19 Aug 2026",
// "August 2026", "2026". Falls back to the raw value if it doesn't parse.
export const formatCalendarValue = (mode: CalendarMode, value: string): string => {
  if (mode === "year") return /^\d{4}$/.test(value) ? value : "Select year";
  if (mode === "month") {
    const m = /^(\d{4})-(\d{2})$/.exec(value);
    return m ? `${MONTHS_FULL[Number(m[2]) - 1]} ${m[1]}` : "Select month";
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "Select date";
};

type CalendarSheetProps = {
  visible: boolean;
  mode: CalendarMode;
  title: string;
  value: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
};

const CalendarSheet = ({ visible, mode, title, value, onClose, onConfirm }: CalendarSheetProps) => {
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const parse = () => {
    const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(value || "");
    return {
      y: m ? Number(m[1]) : todayY,
      mo: m && m[2] ? Number(m[2]) - 1 : todayM,
      d: m && m[3] ? Number(m[3]) : todayD,
    };
  };

  const [viewYear, setViewYear] = useState(todayY);
  const [viewMonth, setViewMonth] = useState(todayM);
  // What the sheet is currently showing. "date" mode starts at days and can
  // drill up; "month"/"year" modes are pinned to their own level.
  const [level, setLevel] = useState<"days" | "months" | "years">("days");
  const [sel, setSel] = useState(parse());

  useEffect(() => {
    if (!visible) return;
    const p = parse();
    setSel(p);
    setViewYear(p.y);
    setViewMonth(p.mo);
    setLevel(mode === "year" ? "years" : mode === "month" ? "months" : "days");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Reports cover the past - anything after today is not selectable.
  const isFutureDay = (y: number, mo: number, d: number) =>
    y > todayY || (y === todayY && (mo > todayM || (mo === todayM && d > todayD)));
  const isFutureMonth = (y: number, mo: number) => y > todayY || (y === todayY && mo > todayM);

  const confirm = (next: { y: number; mo: number; d: number }) => {
    if (mode === "year") onConfirm(String(next.y));
    else if (mode === "month") onConfirm(`${next.y}-${pad(next.mo + 1)}`);
    else onConfirm(`${next.y}-${pad(next.mo + 1)}-${pad(next.d)}`);
    onClose();
  };

  // ── grids ───────────────────────────────────────────────────────────
  const renderDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    const isSelMonth = sel.y === viewYear && sel.mo === viewMonth;
    return (
      <>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={styles.weekday}>{w}</Text>
          ))}
        </View>
        <View style={styles.dayGrid}>
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={styles.dayCell} />;
            const disabled = isFutureDay(viewYear, viewMonth, d);
            const active = isSelMonth && sel.d === d;
            const isToday = viewYear === todayY && viewMonth === todayM && d === todayD;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayCell, active && styles.cellActive, isToday && !active && styles.cellToday]}
                disabled={disabled}
                onPress={() => setSel({ y: viewYear, mo: viewMonth, d })}
              >
                <Text style={[styles.dayText, disabled && styles.textDisabled, active && styles.textActive, isToday && !active && styles.textToday]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  };

  const renderMonths = () => (
    <View style={styles.monthGrid}>
      {MONTHS.map((m, i) => {
        const disabled = isFutureMonth(viewYear, i);
        const active = sel.y === viewYear && sel.mo === i;
        return (
          <TouchableOpacity
            key={m}
            style={[styles.monthCell, active && styles.cellActive]}
            disabled={disabled}
            onPress={() => {
              if (mode === "date") {
                // Drilling back down: pick the month, then choose the day.
                setViewMonth(i);
                setLevel("days");
              } else {
                setSel({ y: viewYear, mo: i, d: 1 });
              }
            }}
          >
            <Text style={[styles.monthText, disabled && styles.textDisabled, active && styles.textActive]}>{m}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // 12-year pages anchored so the current view-year's page is stable.
  const yearPageStart = viewYear - ((viewYear - 1) % 12);
  const renderYears = () => (
    <View style={styles.monthGrid}>
      {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((y) => {
        const disabled = y > todayY;
        const active = sel.y === y;
        return (
          <TouchableOpacity
            key={y}
            style={[styles.monthCell, active && styles.cellActive]}
            disabled={disabled}
            onPress={() => {
              if (mode === "date") {
                setViewYear(y);
                setLevel("months");
              } else if (mode === "month") {
                setViewYear(y);
                setLevel("months");
              } else {
                setSel({ y, mo: 0, d: 1 });
              }
            }}
          >
            <Text style={[styles.monthText, disabled && styles.textDisabled, active && styles.textActive]}>{y}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── header nav ──────────────────────────────────────────────────────
  const navBack = () => {
    if (level === "days") {
      const m = viewMonth - 1;
      if (m < 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth(m);
    } else if (level === "months") {
      setViewYear((y) => y - 1);
    } else {
      setViewYear((y) => y - 12);
    }
  };
  const navFwd = () => {
    if (level === "days") {
      const m = viewMonth + 1;
      if (m > 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth(m);
    } else if (level === "months") {
      setViewYear((y) => y + 1);
    } else {
      setViewYear((y) => y + 12);
    }
  };

  const headerLabel =
    level === "days"
      ? `${MONTHS_FULL[viewMonth]} ${viewYear}`
      : level === "months"
        ? String(viewYear)
        : `${yearPageStart} – ${yearPageStart + 11}`;

  // Tapping the header climbs one level (days -> months -> years); in pure
  // year mode there is nowhere higher to go.
  const climb = () => {
    if (level === "days") setLevel("months");
    else if (level === "months" && mode !== "month") setLevel("years");
    else if (level === "months" && mode === "month") setLevel("years");
  };

  const previewText =
    mode === "year"
      ? String(sel.y)
      : mode === "month"
        ? `${MONTHS_FULL[sel.mo]} ${sel.y}`
        : `${sel.d} ${MONTHS[sel.mo]} ${sel.y}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <CalendarDays size={16} color="#ea580c" />
              <Text style={styles.title}>{title}</Text>
            </View>
            <Text style={styles.preview}>{previewText}</Text>
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={navBack} accessibilityRole="button">
              <ChevronLeft size={18} color="#334155" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navLabelBtn} onPress={climb} accessibilityRole="button">
              <Text style={styles.navLabel}>{headerLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={navFwd} accessibilityRole="button">
              <ChevronRight size={18} color="#334155" />
            </TouchableOpacity>
          </View>

          {level === "days" && renderDays()}
          {level === "months" && renderMonths()}
          {level === "years" && renderYears()}

          <TouchableOpacity style={styles.doneBtn} onPress={() => confirm(sel)}>
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
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: "900",
    color: "#ea580c",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  navLabelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1e293b",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  dayCell: {
    // 7 columns
    width: `${100 / 7}%`,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  cellActive: {
    backgroundColor: "#ea580c",
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: "#fdba74",
  },
  textActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  textToday: {
    color: "#ea580c",
  },
  textDisabled: {
    color: "#cbd5e1",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  monthCell: {
    // 4 columns: (100% - 3 gaps of 8) / 4 ≈ 23%
    flexBasis: "23%",
    flexGrow: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  monthText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ea580c",
    height: 50,
    borderRadius: 14,
    marginTop: 8,
  },
  doneText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
});

export default CalendarSheet;
