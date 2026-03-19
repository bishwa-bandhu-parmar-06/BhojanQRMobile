import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  Image, StyleSheet, ActivityIndicator, Platform 
} from "react-native";
//Aliased Share to RNShare to avoid conflicting with Lucide's Share icon
import RNShare from "react-native-share"; 
import { captureRef } from "react-native-view-shot"; 
import RNFS from "react-native-fs"; 
import { QrCode, Printer, Trash2, Download, Share2 } from "lucide-react-native";
import Toast from "react-native-toast-message";

import { getSavedQRs, generateAndSaveQRs, deleteQR } from "../../API/restaurentApi";

interface QRManagerProps {
  restaurant: any; 
}

const QRManager: React.FC<QRManagerProps> = ({ restaurant }) => {
  const [tableCount, setTableCount] = useState("10");
  const [savedQRs, setSavedQRs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const qrRefs = useRef<{[key: string]: any}>({});

  useEffect(() => {
    fetchQRs();
  }, []);

  const fetchQRs = async () => {
    try {
      const res = await getSavedQRs();
      setSavedQRs(res.data.data);
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to load saved QR codes." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQR = async (id: string) => {
    try {
      await deleteQR(id);
      setSavedQRs((prev: any[]) => prev.filter((qr: any) => qr._id !== id));
      Toast.show({ type: "success", text1: "QR Code deleted successfully" });
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to delete QR code" });
    }
  };

  const handleGenerate = async () => {
    const count = parseInt(tableCount, 10);
    if (isNaN(count) || count < 1 || count > 100) {
      Toast.show({ type: "error", text1: "Please enter a number between 1 and 100" });
      return;
    }

    const tablesToGenerate = Array.from({ length: count }, (_, i) => i + 1);
    setIsGenerating(true);
    Toast.show({ type: "info", text1: "Generating QR codes..." });

    try {
      const res = await generateAndSaveQRs(tablesToGenerate);
      const newQRs = res.data.data;
      
      setSavedQRs((prev: any[]) => {
        const existingIds = new Set(prev.map((q: any) => q.tableNumber));
        const newlyAdded = newQRs.filter((q: any) => !existingIds.has(q.tableNumber));
        return [...prev, ...newlyAdded].sort((a: any, b: any) => a.tableNumber - b.tableNumber);
      });
      Toast.show({ type: "success", text1: "QR Codes generated!" });
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to generate QRs" });
    } finally {
      setIsGenerating(false);
    }
  };

  //  1. SHARE FUNCTION
  const shareProfessionalQR = async (qrId: string, tableNumber: number) => {
    try {
      const uri = await captureRef(qrRefs.current[qrId], {
        format: "png",
        quality: 1,
        result: "tmpfile", 
      });

      await RNShare.open({
        url: uri,
        title: `Table ${tableNumber} QR Code`,
        message: `Printable QR Code for Table ${tableNumber}`,
      });
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to prepare QR for sharing." });
    }
  };

  //  2. NEW: DOWNLOAD FUNCTION
  const downloadProfessionalQR = async (qrId: string, tableNumber: number) => {
    Toast.show({ type: "info", text1: `Downloading Table ${tableNumber}...` });
    try {
      // 1. Take the snapshot
      const uri = await captureRef(qrRefs.current[qrId], {
        format: "png",
        quality: 1,
        result: "tmpfile", 
      });

      // 2. Determine where to save it (Downloads folder on Android, Documents on iOS)
      const fileName = `Table_${tableNumber}_QR.png`;
      const destPath = Platform.OS === 'android' 
        ? `${RNFS.DownloadDirectoryPath}/${fileName}`
        : `${RNFS.DocumentDirectoryPath}/${fileName}`;

      // 3. Copy the temp file to the permanent location
      await RNFS.copyFile(uri, destPath);

      // 4. On Android, scan the file so it immediately appears in the Gallery/Files app
      if (Platform.OS === 'android') {
        await RNFS.scanFile(destPath);
      }

      Toast.show({ type: "success", text1: "Saved to Downloads folder!" });
    } catch (error) {
      console.error("Download Error:", error);
      Toast.show({ type: "error", text1: "Failed to download QR code." });
    }
  };

  if (isLoading) return <View style={styles.loader}><ActivityIndicator size="large" color="#f97316" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Table QR Codes</Text>
        <Text style={styles.subtitle}>Generate, save, and print table stands.</Text>
      </View>

      <View style={styles.controlCard}>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Generate up to Table #</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={tableCount}
            onChangeText={setTableCount}
          />
        </View>
        <TouchableOpacity onPress={handleGenerate} disabled={isGenerating} style={styles.generateBtn}>
          {isGenerating ? <ActivityIndicator color="#fff" /> : <QrCode size={20} color="#fff" />}
          <Text style={styles.btnText}>{isGenerating ? "Generating..." : "Generate QRs"}</Text>
        </TouchableOpacity>
      </View>

      {savedQRs.length > 0 ? (
        <View style={styles.grid}>
          {savedQRs.map((qr: any) => (
            <View key={qr._id} style={styles.qrCardWrapper}>
              
              {/* DELETE BUTTON */}
              <TouchableOpacity onPress={() => handleDeleteQR(qr._id)} style={styles.deleteBtn}>
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
              
              {/*  THE VISUAL QR CARD (With Logo Added) */}
              <View 
                ref={(el) => { qrRefs.current[qr._id] = el; }} 
                collapsable={false} 
                style={styles.qrDisplay}
              >
                <View style={styles.orangeTopBar} />
                
                {/* NEW: BhojanQR Logo */}
                <Image 
                  source={require("../../assets/logo.png")} 
                  style={styles.brandLogo} 
                />

                <Text style={styles.restName} numberOfLines={1}>{restaurant?.restaurantName || "Restaurant"}</Text>
                <Text style={styles.scanText}>SCAN TO VIEW DIGITAL MENU</Text>
                
                <Image source={{ uri: qr.qrImageUrl }} style={styles.qrImage} />
                
                <Text style={styles.tableNumberText}>TABLE {qr.tableNumber}</Text>
                <Text style={styles.helperText}>Point camera to order</Text>
              </View>

              {/*  NEW: ACTION BUTTONS ROW */}
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => downloadProfessionalQR(qr._id, qr.tableNumber)} style={styles.actionBtn}>
                  <Download size={16} color="#4b5563" />
                  <Text style={styles.actionBtnText}>Save</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity onPress={() => shareProfessionalQR(qr._id, qr.tableNumber)} style={styles.actionBtn}>
                  <Share2 size={16} color="#ea580c" />
                  <Text style={[styles.actionBtnText, { color: '#ea580c' }]}>Share</Text>
                </TouchableOpacity>
              </View>

            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <QrCode size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No QR codes saved yet. Generate them above!</Text>
        </View>
      )}
    </ScrollView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  controlCard: { backgroundColor: "#fff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", marginBottom: 24, gap: 12 },
  inputWrapper: { flex: 1 },
  label: { fontSize: 14, fontWeight: "bold", color: "#374151", marginBottom: 8 },
  input: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  generateBtn: { backgroundColor: "#ea580c", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingBottom: 40 },
  qrCardWrapper: { width: "48%", backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, overflow: 'hidden' },
  deleteBtn: { position: "absolute", top: 8, right: 8, zIndex: 10, padding: 8, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 },
  
  qrDisplay: { backgroundColor: "#fff", width: "100%", alignItems: "center", paddingBottom: 16 },
  orangeTopBar: { height: 6, width: "100%", backgroundColor: "#ea580c", marginBottom: 12 },
  
  // Brand Logo Styling
  brandLogo: { width: 80, height: 80, resizeMode: "contain"},
  
  restName: { fontSize: 14, fontWeight: "bold", color: "#1f2937", textAlign: 'center' },
  scanText: { fontSize: 8, fontWeight: "bold", color: "#ea580c", marginTop: 2, letterSpacing: 0.5 },
  qrImage: { width: 110, height: 110, marginVertical: 12 },
  tableNumberText: { fontSize: 18, fontWeight: "900", color: "#1f2937" },
  helperText: { fontSize: 8, color: "#9ca3af", marginTop: 4 },
  
  actionRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f3f4f6", backgroundColor: "#f9fafb" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6 },
  actionBtnText: { fontSize: 12, fontWeight: "bold", color: "#4b5563" },
  divider: { width: 1, backgroundColor: "#f3f4f6" },

  emptyState: { alignItems: "center", paddingVertical: 40, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  emptyText: { color: "#6b7280", marginTop: 12, fontWeight: "500" }
});

export default QRManager;