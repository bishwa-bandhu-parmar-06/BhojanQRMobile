import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Image, StyleSheet, ActivityIndicator } from "react-native";
import Toast from "react-native-toast-message";
import { Utensils, IndianRupee, AlignLeft, ImagePlus, Save, X, UploadCloud } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import { launchImageLibrary } from "react-native-image-picker";
import { addMenuItem, updateMenuItem } from "../../API/menuApi";

// FIX 1: Define the props interface
interface MenuFormProps {
  menuItem?: any;
  onCancel: () => void;
  onSuccess: (data?: any) => void;
}

const MenuForm: React.FC<MenuFormProps> = ({ menuItem, onCancel, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // FIX 2: Tell TS this state can be a string, undefined, or null
  const [imagePreview, setImagePreview] = useState<string | null | undefined>(null);

  // FIX 3: Tell TS this object can hold anything, so assigning an Asset to 'image' won't fail
  const [formData, setFormData] = useState<any>({ 
    name: "", 
    price: "", 
    category: "Main Course", 
    description: "", 
    image: null, 
    available: true 
  });

  useEffect(() => {
    if (menuItem) {
      setFormData({ 
        name: menuItem.name || "", 
        price: menuItem.price?.toString() || "", 
        category: menuItem.category || "Main Course", 
        description: menuItem.description || "", 
        image: null, 
        available: menuItem.available ?? true 
      });
      if (menuItem.imageUrl) {
        setImagePreview(menuItem.imageUrl);
      }
    }
  }, [menuItem]);

  const handleImagePick = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      setFormData({ ...formData, image: result.assets[0] });
      setImagePreview(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!formData.name || !formData.price || !formData.category) return Toast.show({ type: "error", text1: "Fill required fields." });
    if (!menuItem && !formData.image) return Toast.show({ type: "error", text1: "Upload an image." });

    setIsSubmitting(true);
    try {
      const dataToSend = new FormData();
      dataToSend.append("name", formData.name);
      dataToSend.append("price", formData.price);
      dataToSend.append("category", formData.category);
      dataToSend.append("description", formData.description);
      // FormData requires strings
      dataToSend.append("available", formData.available ? "true" : "false");

      if (formData.image) {
        // Cast to 'any' to bypass React Native FormData strict typing limitations
        dataToSend.append("image", { 
          uri: formData.image.uri, 
          type: formData.image.type, 
          name: formData.image.fileName || 'photo.jpg' 
        } as any);
      }

      let res = menuItem ? await updateMenuItem(menuItem._id, dataToSend) : await addMenuItem(dataToSend);
      Toast.show({ type: "success", text1: `Menu item ${menuItem ? "updated" : "added"}!` });
      onSuccess(res.data.data);
    } catch (error: any) { // FIX 4: Explicitly type the error as 'any'
      Toast.show({ type: "error", text1: "Operation failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBox}><Utensils size={24} color="#ea580c" /></View>
        <View>
          <Text style={styles.title}>{menuItem ? "Edit Menu Item" : "Add New Item"}</Text>
          <Text style={styles.subtitle}>{menuItem ? "Update details." : "Craft a new dish."}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Item Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. Paneer Butter Masala" value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Price *</Text>
            <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={formData.price} onChangeText={(t) => setFormData({ ...formData, price: t })} />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={formData.category} onValueChange={(t) => setFormData({ ...formData, category: t })} style={{ height: 48 }}>
                <Picker.Item label="Main Course" value="Main Course" /><Picker.Item label="Starter" value="Starter" />
                <Picker.Item label="Dessert" value="Dessert" /><Picker.Item label="Beverage" value="Beverage" />
              </Picker>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Briefly describe..." value={formData.description} onChangeText={(t) => setFormData({ ...formData, description: t })} />

        <Text style={styles.label}>Item Image {!menuItem && "*"}</Text>
        <TouchableOpacity style={styles.imageArea} onPress={handleImagePick}>
          {imagePreview ? <Image source={{ uri: imagePreview }} style={styles.preview} /> : (
            <View style={{ alignItems: "center" }}><ImagePlus color="#ea580c" size={32} /><Text style={styles.imgText}>Tap to upload</Text></View>
          )}
        </TouchableOpacity>

        <View style={styles.toggleRow}>
          <View><Text style={styles.label}>Availability</Text><Text style={styles.subtitle}>Hide if out of stock.</Text></View>
          <Switch value={formData.available} onValueChange={(val) => setFormData({ ...formData, available: val })} trackColor={{ true: "#ea580c" }} />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={handleSubmit} style={styles.saveBtn}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <><Save size={18} color="#fff" /><Text style={styles.saveText}>Save</Text></>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#f3f4f6" },
  iconBox: { padding: 10, backgroundColor: "#fff7ed", borderRadius: 12, marginRight: 12 },
  title: { fontSize: 20, fontWeight: "bold", color: "#ea580c" },
  subtitle: { fontSize: 12, color: "#6b7280" },
  body: { padding: 16, backgroundColor: "#f9fafb" },
  label: { fontSize: 14, fontWeight: "bold", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  pickerWrap: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, marginBottom: 16, justifyContent: "center" },
  imageArea: { height: 160, borderWidth: 2, borderColor: "#d1d5db", borderStyle: "dashed", borderRadius: 16, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: 16 },
  preview: { width: "100%", height: "100%" },
  imgText: { marginTop: 8, fontWeight: "bold", color: "#6b7280" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  footer: { flexDirection: "row", justifyContent: "flex-end", padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#f3f4f6", gap: 12 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  cancelText: { fontWeight: "bold", color: "#4b5563" },
  saveBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#ea580c", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, gap: 8 },
  saveText: { fontWeight: "bold", color: "#fff" }
});

export default MenuForm;