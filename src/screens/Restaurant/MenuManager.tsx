import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  BackHandler,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { ArrowLeft, Trash2 } from "lucide-react-native";

import {
  getMyMenu,
  deleteMenuItem,
  deleteAllMenuItems,
  updateMenuAvailability,
} from "../../API/menuApi";
import CustomModal from "../../components/CustomModal";

import MenuList from "../../components/Restaurant/MenuList";
import MenuForm from "../../components/Restaurant/MenuForm";
import BulkMenuForm from "../../components/Restaurant/BulkMenuForm";
import SectionError from "../../components/SectionError";

// "Add item" and "Bulk add" are raised from outside this screen - the two
// header icons on the Menu tab, two rows on the More page, and the no-menu
// gate in Happy Hours - which hand the request down through `pendingAction`.
// The empty state's own buttons call openAddForm/openBulkForm directly, since
// they are already inside this component.
export type MenuAction = "add" | "bulk";

interface MenuManagerProps {
  pendingAction?: MenuAction | null;
  onActionConsumed?: () => void;
  // Announces when a form has taken over the screen. The dashboard hides the
  // app header while it has, so the form reads as its own sub-screen with the
  // back arrow as its only chrome - the same shape as Notifications and the
  // More sections.
  onSubScreenChange?: (open: boolean) => void;
}

const MenuManager = ({
  pendingAction,
  onActionConsumed,
  onSubScreenChange,
}: MenuManagerProps) => {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);

  const isSubScreen = isEditorOpen || showBulkForm;

  useEffect(() => {
    onSubScreenChange?.(isSubScreen);
  }, [isSubScreen, onSubScreenChange]);

  // Leaving the screen entirely (switching tabs) must not leave the dashboard
  // believing a form is still open, or the header would stay hidden.
  useEffect(() => {
    return () => onSubScreenChange?.(false);
  }, [onSubScreenChange]);

  // Acting on the request is deferred to an effect rather than done during
  // render, and the parent is told immediately so it can clear the request.
  // Without that clear, opening the add form, closing it, and asking for it
  // again from the same place would be a no-op - the prop would never change.
  // The two forms are mutually exclusive, so opening either closes the other.
  const openAddForm = useCallback(() => {
    setEditingItem(null);
    setShowBulkForm(false);
    setIsEditorOpen(true);
  }, []);

  const openBulkForm = useCallback(() => {
    setIsEditorOpen(false);
    setShowBulkForm(true);
  }, []);

  useEffect(() => {
    if (!pendingAction) return;
    if (pendingAction === "add") openAddForm();
    else openBulkForm();
    onActionConsumed?.();
  }, [pendingAction, onActionConsumed, openAddForm, openBulkForm]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await getMyMenu();
      const items = response?.data?.menuItems || response?.data?.data || [];
      setMenuItems(items);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load menu items" });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setIsEditorOpen(true);
  };

  const closeSubScreen = () => {
    setIsEditorOpen(false);
    setShowBulkForm(false);
    setEditingItem(null);
  };

  // Claims the hardware back button while a form is open, so back closes the
  // form instead of switching tabs underneath it. Registered only while open:
  // BackHandler runs the most recently added listener first, so this takes
  // precedence over the dashboard's, and removing it hands control straight
  // back rather than leaving a listener that answers "handled" forever.
  useEffect(() => {
    if (!isSubScreen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeSubScreen();
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubScreen]);

  const handleFormSuccess = () => {
    closeSubScreen();
    fetchMenuItems();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMenuItem(id);
      Toast.show({ type: "success", text1: "Item deleted successfully!" });
      fetchMenuItems();
    } catch {
      Toast.show({ type: "error", text1: "Failed to delete item" });
    }
  };

  const [isClearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleDeleteAll = async () => {
    setClearOpen(false);
    setClearing(true);
    try {
      await deleteAllMenuItems();
      setMenuItems([]);
      Toast.show({ type: "success", text1: "Menu cleared" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Failed to clear menu",
      });
      // The list is the source of truth for what actually survived, so re-read
      // it rather than assuming the whole delete failed - a partial wipe would
      // otherwise leave the screen showing items that are already gone.
      fetchMenuItems();
    } finally {
      setClearing(false);
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
    } catch {
      Toast.show({ type: "error", text1: "Failed to update availability" });
    }
  };

  // Editing used to open a translucent Modal floating over the list. It is a
  // full sub-screen now: same back-bar-and-content shape as Notifications and
  // the More sections, so every "drill in" in the app looks the same.
  if (isSubScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBar} onPress={closeSubScreen} activeOpacity={0.7}>
          <ArrowLeft size={18} color="#374151" />
          <Text style={styles.backBarText}>
            {showBulkForm ? "Bulk Add Menu" : editingItem ? "Edit Item" : "Add Menu Item"}
          </Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.mainContent}
          // The dashboard's bottom tab bar sits below this screen. Without the
          // padding the form's own Cancel/Save row ends up flush against it -
          // and on the bulk form, partly behind it.
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showBulkForm ? (
            <BulkMenuForm onCancel={closeSubScreen} onSuccess={handleFormSuccess} />
          ) : (
            <MenuForm
              menuItem={editingItem}
              onCancel={closeSubScreen}
              onSuccess={handleFormSuccess}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* MenuList is given the full height and renders its own FlatList, so it
          is deliberately NOT wrapped in a ScrollView - nesting the two breaks
          virtualization and trips RN's "VirtualizedLists should never be
          nested" warning. */}
      {/* Only offered when there is something to clear, and kept out of the
          header's + slot so a destructive action never sits next to the one
          people tap constantly. */}
      {menuItems.length > 0 && (
        <View style={styles.toolbar}>
          <Text style={styles.toolbarCount}>
            {menuItems.length} item{menuItems.length === 1 ? "" : "s"}
          </Text>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setClearOpen(true)}
            disabled={clearing}
            activeOpacity={0.8}
          >
            {clearing ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Trash2 size={14} color="#ef4444" />
            )}
            <Text style={styles.clearBtnText}>Delete all</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mainContent}>
        {loadError && menuItems.length === 0 ? (
          <SectionError message="Failed to load menu items." onRetry={fetchMenuItems} />
        ) : (
          <MenuList
            items={menuItems}
            loading={loading}
            onEdit={handleEditClick}
            onDelete={handleDelete}
            onToggleAvailable={handleToggleAvailable}
            onAddItem={openAddForm}
            onBulkAdd={openBulkForm}
          />
        )}
      </View>

      <CustomModal
        visible={isClearOpen}
        type="logout"
        title="Delete the whole menu?"
        message={`All ${menuItems.length} item${menuItems.length === 1 ? "" : "s"} will be removed and your QR menu will show nothing to customers. This cannot be undone.`}
        confirmText="Delete everything"
        cancelText="Keep menu"
        onConfirm={handleDeleteAll}
        onCancel={() => setClearOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  mainContent: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  toolbarCount: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  clearBtnText: { fontSize: 12, fontWeight: "800", color: "#ef4444" },
  // Matches the dashboard's own section bar, so drilling into a menu form
  // looks identical to drilling into Settings or Notifications.
  backBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
  },
  backBarText: { fontSize: 16, fontWeight: "800", color: "#1f2937" },
  formScrollContent: { padding: 16, paddingBottom: 48 },
});

export default MenuManager;