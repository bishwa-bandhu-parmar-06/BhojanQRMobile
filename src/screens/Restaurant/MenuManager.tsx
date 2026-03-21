import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  ScrollView,
 
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context"; 
import Toast from "react-native-toast-message";
import { Plus, X, Layers } from "lucide-react-native";

import {
  getMyMenu,
  deleteMenuItem,
  updateMenuAvailability,
} from "../../API/menuApi";

import MenuList from "../../components/Restaurant/MenuList";
import MenuForm from "../../components/Restaurant/MenuForm";
import BulkMenuForm from "../../components/Restaurant/BulkMenuForm";

const MenuManager = () => {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await getMyMenu();
      const items = response?.data?.menuItems || response?.data?.data || [];
      setMenuItems(items);
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to load menu items" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const handleAddClick = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchMenuItems();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMenuItem(id);
      Toast.show({ type: "success", text1: "Item deleted successfully!" });
      fetchMenuItems();
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to delete item" });
    }
  };

  const handleToggleAvailable = async (id: string, newStatus: boolean) => {
    try {
      await updateMenuAvailability(id);
      Toast.show({ 
        type: "success", 
        text1: `Item marked as ${newStatus ? "Available" : "Unavailable"}` 
      });
      fetchMenuItems();
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to update availability" });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* IMPORTANT: Maine header ko alag rakha hai aur MenuList ko flex:1 diya hai. 
         MenuList ke andar agar FlatList hai, toh wo makkhan ki tarah chalega bina warning ke.
      */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Manage Menu</Text>
          <Text style={styles.subtitle}>
            View, add, edit, and organize your dishes.
          </Text>
        </View>
        
        {!showBulkForm && (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => setShowBulkForm(true)} style={styles.bulkButton}>
              <Layers size={18} color="#ea580c" />
              <Text style={styles.bulkButtonText}>Bulk Add</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleAddClick} style={styles.addButton}>
              <Plus size={18} color="#ffffff" />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.mainContent}>
  {showBulkForm ? (
    <ScrollView 
      style={styles.bulkFormWrapper} 
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
       <BulkMenuForm 
         onCancel={() => setShowBulkForm(false)} 
         onSuccess={() => {
           setShowBulkForm(false);
           fetchMenuItems(); 
         }} 
       />
    </ScrollView>
  ) : (
    
    <MenuList
      items={menuItems}
      loading={loading}
      onEdit={handleEditClick}
      onDelete={handleDelete}
      onToggleAvailable={handleToggleAvailable}
    />
  )}
</View>

      {/* MODAL SECTION */}
      <Modal visible={isModalOpen} transparent={true} animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.closeButton}>
              <X size={20} color="#4b5563" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <MenuForm menuItem={editingItem} onCancel={() => setIsModalOpen(false)} onSuccess={handleFormSuccess} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { padding: 16, gap: 16 },
  headerTextContainer: { marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1f2937" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  actionButtons: { flexDirection: "row", gap: 12 },
  bulkButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#ffffff", borderWidth: 2, borderColor: "#ea580c", paddingVertical: 10, borderRadius: 12, elevation: 2 },
  bulkButtonText: { color: "#ea580c", fontWeight: "600", fontSize: 14 },
  addButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#ea580c", paddingVertical: 10, borderRadius: 12, elevation: 2 },
  addButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  mainContent: { flex: 1 },
  bulkFormWrapper: { flex: 1, paddingHorizontal: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalContent: { backgroundColor: "#ffffff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90%", elevation: 10, position: "relative" },
  closeButton: { position: "absolute", top: 16, right: 16, zIndex: 10, padding: 8, backgroundColor: "#f3f4f6", borderRadius: 20 },
  modalScrollContent: { padding: 24, paddingTop: 48 },
});

export default MenuManager;