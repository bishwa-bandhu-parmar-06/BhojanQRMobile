import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, TextInput, Platform } from "react-native";
import Toast from "react-native-toast-message";
import RNShare from "react-native-share";
import RNFS from "react-native-fs";
import { FileSpreadsheet, Download } from "lucide-react-native";

import { downloadSalesReport } from "../../API/reportApi";
import { arrayBufferToBase64 } from "../../utils/base64";

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
      const response = await downloadSalesReport(buildParams());
      const base64 = arrayBufferToBase64(response.data);
      const fileName = `BhojanQR_Sales_Report_${activeTab}.xlsx`;
      const destPath = Platform.OS === "android"
        ? `${RNFS.DownloadDirectoryPath}/${fileName}`
        : `${RNFS.DocumentDirectoryPath}/${fileName}`;

      await RNFS.writeFile(destPath, base64, "base64");
      if (Platform.OS === "android") {
        await RNFS.scanFile(destPath);
      }

      Toast.show({ type: "success", text1: "Report downloaded successfully!" });

      await RNShare.open({
        url: Platform.OS === "android" ? `file://${destPath}` : destPath,
        title: "Sales Report",
        failOnCancel: false,
      });
    } catch {
      Toast.show({ type: "error", text1: "Failed to generate report. Please try again." });
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
