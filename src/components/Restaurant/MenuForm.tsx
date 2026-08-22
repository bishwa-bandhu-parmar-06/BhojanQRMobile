import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Image, StyleSheet, ActivityIndicator } from "react-native";
import Toast from "react-native-toast-message";
import { Utensils, ImagePlus, Save } from "lucide-react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { addMenuItem, updateMenuItem, getMenuCategories } from "../../API/menuApi";
import { DIETARY_TAGS, ALLERGENS, SPICE_LEVELS, DEFAULT_MENU_CATEGORIES } from "../../constants/foodTags";
import CategorySelect from "./CategorySelect";

interface MenuFormProps {
  menuItem?: any;
  onCancel: () => void;
  onSuccess: (data?: any) => void;
}

const MenuForm: React.FC<MenuFormProps> = ({ menuItem, onCancel, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [imagePreview, setImagePreview] = useState<string | null | undefined>(null);

  // Seeded with the defaults so the field is usable on the very first frame,
  // then replaced by the live list (defaults + this restaurant's own custom
  // categories) once it arrives.
  const [categories, setCategories] = useState<string[]>(DEFAULT_MENU_CATEGORIES);

  const [formData, setFormData] = useState<any>({
    name: "",
    price: "",
    category: "Main Course",
    description: "",
    image: null,
    available: true,
    dietaryTags: [] as string[],
    allergens: [] as string[],
    spiceLevel: null as string | null,
  });

  useEffect(() => {
    if (menuItem) {
      setFormData({
        name: menuItem.name || "",
        price: menuItem.price?.toString() || "",
        category: menuItem.category || "Main Course",
        description: menuItem.description || "",
        image: null,
        available: menuItem.available ?? true,
        dietaryTags: menuItem.dietaryTags || [],
        allergens: menuItem.allergens || [],
        spiceLevel: menuItem.spiceLevel || null,
      });
      if (menuItem.imageUrl) {
        setImagePreview(menuItem.imageUrl);
      }
    }
  }, [menuItem]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await getMenuCategories();
        if (res?.data?.data?.length) setCategories(res.data.data);
      } catch {
        // Defaults are already in state - a failed lookup costs the custom
        // categories, not the field itself, so there is nothing to report.
      }
    };
    loadCategories();
  }, []);

  // A category typed into the dropdown is only persisted once an item is
  // saved under it, so it goes into the local list immediately - otherwise it
  // would vanish from the options the moment the sheet closed.
  const handleAddCategory = (newCategory: string) => {
    setCategories((prev) => [...prev, newCategory]);
  };

  const toggleInArray = (field: "dietaryTags" | "allergens", value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v: string) => v !== value)
        : [...prev[field], value],
    }));
  };

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
      // Multipart cannot carry raw arrays, so these go as JSON strings - the
      // same shape the web dashboard sends and the shape parseTagArray()
      // expects on the server. spiceLevel is sent as "" when unset because
      // parseSpiceLevel() maps anything outside SPICE_LEVELS back to null.
      dataToSend.append("dietaryTags", JSON.stringify(formData.dietaryTags));
      dataToSend.append("allergens", JSON.stringify(formData.allergens));
      dataToSend.append("spiceLevel", formData.spiceLevel || "");

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
    } catch {
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
        <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={styles.input} placeholder="e.g. Paneer Butter Masala" value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} />

        <Text style={styles.label}>Price *</Text>
        <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={styles.input} placeholder="0.00" keyboardType="numeric" value={formData.price} onChangeText={(t) => setFormData({ ...formData, price: t })} />

        {/* Price and Category used to share one two-up row, which left the
            category field about 156dp wide on a 360dp phone - not enough for
            "Main Course", let alone a custom category name. Full width. */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.fieldSpacer}>
          <CategorySelect
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
            categories={categories}
            onAddCategory={handleAddCategory}
          />
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={[styles.input, styles.textArea]} multiline placeholder="Briefly describe..." value={formData.description} onChangeText={(t) => setFormData({ ...formData, description: t })} />

        {/* Three chip groups, matching the web dashboard field for field and
            colour for colour: green for dietary, amber for allergens, orange
            for spice. Customers filter and get warned on exactly these, so a
            dish saved from a phone has to carry the same labels as one saved
            from a browser. */}
        <Text style={styles.label}>Dietary Tags</Text>
        <View style={styles.chipRow}>
          {DIETARY_TAGS.map((tag) => {
            const on = formData.dietaryTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleInArray("dietaryTags", tag)}
                style={[styles.chip, on && styles.chipDietaryOn]}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Contains Allergens</Text>
        <View style={styles.chipRow}>
          {ALLERGENS.map((allergen) => {
            const on = formData.allergens.includes(allergen);
            return (
              <TouchableOpacity
                key={allergen}
                onPress={() => toggleInArray("allergens", allergen)}
                style={[styles.chip, on && styles.chipAllergenOn]}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{allergen}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Single-select, and tapping the active one clears it - spice level
            is genuinely optional, so there has to be a way back to "none". */}
        <Text style={styles.label}>Spice Level</Text>
        <View style={styles.chipRow}>
          {SPICE_LEVELS.map((level) => {
            const on = formData.spiceLevel === level;
            return (
              <TouchableOpacity
                key={level}
                onPress={() => setFormData((prev: any) => ({ ...prev, spiceLevel: prev.spiceLevel === level ? null : level }))}
                style={[styles.chip, on && styles.chipSpiceOn]}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{level}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} disabled={isSubmitting}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={handleSubmit} style={styles.saveBtn} disabled={isSubmitting}>
          {isSubmitting ? (
            <><ActivityIndicator size="small" color="#fff" /><Text style={styles.saveText}>Saving...</Text></>
          ) : (
            <><Save size={18} color="#fff" /><Text style={styles.saveText}>Save</Text></>
          )}
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
  textArea: { height: 80, textAlignVertical: "top" },
  fieldSpacer: { marginBottom: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#4b5563" },
  chipTextOn: { color: "#fff" },
  chipDietaryOn: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  chipAllergenOn: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  chipSpiceOn: { backgroundColor: "#f97316", borderColor: "#f97316" },
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