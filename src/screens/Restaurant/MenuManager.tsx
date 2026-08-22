import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { useSelector } from "react-redux";
import { ArrowLeft, Trash2 } from "lucide-react-native";

import {
  getMyMenu,
  deleteMenuItem,
  deleteAllMenuItems,
  updateMenuAvailability,
} from "../../API/menuApi";
import CustomModal from "../../components/CustomModal";

import MenuList from "../../components/Restaurant/MenuList";
import MenuItemDetails from "../../components/Restaurant/MenuItemDetails";
import MenuForm from "../../components/Restaurant/MenuForm";
import BulkMenuForm from "../../components/Restaurant/BulkMenuForm";
import SectionError from "../../components/SectionError";

// "Add item" and "Bulk add" are raised from outside this screen - the two
// header icons on the Menu tab, two rows on the More page, and the no-menu
// gate in Happy Hours - which hand the request down through `pendingAction`.
// The empty state's own buttons call openAddForm/openBulkForm directly, since
// they are already inside this component.
export type MenuAction = "add" | "bulk";

// Matches the server's own default for /menu/owner/my-menu. Kept explicit so
// the page arithmetic here and the slice size there cannot drift apart.
const PAGE_SIZE = 20;

interface MenuManagerProps {
  pendingAction?: MenuAction | null;
  onActionConsumed?: () => void;
  // Announces when a form has taken over the screen. The dashboard hides the
  // app header while it has, so the form reads as its own sub-screen with the
  // back arrow as its only chrome - the same shape as Notifications and the
  // More sections.
  onSubScreenChange?: (open: boolean) => void;
  // Raised while a bulk import is reading a spreadsheet or uploading rows.
  // The dashboard refuses to log out while it is set - signing out mid-upload
  // would drop the auth token between two of the per-item requests and leave
  // the menu half written.
  onBusyChange?: (busy: boolean) => void;
}

