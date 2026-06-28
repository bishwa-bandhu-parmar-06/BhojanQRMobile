import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  Sparkles,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Percent,
  IndianRupee,
  Globe,
  Layers,
  UtensilsCrossed,
  Play,
  Pause,
  Ban,
} from "lucide-react-native";

import { getMyOffers, createOffer, updateOffer, updateOfferStatus, deleteOffer } from "../../API/offerApi";
import { getMyMenu } from "../../API/menuApi";
import CustomModal from "../../components/CustomModal";
import { SkeletonBlock } from "../../components/Skeleton";

const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

const EMPTY_FORM = {
  name: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: "",
  applyTo: { scope: "all" as "all" | "category" | "items", menuItems: [] as string[], categories: [] as string[] },
  schedule: { startTime: "14:00", endTime: "17:00", days: [] as string[] },
};

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  active: { color: "#16a34a", bg: "#f0fdf4", label: "Active" },
  paused: { color: "#d97706", bg: "#fffbeb", label: "Paused" },
  disabled: { color: "#6b7280", bg: "#f3f4f6", label: "Disabled" },
};

const HappyHoursManager = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(menuItems.map((item) => item.category))].sort(),
    [menuItems],
  );

  const fetchOffers = async () => {
    try {
      const res = await getMyOffers();
      setOffers(res?.data?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load offers" });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    getMyMenu()
      .then((res) => setMenuItems(res?.data?.data || []))
      .catch(() => {});
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOffers();
  };

  const openCreateModal = () => {
    setEditingOffer(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (offer: any) => {
    setEditingOffer(offer);
    setForm({
      name: offer.name || "",
      discountType: offer.discountType || "percentage",
      discountValue: String(offer.discountValue ?? ""),
      applyTo: {
        scope: offer.applyTo?.scope || "all",
        menuItems: (offer.applyTo?.menuItems || []).map((id: any) => (typeof id === "string" ? id : id._id)),
        categories: offer.applyTo?.categories || [],
      },
      schedule: {
        startTime: offer.schedule?.startTime || "14:00",
        endTime: offer.schedule?.endTime || "17:00",
        days: offer.schedule?.days || [],
      },
    });
    setIsModalOpen(true);
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day)
          ? prev.schedule.days.filter((d) => d !== day)
          : [...prev.schedule.days, day],
      },
    }));
  };

  const toggleCategory = (category: string) => {
    setForm((prev) => ({
      ...prev,
      applyTo: {
        ...prev.applyTo,
        categories: prev.applyTo.categories.includes(category)
          ? prev.applyTo.categories.filter((c) => c !== category)
          : [...prev.applyTo.categories, category],
      },
    }));
  };

  const toggleMenuItem = (id: string) => {
    setForm((prev) => ({
      ...prev,
      applyTo: {
        ...prev.applyTo,
        menuItems: prev.applyTo.menuItems.includes(id)
          ? prev.applyTo.menuItems.filter((m) => m !== id)
          : [...prev.applyTo.menuItems, id],
      },
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: "error", text1: "Offer name is required" });
      return;
    }
    const value = Number(form.discountValue);
    if (!value || value <= 0) {
      Toast.show({ type: "error", text1: "Discount value must be a positive number" });
      return;
    }
    if (form.discountType === "percentage" && value >= 100) {
      Toast.show({ type: "error", text1: "Percentage discount must be less than 100%" });
      return;
    }
    if (form.applyTo.scope === "items" && form.applyTo.menuItems.length === 0) {
      Toast.show({ type: "error", text1: "Select at least one menu item" });
      return;
    }
    if (form.applyTo.scope === "category" && form.applyTo.categories.length === 0) {
      Toast.show({ type: "error", text1: "Select at least one category" });
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(form.schedule.startTime) || !/^\d{2}:\d{2}$/.test(form.schedule.endTime)) {
      Toast.show({ type: "error", text1: "Times must be in HH:MM format, e.g. 14:00" });
      return;
    }
    if (form.schedule.startTime === form.schedule.endTime) {
      Toast.show({ type: "error", text1: "Start time and end time cannot be the same" });
      return;
    }
    if (form.schedule.days.length === 0) {
      Toast.show({ type: "error", text1: "Select at least one day" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        discountType: form.discountType,
        discountValue: value,
        applyTo: form.applyTo,
        schedule: form.schedule,
      };
      if (editingOffer) {
        await updateOffer(editingOffer._id, payload);
        Toast.show({ type: "success", text1: "Offer updated" });
      } else {
        await createOffer(payload);
        Toast.show({ type: "success", text1: "Offer created" });
      }
      setIsModalOpen(false);
      fetchOffers();
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Operation failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateOfferStatus(id, status);
      Toast.show({ type: "success", text1: `Offer ${status}` });
      fetchOffers();
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to update offer" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(targetId);
    try {
      await deleteOffer(targetId);
      Toast.show({ type: "success", text1: "Offer deleted" });
      fetchOffers();
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to delete offer" });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="40%" height={24} borderRadius={6} />
            <SkeletonBlock width="70%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        </View>
        <View style={styles.list}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.offerCard, { gap: 8 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <SkeletonBlock width="50%" height={15} borderRadius={6} />
                <SkeletonBlock width={60} height={20} borderRadius={8} />
              </View>
              <SkeletonBlock width="60%" height={12} borderRadius={6} />
              <SkeletonBlock width="30%" height={12} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Happy Hours</Text>
          <Text style={styles.subtitle}>Time-based discounts that switch on/off automatically.</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing} style={styles.refreshBtn}>
          <RefreshCw size={16} color="#ea580c" />
        </TouchableOpacity>
        <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {offers.length === 0 ? (
        <View style={styles.emptyState}>
          <Sparkles size={40} color="#ea580c" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No offers yet</Text>
          <Text style={styles.emptySubtitle}>Create a Happy Hour discount to boost off-peak orders.</Text>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {offers.map((offer) => {
            const meta = STATUS_META[offer.status] || STATUS_META.disabled;
            return (
              <View key={offer._id} style={styles.offerCard}>
                <View style={styles.offerCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerName}>{offer.name}</Text>
                    <Text style={styles.offerDiscount}>
                      {offer.discountType === "percentage" ? `${offer.discountValue}% off` : `₹${offer.discountValue} off`}
                      {"  ·  "}
                      {offer.schedule?.startTime}–{offer.schedule?.endTime}
                    </Text>
                    <Text style={styles.offerDays}>
                      {(offer.schedule?.days || []).map((d: string) => d.toUpperCase()).join(" · ")}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                <View style={styles.statusActionsRow}>
                  <TouchableOpacity onPress={() => handleStatusChange(offer._id, "active")} style={styles.statusActionBtn}>
                    <Play size={13} color="#16a34a" />
                    <Text style={[styles.statusActionText, { color: "#16a34a" }]}>Activate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleStatusChange(offer._id, "paused")} style={styles.statusActionBtn}>
                    <Pause size={13} color="#d97706" />
                    <Text style={[styles.statusActionText, { color: "#d97706" }]}>Pause</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleStatusChange(offer._id, "disabled")} style={styles.statusActionBtn}>
                    <Ban size={13} color="#6b7280" />
                    <Text style={[styles.statusActionText, { color: "#6b7280" }]}>Disable</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEditModal(offer)} style={styles.cardActionBtn}>
                    <Pencil size={14} color="#ea580c" />
                    <Text style={styles.cardActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDeleteTarget(offer._id)}
                    disabled={deletingId === offer._id}
                    style={[styles.cardActionBtn, styles.cardActionDanger]}
                  >
                    {deletingId === offer._id ? (
                      <>
                        <ActivityIndicator size="small" color="#dc2626" />
                        <Text style={[styles.cardActionText, { color: "#dc2626" }]}>Deleting...</Text>
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} color="#dc2626" />
                        <Text style={[styles.cardActionText, { color: "#dc2626" }]}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* CREATE/EDIT MODAL */}
      <Modal visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingOffer ? "Edit Offer" : "Create Offer"}</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
            <Text style={styles.fieldLabel}>Offer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Happy Hour, Weekend Special"
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>Discount Type *</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, form.discountType === "percentage" && styles.toggleBtnActive]}
                onPress={() => setForm((p) => ({ ...p, discountType: "percentage" }))}
              >
                <Percent size={14} color={form.discountType === "percentage" ? "#fff" : "#6b7280"} />
                <Text style={[styles.toggleBtnText, form.discountType === "percentage" && styles.toggleBtnTextActive]}>
                  Percentage
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, form.discountType === "fixed" && styles.toggleBtnActive]}
                onPress={() => setForm((p) => ({ ...p, discountType: "fixed" }))}
              >
                <IndianRupee size={14} color={form.discountType === "fixed" ? "#fff" : "#6b7280"} />
                <Text style={[styles.toggleBtnText, form.discountType === "fixed" && styles.toggleBtnTextActive]}>
                  Fixed Amount
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Discount Value *</Text>
            <TextInput
              style={styles.input}
              placeholder={form.discountType === "percentage" ? "20" : "50"}
              keyboardType="numeric"
              value={form.discountValue}
              onChangeText={(v) => setForm((p) => ({ ...p, discountValue: v }))}
            />

            <Text style={styles.fieldLabel}>Apply To *</Text>
            <View style={styles.toggleRow}>
              {[
                { id: "all", label: "Entire Menu", Icon: Globe },
                { id: "category", label: "Categories", Icon: Layers },
                { id: "items", label: "Items", Icon: UtensilsCrossed },
              ].map(({ id, label, Icon }) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.toggleBtn, form.applyTo.scope === id && styles.toggleBtnActive]}
                  onPress={() => setForm((p) => ({ ...p, applyTo: { ...p.applyTo, scope: id as any } }))}
                >
                  <Icon size={13} color={form.applyTo.scope === id ? "#fff" : "#6b7280"} />
                  <Text style={[styles.toggleBtnText, form.applyTo.scope === id && styles.toggleBtnTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.applyTo.scope === "category" && (
              <View style={styles.chipWrap}>
                {categories.length === 0 ? (
                  <Text style={styles.helperText}>No categories yet. Add menu items first.</Text>
                ) : (
                  categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => toggleCategory(cat)}
                      style={[styles.catChip, form.applyTo.categories.includes(cat) && styles.catChipActive]}
                    >
                      <Text style={[styles.catChipText, form.applyTo.categories.includes(cat) && styles.catChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {form.applyTo.scope === "items" && (
              <View style={styles.itemsBox}>
                {menuItems.length === 0 ? (
                  <Text style={styles.helperText}>No menu items found.</Text>
                ) : (
                  menuItems.map((item) => {
                    const checked = form.applyTo.menuItems.includes(item._id);
                    return (
                      <TouchableOpacity key={item._id} onPress={() => toggleMenuItem(item._id)} style={styles.itemRow}>
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && <View style={styles.checkboxDot} />}
                        </View>
                        <Text style={styles.itemRowName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemRowPrice}>₹{item.price}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            <Text style={styles.fieldLabel}>Schedule *</Text>
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>Start (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="14:00"
                  value={form.schedule.startTime}
                  onChangeText={(v) => setForm((p) => ({ ...p, schedule: { ...p.schedule, startTime: v } }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>End (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="17:00"
                  value={form.schedule.endTime}
                  onChangeText={(v) => setForm((p) => ({ ...p, schedule: { ...p.schedule, endTime: v } }))}
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Days</Text>
            <View style={styles.chipWrap}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day.value}
                  onPress={() => toggleDay(day.value)}
                  style={[styles.dayChip, form.schedule.days.includes(day.value) && styles.dayChipActive]}
                >
                  <Text style={[styles.dayChipText, form.schedule.days.includes(day.value) && styles.dayChipTextActive]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitBtnText}>{editingOffer ? "Saving..." : "Creating..."}</Text>
                </>
              ) : (
                <Text style={styles.submitBtnText}>{editingOffer ? "Save Changes" : "Create Offer"}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <CustomModal
        visible={!!deleteTarget}
        type="error"
        title="Delete this offer?"
        message="This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  container: { flex: 1, backgroundColor: "#f9fafb" },
  headerRow: { flexDirection: "row", alignItems: "flex-end", padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6b7280", fontWeight: "500", marginTop: 4 },
  refreshBtn: { padding: 10, backgroundColor: "#fff7ed", borderRadius: 10 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ea580c", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, marginHorizontal: 16, backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#1f2937" },
  emptySubtitle: { fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 6, paddingHorizontal: 24 },

  list: { padding: 16, gap: 12 },
  offerCard: { backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", padding: 14 },
  offerCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  offerName: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  offerDiscount: { fontSize: 12, color: "#ea580c", fontWeight: "700", marginTop: 4 },
  offerDays: { fontSize: 11, color: "#9ca3af", fontWeight: "600", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "800" },
  statusActionsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  statusActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: "#f9fafb" },
  statusActionText: { fontSize: 11, fontWeight: "700" },
  cardActions: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#f9fafb", paddingTop: 10 },
  cardActionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#fff7ed" },
  cardActionDanger: { backgroundColor: "#fef2f2" },
  cardActionText: { fontSize: 12, fontWeight: "700", color: "#ea580c" },

  modalContainer: { flex: 1, backgroundColor: "#f9fafb" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 50, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  modalTitle: { fontSize: 19, fontWeight: "900", color: "#1f2937" },
  modalCloseBtn: { padding: 8, backgroundColor: "#f3f4f6", borderRadius: 100 },
  modalScroll: { padding: 20, paddingBottom: 40 },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: "#6b7280", textTransform: "uppercase", marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: 15, backgroundColor: "#f9fafb", color: "#1f2937" },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: "#f3f4f6" },
  toggleBtnActive: { backgroundColor: "#ea580c" },
  toggleBtnText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  toggleBtnTextActive: { color: "#fff" },
  helperText: { fontSize: 12, color: "#9ca3af", padding: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: "#f3f4f6" },
  catChipActive: { backgroundColor: "#16a34a" },
  catChipText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  catChipTextActive: { color: "#fff" },
  itemsBox: { backgroundColor: "#ffffff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 6, maxHeight: 240 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 8 },
  itemRowName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#374151" },
  itemRowPrice: { fontSize: 12, fontWeight: "800", color: "#ea580c" },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { borderColor: "#ea580c", backgroundColor: "#ea580c" },
  checkboxDot: { width: 7, height: 7, borderRadius: 2, backgroundColor: "#fff" },
  timeRow: { flexDirection: "row", gap: 12 },
  timeLabel: { fontSize: 10, fontWeight: "800", color: "#9ca3af", textTransform: "uppercase", marginBottom: 6 },
  dayChip: { width: 48, paddingVertical: 10, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center" },
  dayChipActive: { backgroundColor: "#ea580c" },
  dayChipText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  dayChipTextActive: { color: "#fff" },
  submitBtn: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#ea580c", marginTop: 24 },
  submitBtnDisabled: { backgroundColor: "#9ca3af" },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

export default HappyHoursManager;
