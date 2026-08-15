import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Image, StyleSheet, ActivityIndicator, Modal
} from "react-native";
//Aliased Share to RNShare to avoid conflicting with Lucide's Share icon
import RNShare from "react-native-share";
import { captureRef } from "react-native-view-shot";
import RNFS from "react-native-fs";
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import JSZip from "jszip";
import { QrCode, Trash2, Download, Share2, Plus, X } from "lucide-react-native";
import CustomModal from "../../components/CustomModal";
import Toast from "react-native-toast-message";

import { getSavedQRs, generateAndSaveQRs, deleteQR } from "../../API/restaurentApi";
import { SkeletonBlock } from "../../components/Skeleton";
import SectionError from "../../components/SectionError";

interface QRManagerProps {
  restaurant: any; 
}

const QRManager: React.FC<QRManagerProps> = ({ restaurant }) => {
  const [tableCount, setTableCount] = useState("10");
  const [savedQRs, setSavedQRs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [singleTable, setSingleTable] = useState("");
  // Which bulk job is running, so the two buttons can show progress
  // independently and neither can be started while the other is mid-flight.
  const [bulkBusy, setBulkBusy] = useState<null | "download" | "delete">(null);
  const [confirmAll, setConfirmAll] = useState<null | "delete">(null);
  // The QR being shown full screen, if any. Holds the whole record rather
  // than an id so the modal can label itself without a second lookup.
  const [previewQR, setPreviewQR] = useState<any>(null);

  const qrRefs = useRef<{[key: string]: any}>({});

  useEffect(() => {
    fetchQRs();
  }, []);

  const fetchQRs = async () => {
    try {
      setLoadError(false);
      const res = await getSavedQRs();
      setSavedQRs(res.data.data);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load saved QR codes." });
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQR = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteQR(id);
      setSavedQRs((prev: any[]) => prev.filter((qr: any) => qr._id !== id));
      Toast.show({ type: "success", text1: "QR Code deleted successfully" });
    } catch {
      Toast.show({ type: "error", text1: "Failed to delete QR code" });
    } finally {
      setDeletingId(null);
    }
  };

  // The generate endpoint takes an ARRAY of table numbers, so both modes go
  // through it: "up to N" sends 1..N, "just this one" sends a single-element
  // array. The server skips tables that already have a QR either way, so
  // re-running it never duplicates or regenerates an existing code.
  const runGenerate = async (tablesToGenerate: number[], successText: string) => {
    setIsGenerating(true);
    try {
      const res = await generateAndSaveQRs(tablesToGenerate);
      const newQRs = res.data.data;
      
      setSavedQRs((prev: any[]) => {
        const existingIds = new Set(prev.map((q: any) => q.tableNumber));
        const newlyAdded = newQRs.filter((q: any) => !existingIds.has(q.tableNumber));
        return [...prev, ...newlyAdded].sort((a: any, b: any) => a.tableNumber - b.tableNumber);
      });
      Toast.show({ type: "success", text1: successText });
    } catch {
      Toast.show({ type: "error", text1: "Failed to generate QRs" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRange = () => {
    const count = parseInt(tableCount, 10);
    if (isNaN(count) || count < 1 || count > 100) {
      Toast.show({ type: "error", text1: "Enter a number between 1 and 100" });
      return;
    }
    runGenerate(
      Array.from({ length: count }, (_, i) => i + 1),
      "QR codes generated",
    );
  };

  const handleGenerateSingle = () => {
    const table = parseInt(singleTable, 10);
    if (isNaN(table) || table < 1 || table > 100) {
      Toast.show({ type: "error", text1: "Enter a table number between 1 and 100" });
      return;
    }
    if (savedQRs.some((qr: any) => qr.tableNumber === table)) {
      Toast.show({ type: "info", text1: `Table ${table} already has a QR code` });
      return;
    }
    runGenerate([table], `Table ${table} QR created`);
    setSingleTable("");
  };

  // No bulk-delete route exists server-side, so this walks the list one at a
  // time. Sequential rather than parallel on purpose: each delete also drops a
  // Cloudinary asset and busts two cache keys, and firing 100 of those at once
  // is how you get partial failures that are hard to reason about afterwards.
  const handleDeleteAll = async () => {
    setConfirmAll(null);
    setBulkBusy("delete");
    const failed: number[] = [];
    for (const qr of [...savedQRs]) {
      try {
        await deleteQR(qr._id);
        setSavedQRs((prev: any[]) => prev.filter((q: any) => q._id !== qr._id));
      } catch {
        failed.push(qr.tableNumber);
      }
    }
    setBulkBusy(null);
    if (failed.length) {
      Toast.show({
        type: "error",
        text1: `${failed.length} could not be deleted`,
        text2: `Tables ${failed.join(", ")}`,
      });
    } else {
      Toast.show({ type: "success", text1: "All QR codes deleted" });
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
    } catch {
      Toast.show({ type: "error", text1: "Failed to prepare QR for sharing." });
    }
  };

  // Snapshot one card to a temp PNG. Nothing here touches shared storage.
  const captureQR = (qrId: string) =>
    captureRef(qrRefs.current[qrId], { format: "png", quality: 1, result: "tmpfile" });

  // Saves a single QR into the device's photo library.
  //
  // This used to RNFS.copyFile() straight into /storage/emulated/0/Download,
  // which cannot work: the app targets SDK 36, so scoped storage is enforced
  // and writing into shared storage by path is refused outright (and
  // requestLegacyExternalStorage is ignored above target 30). That is why
  // downloads silently failed. CameraRoll goes through MediaStore instead,
  // which is the supported route and needs no storage permission for media
  // this app created.
  const saveQRToGallery = async (qrId: string, tableNumber: number) => {
    const uri = await captureQR(qrId);
    // saveAsset, not the deprecated save(). Grouping them into their own album
    // keeps a venue's 40 table codes out of the owner's camera roll proper.
    await CameraRoll.saveAsset(uri, { type: "photo", album: "BhojanQR" });
    return tableNumber;
  };

  // Every QR into one zip, named after the restaurant.
  //
  // The zip is written to the app's own cache directory - the only place a
  // scoped-storage app can freely write - and then handed to the share sheet,
  // which is how a non-media file reaches Downloads, Drive or anywhere else
  // on a modern Android. There is no API to drop a .zip straight into the
  // Downloads folder by path without a native MediaStore module.
  const handleDownloadAll = async () => {
    if (savedQRs.length === 0) return;
    setBulkBusy("download");

    const failed: number[] = [];
    try {
      const zip = new JSZip();

      for (const qr of savedQRs) {
        try {
          const uri = await captureQR(qr._id);
          // JSZip works on data, not paths, so the PNG is read back as base64.
          const base64 = await RNFS.readFile(uri.replace("file://", ""), "base64");
          zip.file(`Table_${qr.tableNumber}_QR.png`, base64, { base64: true });
        } catch {
          failed.push(qr.tableNumber);
        }
      }

      if (failed.length === savedQRs.length) {
        throw new Error("Nothing could be captured");
      }

      const safeName = (restaurant?.restaurantName || "Restaurant")
        // Strip anything a filesystem or share target might choke on.
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .trim() || "Restaurant";
      const zipName = `${safeName} - qr code.zip`;
      const zipPath = `${RNFS.CachesDirectoryPath}/${zipName}`;

      const content = await zip.generateAsync({ type: "base64" });
      await RNFS.writeFile(zipPath, content, "base64");

      await RNShare.open({
        url: `file://${zipPath}`,
        type: "application/zip",
        filename: zipName,
        title: zipName,
        failOnCancel: false,
      });

      if (failed.length) {
        Toast.show({
          type: "info",
          text1: `${savedQRs.length - failed.length} of ${savedQRs.length} included`,
          text2: `Skipped tables ${failed.join(", ")}`,
        });
      }
    } catch {
      Toast.show({ type: "error", text1: "Could not build the ZIP file" });
    } finally {
      setBulkBusy(null);
    }
  };

  const downloadProfessionalQR = async (qrId: string, tableNumber: number) => {
    try {
      await saveQRToGallery(qrId, tableNumber);
      Toast.show({
        type: "success",
        text1: `Table ${tableNumber} saved`,
        text2: "Find it in your gallery, album \"BhojanQR\"",
      });
    } catch (error) {
      console.error("Download Error:", error);
      Toast.show({ type: "error", text1: "Failed to save QR code." });
    }
  };

  if (isLoading) {
    return (
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.container}>
        <View style={styles.header}>
          <SkeletonBlock width="60%" height={28} borderRadius={6} />
          <SkeletonBlock width="80%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
        <SkeletonBlock height={88} borderRadius={16} style={{ marginBottom: 24 }} />
        <View style={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.qrCardWrapper, { padding: 16, alignItems: "center", gap: 10 }]}>
              <SkeletonBlock width={80} height={80} borderRadius={12} />
              <SkeletonBlock width="70%" height={12} borderRadius={6} />
              <SkeletonBlock width={110} height={110} borderRadius={8} />
              <SkeletonBlock width="40%" height={14} borderRadius={6} />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container}>
      {/* <View style={styles.header}>
        <Text style={styles.title}>Table QR Codes</Text>
        <Text style={styles.subtitle}>Generate, save, and print table stands.</Text>
      </View> */}

      <View style={styles.controlCard}>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Generate up to Table #</Text>
          <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
            style={styles.input}
            keyboardType="number-pad"
            value={tableCount}
            onChangeText={setTableCount}
          />
        </View>
        <TouchableOpacity onPress={handleGenerateRange} disabled={isGenerating} style={styles.generateBtn}>
          {isGenerating ? <ActivityIndicator size="small" color="#fff" /> : <QrCode size={20} color="#fff" />}
          <Text style={styles.btnText}>{isGenerating ? "Generating..." : "Generate QRs"}</Text>
        </TouchableOpacity>
      </View>

      {/* Single table, for the common case of adding one more table to a
          venue that already has its codes printed - the range button above
          would be a blunt instrument for that. */}
      <View style={styles.controlCard}>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Or one specific table</Text>
          <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
            style={styles.input}
            keyboardType="number-pad"
            placeholder="e.g. 12"
            placeholderTextColor="#b8bec9"
            value={singleTable}
            onChangeText={setSingleTable}
          />
        </View>
        <TouchableOpacity
          onPress={handleGenerateSingle}
          disabled={isGenerating || !singleTable}
          style={[styles.singleBtn, (isGenerating || !singleTable) && styles.singleBtnDisabled]}
        >
          <Plus size={18} color={!singleTable ? "#9ca3af" : "#ea580c"} />
          <Text style={[styles.singleBtnText, !singleTable && styles.singleBtnTextDisabled]}>Add</Text>
        </TouchableOpacity>
      </View>

      {savedQRs.length > 0 && (
        <View style={styles.bulkBar}>
          <TouchableOpacity
            style={styles.bulkBtn}
            onPress={handleDownloadAll}
            disabled={!!bulkBusy}
            activeOpacity={0.8}
          >
            {bulkBusy === "download" ? (
              <ActivityIndicator size="small" color="#4b5563" />
            ) : (
              <Download size={15} color="#4b5563" />
            )}
            <Text style={styles.bulkBtnText}>
              {bulkBusy === "download" ? "Saving…" : `Download all (${savedQRs.length})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bulkBtn, styles.bulkBtnDanger]}
            onPress={() => setConfirmAll("delete")}
            disabled={!!bulkBusy}
            activeOpacity={0.8}
          >
            {bulkBusy === "delete" ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Trash2 size={15} color="#ef4444" />
            )}
            <Text style={[styles.bulkBtnText, styles.bulkBtnTextDanger]}>
              {bulkBusy === "delete" ? "Deleting…" : "Delete all"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <CustomModal
        visible={confirmAll === "delete"}
        type="logout"
        title="Delete all QR codes?"
        message={`All ${savedQRs.length} table code${savedQRs.length === 1 ? "" : "s"} will be removed. Any printed codes already on tables will stop working.`}
        confirmText="Delete all"
        cancelText="Keep them"
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmAll(null)}
      />

      {savedQRs.length > 0 ? (
        <View style={styles.grid}>
          {savedQRs.map((qr: any) => (
            <View key={qr._id} style={styles.qrCardWrapper}>
              
              {/* DELETE BUTTON */}
              <TouchableOpacity
                onPress={() => handleDeleteQR(qr._id)}
                disabled={deletingId === qr._id}
                style={styles.deleteBtn}
              >
                {deletingId === qr._id ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Trash2 size={16} color="#ef4444" />
                )}
              </TouchableOpacity>
              
              {/* Tapping the card opens it full screen - the grid renders two
                  per row, which is far too small to actually test a scan.
                  The ref stays on the inner View so captureRef still snapshots
                  the printable card, not the touchable wrapper. */}
              <TouchableOpacity activeOpacity={0.85} onPress={() => setPreviewQR(qr)}>
                <View
                  ref={(el) => { qrRefs.current[qr._id] = el; }}
                  collapsable={false}
                  style={styles.qrDisplay}
                >
                  <View style={styles.orangeTopBar} />

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
              </TouchableOpacity>

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
      ) : loadError ? (
        <View style={styles.emptyState}>
          <SectionError message="Failed to load saved QR codes." onRetry={fetchQRs} />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <QrCode size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No QR codes saved yet. Generate them above!</Text>
        </View>
      )}

      {/* Full-screen view. Shows the raw QR on white at maximum size, since
          the point of opening it is to actually scan or photograph it. */}
      <Modal
        visible={!!previewQR}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewQR(null)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewQR(null)}>
            <X size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.previewCard}>
            <Text style={styles.previewRest} numberOfLines={1}>
              {restaurant?.restaurantName || "Restaurant"}
            </Text>
            <Image source={{ uri: previewQR?.qrImageUrl }} style={styles.previewQR} resizeMode="contain" />
            <Text style={styles.previewTable}>TABLE {previewQR?.tableNumber}</Text>
          </View>

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => {
                if (previewQR) downloadProfessionalQR(previewQR._id, previewQR.tableNumber);
              }}
            >
              <Download size={16} color="#1f2937" />
              <Text style={styles.previewBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => {
                if (previewQR) shareProfessionalQR(previewQR._id, previewQR.tableNumber);
              }}
            >
              <Share2 size={16} color="#ea580c" />
              <Text style={[styles.previewBtnText, styles.previewBtnTextAccent]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Outlined rather than filled: adding one table is a smaller action than
  // generating a whole range, and two solid orange buttons stacked would give
  // them equal weight.
  singleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  singleBtnDisabled: { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },
  singleBtnText: { color: "#ea580c", fontWeight: "800", fontSize: 15 },
  singleBtnTextDisabled: { color: "#9ca3af" },

  bulkBar: { flexDirection: "row", gap: 10, marginBottom: 20 },
  bulkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  bulkBtnDanger: { backgroundColor: "#fef2f2", borderColor: "#fee2e2" },
  bulkBtnText: { fontSize: 13, fontWeight: "800", color: "#4b5563" },
  bulkBtnTextDanger: { color: "#ef4444" },


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

  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  previewClose: { position: "absolute", top: 40, right: 20, zIndex: 10, padding: 10 },
  previewCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  previewRest: { fontSize: 18, fontWeight: "900", color: "#1f2937", marginBottom: 18 },
  // Square and as wide as the card allows: this is the whole reason for
  // opening full screen, so it gets the space.
  previewQR: { width: "100%", aspectRatio: 1, maxHeight: 380 },
  previewTable: { fontSize: 22, fontWeight: "900", color: "#ea580c", marginTop: 18, letterSpacing: 1 },
  previewActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  previewBtnText: { fontSize: 14, fontWeight: "800", color: "#1f2937" },
  previewBtnTextAccent: { color: "#ea580c" },

  emptyState: { alignItems: "center", paddingVertical: 40, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  emptyText: { color: "#6b7280", marginTop: 12, fontWeight: "500" }
});

export default QRManager;