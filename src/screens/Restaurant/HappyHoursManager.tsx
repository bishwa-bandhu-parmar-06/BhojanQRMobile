import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Clock,
} from "lucide-react-native";

import { getMyOffers, createOffer, updateOffer, updateOfferStatus, deleteOffer } from "../../API/offerApi";
import { getFullMenu } from "../../API/menuApi";
import CustomModal from "../../components/CustomModal";
import { SkeletonBlock } from "../../components/Skeleton";
import type { HeaderAction } from "../../components/Header";
import { formatMoney } from "../../utils/money";

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

type HappyHoursManagerProps = {
  // Puts this panel's controls in the dashboard's section bar.
  onHeaderActions?: (actions: HeaderAction[]) => void;
  // Hands the menu forms back to MenuManager, which already renders them as
  // full sub-screens. Building a second copy of them here would mean two
  // implementations of the same form drifting apart.
  onRequestMenuAction?: (action: "add" | "bulk") => void;
};

const HappyHoursManager = ({ onHeaderActions, onRequestMenuAction }: HappyHoursManagerProps) => {
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

  // The WHOLE menu, not a page of it: `categories` below and the offer form's
  // item picker are both derived from this, so a paginated 20 would offer a
  // category list that silently excluded most of the menu - and an offer
  // scoped to a category nobody could pick.
  const fetchMenu = () =>
    getFullMenu()
      .then((res) => setMenuItems(res?.data?.data || []))
      .catch(() => {});

  useEffect(() => {
    fetchOffers();
    fetchMenu();
  }, []);

  // Refreshing has to reload the menu too, not just the offers. The whole
  // screen is gated on the menu being non-empty, so a refresh that left
  // menuItems stale would leave someone stuck behind the gate they had just
  // satisfied - which is exactly what its "check again" button promises.
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMenu();
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
    // Whole percents only - matches the server rule. A fractional rate like
    // 12.5% prices items into stray paise and float-tail totals.
    if (form.discountType === "percentage" && !Number.isInteger(value)) {
      Toast.show({ type: "error", text1: "Percentage discount must be a whole number (e.g. 15)" });
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

  const hasMenu = menuItems.length > 0;
  const handlersRef = useRef({ refresh: () => {}, create: () => {} });
  handlersRef.current = { refresh: handleRefresh, create: openCreateModal };


  useEffect(() => {
    const actions: HeaderAction[] = [
      {
        key: "refresh",
        icon: RefreshCw,
        label: "Refresh",
        onPress: () => handlersRef.current.refresh(),
      },
    ];

    if (hasMenu) {
      actions.push({
        key: "add-offer",
        icon: Plus,
        label: "New offer",
        // Labelled pill, not a bare icon: this is the primary action on the
        // screen once the gate is passed.
        showLabel: true,
        onPress: () => handlersRef.current.create(),
      });
    }

    onHeaderActions?.(actions);
  }, [onHeaderActions, hasMenu]);

  // Leaving the section takes the buttons with it.
  useEffect(() => () => onHeaderActions?.([]), [onHeaderActions]);

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

  if (!hasMenu) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.gateIconRing}>
            <View style={styles.gateIconCircle}>
              <UtensilsCrossed size={30} color="#ea580c" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>Add your menu first</Text>
          <Text style={styles.emptySubtitle}>
            Happy Hours discount items on your menu, so there needs to be a menu before an
            offer can do anything. Add a few dishes and this unlocks.
          </Text>
          <TouchableOpacity style={styles.gateBtn} onPress={handleRefresh} activeOpacity={0.8}>
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#ea580c" />
            ) : (
              <RefreshCw size={15} color="#ea580c" />
            )}
            <Text style={styles.gateBtnText}>I've added items — check again</Text>
          </TouchableOpacity>

          {/* The gate names a prerequisite, so it should also be where that
              prerequisite gets met - otherwise the only way forward is to
              read the message, leave for the Menu tab and come back. Both
              open MenuManager's existing full-screen forms. */}
          <View style={styles.gateActions}>
            <TouchableOpacity
              style={styles.gatePrimaryBtn}
              onPress={() => onRequestMenuAction?.("add")}
              activeOpacity={0.85}
            >
              <Plus size={15} color="#fff" />
              <Text style={styles.gatePrimaryBtnText}>Add item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gateSecondaryBtn}
              onPress={() => onRequestMenuAction?.("bulk")}
              activeOpacity={0.85}
            >
              <Layers size={15} color="#ea580c" />
              <Text style={styles.gateSecondaryBtnText}>Bulk add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Refresh and "New offer" used to sit in a bare strip here. They are
          in the section bar now, alongside every other panel's controls. */}
      {offers.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.gateIconRing}>
            <View style={styles.gateIconCircle}>
              <Sparkles size={30} color="#ea580c" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No offers yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a Happy Hour to discount dishes during quiet periods. They switch on and
            off automatically on the schedule you set.
          </Text>
          {/* Same action as the section bar's pill. An empty list with its
              only way out in the top corner reads as a dead end. */}
          <TouchableOpacity
            style={[styles.gatePrimaryBtn, styles.emptyCta]}
            onPress={openCreateModal}
            activeOpacity={0.85}
          >
            <Plus size={15} color="#fff" />
            <Text style={styles.gatePrimaryBtnText}>Create offer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {offers.map((offer) => {
            const meta = STATUS_META[offer.status] || STATUS_META.disabled;
            const days = offer.schedule?.days || [];
              // The three status buttons used to sit in a row regardless of
              // state, so "Activate" was offered on an already-active offer.
              // Only the transitions that actually change something are shown.
              const transitions = [
                { id: "active", label: "Activate", icon: Play, color: "#16a34a" },
                { id: "paused", label: "Pause", icon: Pause, color: "#d97706" },
                { id: "disabled", label: "Disable", icon: Ban, color: "#6b7280" },
              ].filter((t) => t.id !== offer.status);

              return (
                <View key={offer._id} style={styles.offerCard}>
                  {/* The discount is the headline - it is what an owner scans
                      the list for - so it leads at display size rather than
                      being buried in a metadata line. */}
                  <View style={styles.offerTop}>
                    <View style={styles.discountBlock}>
                      <Text style={styles.discountValue}>
                        {offer.discountType === "percentage"
                          ? `${offer.discountValue}%`
                          : `₹${offer.discountValue}`}
                      </Text>
                      <Text style={styles.discountOff}>OFF</Text>
                    </View>

                    <View style={styles.offerIdentity}>
                      <Text style={styles.offerName} numberOfLines={1}>
                        {offer.name}
                      </Text>
                      <View style={styles.offerTimeRow}>
                        <Clock size={12} color="#6b7280" />
                        <Text style={styles.timeText}>
                          {offer.schedule?.startTime}–{offer.schedule?.endTime}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>

                  {/* Every day of the week is shown, with the inactive ones
                      dimmed - a list of only the active days makes you count
                      to work out which are missing. */}
                  <View style={styles.dayRow}>
                    {DAYS.map(({ value, label }) => {
                      const on = days.includes(value);
                      return (
                        <View key={value} style={[styles.dayPip, on && styles.dayPipOn]}>
                          <Text style={[styles.dayPipText, on && styles.dayPipTextOn]}>
                            {label.charAt(0)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.statusActionsRow}>
                    {transitions.map(({ id, label, icon: Icon, color }) => (
                      <TouchableOpacity
                        key={id}
                        onPress={() => handleStatusChange(offer._id, id)}
                        style={styles.statusActionBtn}
                        activeOpacity={0.75}
                      >
                        <Icon size={13} color={color} />
                        <Text style={[styles.statusActionText, { color }]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEditModal(offer)} style={styles.cardActionBtn} activeOpacity={0.75}>
                      <Pencil size={14} color="#ea580c" />
                      <Text style={styles.cardActionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setDeleteTarget(offer._id)}
                      disabled={deletingId === offer._id}
                      style={[styles.cardActionBtn, styles.cardActionDanger]}
                      activeOpacity={0.75}
                    >
                      {deletingId === offer._id ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                      ) : (
                        <Trash2 size={14} color="#dc2626" />
                      )}
                      <Text style={[styles.cardActionText, styles.cardActionTextDanger]}>
                        {deletingId === offer._id ? "Deleting…" : "Delete"}
                      </Text>
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
            <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
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
            <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
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
                        <Text style={styles.itemRowPrice}>₹{formatMoney(item.price)}</Text>
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
                <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                  style={styles.input}
                  placeholder="14:00"
                  value={form.schedule.startTime}
                  onChangeText={(v) => setForm((p) => ({ ...p, schedule: { ...p.schedule, startTime: v } }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>End (HH:MM)</Text>
                <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
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

  // Unboxed and vertically centred, matching the orders, tables and menu
  // lists so every empty state in the dashboard looks the same.
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  gateIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  gateIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  gateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  gateBtnText: { fontSize: 13, fontWeight: "800", color: "#ea580c" },

  // The two menu shortcuts sit as a pair under the refresh pill: adding a
  // dish is the real fix for an empty menu, checking again is only how you
  // confirm it. Both stay on one row so the gate does not become a stack of
  // three full-width buttons.
  gateActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  gatePrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#ea580c",
  },
  gatePrimaryBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  gateSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  gateSecondaryBtnText: { fontSize: 13, fontWeight: "800", color: "#ea580c" },
  emptyCta: { marginTop: 20 },

  list: { padding: 16, gap: 12 },
  offerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 14,
  },
  offerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  // The discount as a tinted tile: it is the one number the list is scanned
  // for, so it gets the visual weight rather than a line of small orange text.
  discountBlock: {
    minWidth: 62,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    alignItems: "center",
  },
  discountValue: { fontSize: 18, fontWeight: "900", color: "#ea580c" },
  discountOff: { fontSize: 9, fontWeight: "800", color: "#f97316", letterSpacing: 1 },
  offerIdentity: { flex: 1 },
  offerName: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  // Named offerTimeRow, not timeRow: the modal form already owns that key for
  // its start/end time inputs.
  offerTimeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  timeText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  statusBadgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },

  // Seven pips, one per weekday, inactive ones dimmed - the shape of the week
  // is readable at a glance instead of having to parse a list of names.
  dayRow: { flexDirection: "row", gap: 5, marginTop: 12 },
  dayPip: {
    flex: 1,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  dayPipOn: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  dayPipText: { fontSize: 11, fontWeight: "800", color: "#cbd5e1" },
  dayPipTextOn: { color: "#ea580c" },

  statusActionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  statusActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statusActionText: { fontSize: 11, fontWeight: "800" },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
    marginTop: 14,
    paddingTop: 12,
  },
  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#fff7ed",
  },
  cardActionDanger: { backgroundColor: "#fef2f2" },
  cardActionText: { fontSize: 12, fontWeight: "800", color: "#ea580c" },
  cardActionTextDanger: { color: "#dc2626" },

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
