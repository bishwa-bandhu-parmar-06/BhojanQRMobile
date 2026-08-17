import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, TextInput } from "react-native";
import Toast from "react-native-toast-message";
import RNShare from "react-native-share";
import RNFS from "react-native-fs";
import { FileSpreadsheet, Download } from "lucide-react-native";

import { getToken } from "../../utils/tokenStorage";
import { API_BASE_URL } from "../../config/env";

const todayISO = () => new Date().toISOString().slice(0, 10);
const thisMonthISO = () => new Date().toISOString().slice(0, 7);

const TABS = [
  { id: "daily", label: "Daily" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
  { id: "custom", label: "Custom Range" },
];

const SalesReportPanel = () => {
  const [activeTab, setActiveTab] = useState("daily");
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(thisMonthISO());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [isDownloading, setIsDownloading] = useState(false);

  const buildParams = () => {
    if (activeTab === "daily") return { type: "daily", date };
    if (activeTab === "monthly") return { type: "monthly", month };
    if (activeTab === "yearly") return { type: "yearly", year };
    return { type: "custom", startDate, endDate };
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Streamed straight to disk by RNFS rather than pulled through axios.
      //
      // The old path asked axios for `responseType: "arraybuffer"` and then
      // base64-encoded it. That works in a browser; React Native's XHR does
      // not give axios a real ArrayBuffer, so what came back was a mangled
      // string and every download failed. RNFS.downloadFile writes the bytes
      // as they arrive, which also means a large report never has to sit in
      // memory on a phone.
      const token = getToken();
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Session expired",
          text2: "Sign in again to download reports",
        });
        return;
      }

      const query = new URLSearchParams(buildParams() as any).toString();
      const fileName = `BhojanQR_Sales_Report_${activeTab}_${todayISO()}.xlsx`;
      // Written to the app's own directory, not the public Downloads folder.
      // Android 10+ scoped storage blocks a direct write there without
      // permissions the app does not request; the share sheet below is how
      // the file reaches Drive, WhatsApp or the user's own storage.
      const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      const { promise } = RNFS.downloadFile({
        fromUrl: `${API_BASE_URL}/reports/sales?${query}`,
        toFile: destPath,
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await promise;

      // RNFS resolves even on a 4xx/5xx - it reports the status rather than
      // throwing, so the body would be written to disk as an .xlsx full of
      // JSON error text unless this is checked.
      if (result.statusCode !== 200) {
        const detail =
          result.statusCode === 403
            ? "You do not have permission to export reports"
            : result.statusCode === 404
              ? "No orders found for this period"
              : `Server returned ${result.statusCode}`;
        Toast.show({ type: "error", text1: "Could not download the report", text2: detail });
        await RNFS.unlink(destPath).catch(() => {});
        return;
      }

      // An empty file means the request succeeded but produced nothing; a
      // 0-byte .xlsx opens as a corrupt workbook, which is a worse outcome
      // than being told there was no data.
      const stat = await RNFS.stat(destPath);
      if (Number(stat.size) === 0) {
        Toast.show({
          type: "error",
          text1: "The report was empty",
          text2: "There are no orders in this period",
        });
        await RNFS.unlink(destPath).catch(() => {});
        return;
      }

      Toast.show({
        type: "success",
        text1: "Report ready",
        text2: `${(Number(stat.size) / 1024).toFixed(0)} KB - choose where to save it`,
      });

      await RNShare.open({
        url: `file://${destPath}`,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: fileName,
        title: "Sales Report",
        failOnCancel: false,
      });
    } catch (error: any) {
      // The old handler was a bare `catch {}`, so every failure looked
      // identical and told you nothing about which one it was.
      const message =
        error?.message?.includes("Network")
          ? "Could not reach the server"
          : error?.message || "Please try again";
      Toast.show({ type: "error", text1: "Failed to download the report", text2: message });
    } finally {
      setIsDownloading(false);
    }
  };


  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <FileSpreadsheet size={18} color="#ea580c" />
        <Text style={styles.title}>Sales Reports & Analytics</Text>
      </View>
      <Text style={styles.subtitle}>Download a detailed Excel report for any day, month, year, or custom range.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tabPill, activeTab === tab.id && styles.tabPillActive]}
          >
            <Text style={[styles.tabPillText, activeTab === tab.id && styles.tabPillTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeTab === "daily" && (
        <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={styles.input} placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />
      )}
      {activeTab === "monthly" && (
        <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={styles.input} placeholder="YYYY-MM" value={month} onChangeText={setMonth} />
      )}
      {activeTab === "yearly" && (
        <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={styles.input} placeholder="YYYY" keyboardType="numeric" value={year} onChangeText={setYear} />
      )}
      {activeTab === "custom" && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={[styles.input, { flex: 1 }]} placeholder="Start YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />
          <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={[styles.input, { flex: 1 }]} placeholder="End YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />
        </View>
      )}

      <TouchableOpacity style={[styles.downloadBtn, isDownloading && styles.downloadBtnDisabled]} onPress={handleDownload} disabled={isDownloading}>
        {isDownloading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.downloadBtnText}>Downloading...</Text>
          </>
        ) : (
          <>
            <Download size={16} color="#fff" />
            <Text style={styles.downloadBtnText}>Download Report</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: "#ffffff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#f3f4f6", marginTop: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  subtitle: { fontSize: 12, color: "#6b7280", marginBottom: 14, lineHeight: 17 },
  tabRow: { marginBottom: 12 },
  tabPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: "#f3f4f6", marginRight: 8 },
  tabPillActive: { backgroundColor: "#ea580c" },
  tabPillText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  tabPillTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, backgroundColor: "#f9fafb", color: "#1f2937", marginBottom: 12 },
  downloadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#ea580c", height: 48, borderRadius: 12 },
  downloadBtnDisabled: { opacity: 0.6 },
  downloadBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});

export default SalesReportPanel;
