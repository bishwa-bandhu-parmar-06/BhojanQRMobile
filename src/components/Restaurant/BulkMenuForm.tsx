import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet, ActivityIndicator } from "react-native";
import Toast from "react-native-toast-message";
import { Plus, Trash2, Save, X, UploadCloud, FileSpreadsheet } from "lucide-react-native";
import { addMenuItem } from "../../API/menuApi";
import * as XLSX from "xlsx";
import RNFS from "react-native-fs";
import { Picker } from "@react-native-picker/picker";
import { launchImageLibrary } from "react-native-image-picker";

// FIX: Clean import for the modern package
import { pick, types } from "@react-native-documents/picker";

interface BulkMenuFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const BulkMenuForm: React.FC<BulkMenuFormProps> = ({ onCancel, onSuccess }) => {
  const [items, setItems] = useState<any[]>([
    { id: Date.now(), name: "", price: "", category: "Main Course", description: "", image: null, preview: null },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleChange = (id: number, field: string, value: string) => {
    setItems((prev: any[]) => prev.map((item: any) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleImageChange = async (id: number) => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      const file = result.assets[0];
      setItems((prev: any[]) => prev.map((item: any) => item.id === id ? { ...item, image: file, preview: file.uri } : item));
    }
  };

  const addNewRow = () => {
    setItems((prev: any[]) => [
      ...prev, 
      { id: Date.now(), name: "", price: "", category: "Main Course", description: "", image: null, preview: null }
    ]);
  };

  const removeRow = (id: number) => {
    if (items.length === 1) return Toast.show({ type: "error", text1: "You need at least one item." });
    setItems((prev: any[]) => prev.filter((item: any) => item.id !== id));
  };

  const handleFileUpload = async () => {
    try {
      // FIX: Changed 'DocumentPicker.pick' to just 'pick' to match the import
      const [res] = (await pick({ 
        type: [types.allFiles] 
      })) as any;
      
      const base64Data = await RNFS.readFile(res.uri, 'base64');
      const workbook = XLSX.read(base64Data, { type: "base64" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) return Toast.show({ type: "error", text1: "The Excel file is empty!" });

      const importedItems = jsonData.map((row: any, index: number) => ({
        id: Date.now() + index,
        name: row.Name || row.name || "",
        price: (row.Price || row.price || "").toString(),
        category: row.Category || row.category || "Main Course",
        description: row.Description || row.description || "",
        image: null,
        preview: row.ImageURL || row["Image URL"] || null,
      }));

      setItems((prev: any[]) => (prev.length === 1 && !prev[0].name && !prev[0].price) ? importedItems : [...prev, ...importedItems]);
      Toast.show({ type: "success", text1: `Imported ${importedItems.length} items! Attach images next.` });
     } catch (error: any) { 
      if (error.code !== 'DOCUMENTS_PICKER_CANCELED') {
        Toast.show({ type: "error", text1: "Failed to read Excel file." });
      }
    }
  };

  const handleBulkSubmit = async () => {
    const invalidItem = items.find((item: any) => !item.name || !item.price || !item.image);
    if (invalidItem) return Toast.show({ type: "error", text1: "Ensure all items have a name, price, and image." });

    setIsUploading(true);
    setProgress(0);
    let successCount = 0;

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const formData = new FormData();
        formData.append("name", item.name);
        formData.append("price", item.price);
        formData.append("category", item.category);
        formData.append("description", item.description);
        formData.append("available", "true"); 
        formData.append("image", { uri: item.image.uri, type: item.image.type, name: item.image.fileName || `image_${i}.jpg` } as any);

        await addMenuItem(formData);
        successCount++;
        setProgress(successCount);
      }
      Toast.show({ type: "success", text1: `Added ${successCount} items!` });
      onSuccess();
    } catch (error: any) { 
      Toast.show({ type: "error", text1: `Stopped. Uploaded ${successCount} items.` });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Bulk Add Menu Items</Text>
          <Text style={styles.subtitle}>Add rows manually or import an Excel file.</Text>
        </View>
        <TouchableOpacity onPress={onCancel} disabled={isUploading}><X size={24} color="#9ca3af" /></TouchableOpacity>
      </View>

      {isUploading && (
        <View style={styles.uploadingBox}>
          <Text style={styles.uploadingText}>Uploading... {progress} / {items.length} completed</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(progress / items.length) * 100}%` }]} />
          </View>
        </View>
      )}

      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {items.map((item: any) => (
          <View key={item.id} style={styles.rowCard}>
            <TouchableOpacity onPress={() => handleImageChange(item.id)} disabled={isUploading} style={styles.imageBox}>
              {item.preview ? <Image source={{ uri: item.preview }} style={styles.previewImg} /> : <UploadCloud color="#9ca3af" size={24} />}
            </TouchableOpacity>

            <View style={styles.inputsColumn}>
              <TextInput style={styles.input} placeholder="Item Name *" value={item.name} onChangeText={(v) => handleChange(item.id, "name", v)} editable={!isUploading} />
              <TextInput style={styles.input} placeholder="Price *" keyboardType="numeric" value={item.price} onChangeText={(v) => handleChange(item.id, "price", v)} editable={!isUploading} />
              <View style={styles.pickerContainer}>
                <Picker selectedValue={item.category} onValueChange={(v) => handleChange(item.id, "category", v)} enabled={!isUploading}>
                  <Picker.Item label="Main Course" value="Main Course" /><Picker.Item label="Starter" value="Starter" />
                  <Picker.Item label="Dessert" value="Dessert" /><Picker.Item label="Beverage" value="Beverage" />
                </Picker>
              </View>
              <TextInput style={styles.input} placeholder="Description" value={item.description} onChangeText={(v) => handleChange(item.id, "description", v)} editable={!isUploading} />
            </View>

            <TouchableOpacity onPress={() => removeRow(item.id)} disabled={isUploading} style={styles.deleteBtn}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <TouchableOpacity onPress={addNewRow} disabled={isUploading} style={styles.addRowBtn}>
            <Plus size={18} color="#ea580c" /><Text style={styles.addRowText}>Add Row</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFileUpload} disabled={isUploading} style={styles.importBtn}>
            <FileSpreadsheet size={18} color="#15803d" /><Text style={styles.importText}>Import Excel</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleBulkSubmit} disabled={isUploading} style={styles.submitBtn}>
          {isUploading ? <ActivityIndicator color="#fff" /> : <><Save size={18} color="#fff" /><Text style={styles.submitText}>Upload All</Text></>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  subtitle: { fontSize: 12, color: "#6b7280" },
  uploadingBox: { backgroundColor: "#fff7ed", padding: 12, borderRadius: 12, marginBottom: 16 },
  uploadingText: { fontSize: 12, fontWeight: "bold", color: "#ea580c", marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: "#fed7aa", borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: "#ea580c", borderRadius: 4 },
  list: { flex: 1 },
  rowCard: { flexDirection: "column", backgroundColor: "#f9fafb", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 12, position: "relative" },
  imageBox: { height: 100, backgroundColor: "#fff", borderWidth: 2, borderColor: "#d1d5db", borderStyle: "dashed", borderRadius: 8, justifyContent: "center", alignItems: "center", marginBottom: 12, overflow: "hidden" },
  previewImg: { width: "100%", height: "100%" },
  inputsColumn: { gap: 8 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, fontSize: 14 },
  pickerContainer: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, overflow: "hidden" },
  deleteBtn: { position: "absolute", top: 12, right: 12, padding: 8, backgroundColor: "#fee2e2", borderRadius: 8 },
  footer: { borderTopWidth: 1, borderColor: "#f3f4f6", paddingTop: 16, gap: 12 },
  footerRow: { flexDirection: "row", gap: 8 },
  addRowBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#fff7ed", padding: 10, borderRadius: 8 },
  addRowText: { color: "#ea580c", fontWeight: "bold", marginLeft: 8 },
  importBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#f0fdf4", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#bbf7d0" },
  importText: { color: "#15803d", fontWeight: "bold", marginLeft: 8 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#ea580c", padding: 14, borderRadius: 12 },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 16, marginLeft: 8 }
});

export default BulkMenuForm;