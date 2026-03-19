import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  ScrollView,
  SafeAreaView
} from "react-native";
import Toast from "react-native-toast-message";
import { Plus, X, Layers } from "lucide-react-native";

import {
  getMyMenu,
  deleteMenuItem,
  updateMenuAvailability,
} from "../../API/menuApi";

// Note: Ensure these components are also converted to React Native!
import MenuList from "../../components/Restaurant/MenuList";
import MenuForm from "../../components/Restaurant/MenuForm";
import BulkMenuForm from "../../components/Restaurant/BulkMenuForm";

const MenuManager = () => {
  // FIX: Added <any[]> to prevent never[] errors
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  // FIX: Added <any> to prevent 'possibly null' errors later
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Bulk Form State
  const [showBulkForm, setShowBulkForm] = useState(false);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await getMyMenu();
      const items = response?.data?.menuItems || response?.data?.data || [];
      setMenuItems(items);
    } catch (error: any) { // FIX: Added : any
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

  // FIX: Explicitly typed 'item' as 'any'
  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchMenuItems();
  };

  // FIX: Explicitly typed 'id' as 'string'
  const handleDelete = async (id: string) => {
    try {
      await deleteMenuItem(id);
      Toast.show({ type: "success", text1: "Item deleted successfully!" });
      fetchMenuItems();
    } catch (error: any) { // FIX: Added : any
      Toast.show({ type: "error", text1: "Failed to delete item" });
    }
  };

  // FIX: Explicitly typed 'id' as 'string' and 'newStatus' as 'boolean'
  const handleToggleAvailable = async (id: string, newStatus: boolean) => {
    try {
      await updateMenuAvailability(id);
      Toast.show({ 
        type: "success", 
        text1: `Item marked as ${newStatus ? "Available" : "Unavailable"}` 
      });
      fetchMenuItems();
    } catch (error: any) { // FIX: Added : any
      Toast.show({ type: "error", text1: "Failed to update availability" });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header section */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Manage Menu</Text>
          <Text style={styles.subtitle}>
            View, add, edit, and organize your dishes.
          </Text>
        </View>
        
        {/* Hide buttons if Bulk Form is active to keep UI clean */}
        {!showBulkForm && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => setShowBulkForm(true)}
              style={styles.bulkButton}
            >
              <Layers size={18} color="#ea580c" />
              <Text style={styles.bulkButtonText}>Bulk Add</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAddClick}
              style={styles.addButton}
            >
              <Plus size={18} color="#ffffff" />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {showBulkForm ? (
          <View style={styles.bulkFormWrapper}>
             <BulkMenuForm 
               onCancel={() => setShowBulkForm(false)} 
               onSuccess={() => {
                 setShowBulkForm(false);
                 fetchMenuItems(); 
               }} 
             />
          </View>
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

      {/* The Pop-up Modal for Add/Edit SINGLE Menu Form */}
      <Modal
        visible={isModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)} // Handles Android back button
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setIsModalOpen(false)}
              style={styles.closeButton}
            >
              <X size={20} color="#4b5563" />
            </TouchableOpacity>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <MenuForm
                menuItem={editingItem}
                onCancel={() => setIsModalOpen(false)}
                onSuccess={handleFormSuccess}
              />
            </ScrollView>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb", // gray-50
  },
  header: {
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 16,
    gap: 16,
  },
  headerTextContainer: {
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937", // gray-800
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280", // gray-500
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  bulkButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#ea580c", // orange-500
    paddingVertical: 10,
    borderRadius: 12, // xl
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bulkButtonText: {
    color: "#ea580c", // orange-600
    fontWeight: "600",
    fontSize: 14,
  },
  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ea580c", // orange-600
    paddingVertical: 10,
    borderRadius: 12, // xl
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
  },
  bulkFormWrapper: {
    flex: 1,
    paddingBottom: 32, // pb-8
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // bg-black/60
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16, // rounded-2xl
    width: "100%",
    maxWidth: 600, // max-w-2xl
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: "#f3f4f6", // gray-100
    borderRadius: 20,
  },
  modalScrollContent: {
    padding: 24, // p-6
    paddingTop: 48, // Make room for the absolute close button
  },
});

export default MenuManager;