const MenuManager = ({
  pendingAction,
  onActionConsumed,
  onSubScreenChange,
  onBusyChange,
}: MenuManagerProps) => {
  // Mirrors what menuRoutes.js enforces. The server is the authority - this
  // only decides what is worth drawing, so a waiter is not shown a delete
  // button that answers 403.
  const user = useSelector((state: any) => state.auth?.user);
  const isOwner = user?.role === "restaurant";
  const perms: string[] = isOwner ? [] : user?.permissions || [];
  const canEdit = isOwner || perms.includes("manage_menu");
  const canDelete = isOwner || perms.includes("delete_menu");

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);
  // The dish whose full-screen detail view is open, if any.
  const [viewingItem, setViewingItem] = useState<any>(null);
  // Reported up by BulkMenuForm. `busy` means an operation is mid-flight and
  // must not be interrupted; `dirty` means closing would throw away rows the
  // owner has imported or typed.
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDirty, setBulkDirty] = useState(false);
  const [isDiscardOpen, setDiscardOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const pageRef = useRef(1);

  const isSubScreen = isEditorOpen || showBulkForm || !!viewingItem;

  useEffect(() => {
    onSubScreenChange?.(isSubScreen);
  }, [isSubScreen, onSubScreenChange]);

  useEffect(() => {
    onBusyChange?.(bulkBusy);
  }, [bulkBusy, onBusyChange]);

  // Same reasoning as the sub-screen flag below: leaving the tab must not
  // strand the dashboard believing an upload is still running, or logout
  // would stay blocked for the rest of the session.
  useEffect(() => {
    return () => onBusyChange?.(false);
  }, [onBusyChange]);

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
  // Each of these clears the other two states, the detail view included. The
  // sub-screen picks what to render by checking those flags in order, so a
  // leftover viewingItem would win over a freshly requested add form.
  const openAddForm = useCallback(() => {
    setEditingItem(null);
    setViewingItem(null);
    setShowBulkForm(false);
    setIsEditorOpen(true);
  }, []);

  const openBulkForm = useCallback(() => {
    setIsEditorOpen(false);
    setViewingItem(null);
    setShowBulkForm(true);
  }, []);

  useEffect(() => {
    if (!pendingAction) return;
    if (pendingAction === "add") openAddForm();
    else openBulkForm();
    onActionConsumed?.();
  }, [pendingAction, onActionConsumed, openAddForm, openBulkForm]);

  // The server hands back one page at a time (20 by default) with totalItems
  // alongside. `total` is the real menu size, which is what the toolbar count
  // and the "delete all" copy must report - menuItems.length is only what has
  // been scrolled into view so far.
  const fetchMenuItems = useCallback(
    async (page: number, mode: "replace" | "append", fresh = false) => {
      try {
        if (mode === "replace") setLoading(true);
        setLoadError(false);

        const response = await getMyMenu(page, PAGE_SIZE, fresh);
        const body = response?.data || {};
        const batch = body.menuItems || body.data || [];

        setMenuItems((prev) => {
          if (mode === "replace") return batch;
          // Rows shift between pages when an item is added or removed while
          // scrolling, so an offset-paginated append can repeat one. Key on
          // _id rather than trusting skip/limit to stay stable.
          const seen = new Set(prev.map((item: any) => item._id));
          return [...prev, ...batch.filter((item: any) => !seen.has(item._id))];
        });

        setTotal(typeof body.totalItems === "number" ? body.totalItems : batch.length);
        // totalPages is authoritative; fall back to a short page meaning the end.
        const totalPages = body.totalPages ?? (batch.length < PAGE_SIZE ? page : page + 1);
        setHasMore(page < totalPages);
        pageRef.current = page;
      } catch {
        Toast.show({ type: "error", text1: "Failed to load menu items" });
        if (mode === "replace") setLoadError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // Anything that changes what the menu contains restarts from page one -
  // appending onto a stale first page would interleave old and new rows.
  // Every caller of this is either a refresh or something that just CHANGED
  // the menu, so all of them want the database rather than a cached page.
  const reloadMenu = useCallback(() => {
    pageRef.current = 1;
    setHasMore(false);
    fetchMenuItems(1, "replace", true);
  }, [fetchMenuItems]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    fetchMenuItems(pageRef.current + 1, "append");
  }, [loadingMore, loading, hasMore, fetchMenuItems]);

  useEffect(() => {
    reloadMenu();
  }, [reloadMenu]);

  const handleEditClick = (item: any) => {
    // Also leaves the detail view when Edit is pressed there - the editor
    // replaces it rather than stacking on top, so one back press returns to
    // the list instead of two.
    setViewingItem(null);
    setEditingItem(item);
    setIsEditorOpen(true);
  };

  const handleViewItem = (item: any) => {
    setViewingItem(item);
  };

  // Tears the sub-screen down unconditionally. Only reached once the guards
  // in requestCloseSubScreen have been satisfied, or from handleFormSuccess,
  // where the work has just been saved and there is nothing left to lose.
  const closeSubScreen = () => {
    setIsEditorOpen(false);
    setShowBulkForm(false);
    setEditingItem(null);
    setViewingItem(null);
    setDiscardOpen(false);
    setBulkDirty(false);
    setBulkBusy(false);
  };

  // The single funnel every user-initiated exit goes through - the form's own
  // X, the back bar, and the hardware back button - so all three ask the same
  // question instead of one of them quietly bypassing it.
  const requestCloseSubScreen = () => {
    if (showBulkForm && bulkBusy) {
      Toast.show({
        type: "error",
        text1: "Still working",
        text2: "Wait for this to finish before leaving.",
      });
      return;
    }
    if (showBulkForm && bulkDirty) {
      setDiscardOpen(true);
      return;
    }
    closeSubScreen();
  };

  // Held in a ref because the back handler below is registered once per
  // sub-screen open. Without this it would capture the bulkDirty/bulkBusy of
  // the render that opened the screen - always false, since the import
  // happens later - and back would sail straight past both guards.
  const requestCloseRef = useRef(requestCloseSubScreen);
  requestCloseRef.current = requestCloseSubScreen;

  // Claims the hardware back button while a form is open, so back closes the
  // form instead of switching tabs underneath it. Registered only while open:
  // BackHandler runs the most recently added listener first, so this takes
  // precedence over the dashboard's, and removing it hands control straight
  // back rather than leaving a listener that answers "handled" forever.
  useEffect(() => {
    if (!isSubScreen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      requestCloseRef.current();
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubScreen]);

  const handleFormSuccess = () => {
    closeSubScreen();
    reloadMenu();
  };

  // The card's trash button asks first rather than acting. It sits directly
  // beside Edit on a small target, the delete is not undoable, and "Delete
  // all" already works this way - a single item was the one destructive path
  // in here that fired on first tap.
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDelete = (id: string) => setDeleteTarget(id);

  const confirmDelete = async () => {
    const id = deleteTarget;
    if (!id) return;
    // Closing first is what makes a second confirm tap impossible.
    setDeleteTarget(null);
    // Deleting the dish whose detail screen is open has to close that screen -
    // there is nothing left to show, and the reloaded list is where the owner
    // needs to end up.
    if (viewingItem?._id === id) setViewingItem(null);
    try {
      // The server's message, not a fixed string: deleting the last item on
      // the menu also clears this restaurant's offers, and the owner should
      // hear that here rather than find an empty Happy Hours tab later.
      const res = await deleteMenuItem(id);
      Toast.show({
        type: "success",
        text1: res?.data?.message || "Item deleted successfully!",
      });
      reloadMenu();
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
      const res = await deleteAllMenuItems();
      setMenuItems([]);
      Toast.show({
        type: "success",
        text1: "Menu cleared",
        // Clearing the menu takes every offer with it. That is a second,
        // non-obvious consequence of one tap, so it gets said explicitly
        // instead of being left for the owner to notice.
        text2: res?.data?.deletedOfferCount
          ? `${res.data.deletedOfferCount} offer(s) removed as well`
          : undefined,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Failed to clear menu",
      });
      // The list is the source of truth for what actually survived, so re-read
      // it rather than assuming the whole delete failed - a partial wipe would
      // otherwise leave the screen showing items that are already gone.
      reloadMenu();
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
      reloadMenu();
    } catch {
      Toast.show({ type: "error", text1: "Failed to update availability" });
    }
  };

  // Named rather than "this item": the trash buttons sit one row apart on a
  // dense list, so the name is what tells someone they grabbed the wrong dish.
  const deleteTargetName = menuItems.find((item: any) => item._id === deleteTarget)?.name;
  // `total` is the server's count for the whole menu, not just the page that
  // happens to be loaded, so this stays right while scrolled anywhere.
  const isLastMenuItem = (total || menuItems.length) === 1;

  // Built once and rendered by both branches below. Delete can now be pressed
  // from the detail sub-screen as well as the list, and the early return means
  // a modal written into only one branch would simply not exist in the other -
  // the confirm would never appear and the delete would never happen.
  const deleteConfirmModal = (
    <CustomModal
      visible={!!deleteTarget}
      type="logout"
      title="Delete this item?"
      message={`${deleteTargetName ? `"${deleteTargetName}"` : "This item"} will be removed from your menu and customers will no longer see it. This cannot be undone.${
        isLastMenuItem
          ? " It is also the last item on your menu, so any offers you have created will be removed with it."
          : ""
      }`}
      confirmText="Delete item"
      cancelText="Keep it"
      onConfirm={confirmDelete}
      onCancel={() => setDeleteTarget(null)}
    />
  );

  // Editing used to open a translucent Modal floating over the list. It is a
  // full sub-screen now: same back-bar-and-content shape as Notifications and
  // the More sections, so every "drill in" in the app looks the same.
  if (isSubScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backBar}>
          <TouchableOpacity style={styles.backBarTap} onPress={requestCloseSubScreen} activeOpacity={0.7}>
            <ArrowLeft size={18} color="#374151" />
            <Text style={styles.backBarText} numberOfLines={1}>
              {showBulkForm
                ? "Bulk Add Menu"
                : viewingItem
                  ? viewingItem.name
                  : editingItem
                    ? "Edit Item"
                    : "Add Menu Item"}
            </Text>
          </TouchableOpacity>

        </View>

        {/* The bulk form is given the screen height directly instead of being
            nested in the ScrollView below. It scrolls its own row list and
            keeps its Upload All bar pinned underneath, and both of those need
            a bounded parent: inside a ScrollView its flex:1 had nothing to
            measure against, so the list grew to the full height of every
            imported row and pushed the upload bar off the end of a very long
            page - which is exactly why that button became unreachable after
            importing a large sheet. Nesting two vertical ScrollViews also
            destroys virtualization and trips React Native's own warning. */}
        {showBulkForm ? (
          <View style={styles.bulkHost}>
            <BulkMenuForm
              onSuccess={handleFormSuccess}
              // Both are useState setters, so their identity is stable and the
              // effects in the form that call them cannot loop.
              onBusyChange={setBulkBusy}
              onDirtyChange={setBulkDirty}
            />
          </View>
        ) : (
          <ScrollView
            style={styles.mainContent}
            // The dashboard's bottom tab bar sits below this screen. Without
            // the padding the form's own Cancel/Save row ends up flush
            // against it.
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {viewingItem ? (
              <MenuItemDetails
                item={viewingItem}
                onEdit={handleEditClick}
                onDelete={handleDelete}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ) : (
              <MenuForm
                menuItem={editingItem}
                onCancel={closeSubScreen}
                onSuccess={handleFormSuccess}
              />
            )}
          </ScrollView>
        )}

        {deleteConfirmModal}

        {/* Only ever raised for the bulk form, which is the one screen here
            holding work that exists nowhere else yet - the single item form
            posts on save, but imported rows live only in memory until Upload
            All runs. */}
        <CustomModal
          visible={isDiscardOpen}
          type="logout"
          title="Discard imported menu?"
          message="The rows you have imported have not been uploaded yet. Leaving now throws them away and the spreadsheet will have to be imported again."
          confirmText="Discard"
          cancelText="Keep editing"
          onConfirm={closeSubScreen}
          onCancel={() => setDiscardOpen(false)}
        />
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
      {menuItems.length > 0 && canDelete && (
        <View style={styles.toolbar}>
          <Text style={styles.toolbarCount}>
            {total || menuItems.length} item{(total || menuItems.length) === 1 ? "" : "s"}
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
          <SectionError message="Failed to load menu items." onRetry={reloadMenu} />
        ) : (
          <MenuList
            items={menuItems}
            loading={loading}
            onEdit={handleEditClick}
            onDelete={handleDelete}
            onPress={handleViewItem}
            onToggleAvailable={handleToggleAvailable}
            onAddItem={openAddForm}
            onBulkAdd={openBulkForm}
            canEdit={canEdit}
            canDelete={canDelete}
            onEndReached={handleLoadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
            total={total}
          />
        )}
      </View>

      {deleteConfirmModal}

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
  // The tap target is the arrow and title only, so the action button beside
  // it is not swallowed by the bar's own press.
  backBarTap: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  backBarText: { fontSize: 16, fontWeight: "800", color: "#1f2937", flexShrink: 1 },
  formScrollContent: { padding: 16, paddingBottom: 48 },
  // No padding of its own: the bulk form is a full-bleed screen that manages
  // its own insets, so every pixel it does not spend on chrome goes to rows.
  bulkHost: { flex: 1 },
});

export default MenuManager;