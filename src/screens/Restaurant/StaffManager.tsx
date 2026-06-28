import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  UserPlus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Users,
  ShieldCheck,
  ShieldOff,
  Eye,
  EyeOff,
} from "lucide-react-native";

import { getStaffList, getStaffRoles, createStaff, updateStaff, deleteStaff, toggleStaffStatus } from "../../API/staffApi";
import { PERMISSIONS, PERMISSION_LABELS, STAFF_ROLES, DEFAULT_ROLE_PERMISSIONS, Permission } from "../../constants/permissions";
import CustomModal from "../../components/CustomModal";
import { SkeletonBlock } from "../../components/Skeleton";

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  staffRole: string;
  permissions: Permission[];
  isActive: boolean;
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  MANAGER: "#7c3aed",
  CHEF: "#d97706",
  WAITER: "#2563eb",
};

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  staffRole: "WAITER",
  permissions: DEFAULT_ROLE_PERMISSIONS.WAITER as Permission[],
  isActive: true,
};

const StaffManager = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<string[]>([...STAFF_ROLES]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      const res = await getStaffList();
      setStaff(res?.data?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load staff members" });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    getStaffRoles()
      .then((res) => {
        if (res?.data?.data?.length) setRoles(res.data.data);
      })
      .catch(() => {});
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStaff();
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member);
    setForm({
      name: member.name || "",
      email: member.email || "",
      password: "",
      staffRole: member.staffRole || "WAITER",
      permissions: member.permissions || [],
      isActive: member.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleRoleChange = (staffRole: string) => {
    setForm((prev) => ({
      ...prev,
      staffRole,
      permissions: DEFAULT_ROLE_PERMISSIONS[staffRole] || [],
    }));
  };

  const togglePermission = (permission: Permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Toast.show({ type: "error", text1: "Name and email are required" });
      return;
    }
    if (!editingStaff && form.password.length < 8) {
      Toast.show({ type: "error", text1: "Password must be at least 8 characters" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        email: form.email.trim(),
        staffRole: form.staffRole,
        permissions: form.permissions,
      };
      if (form.password) payload.password = form.password;

      if (editingStaff) {
        payload.isActive = form.isActive;
        await updateStaff(editingStaff._id, payload);
        Toast.show({ type: "success", text1: "Staff member updated" });
      } else {
        await createStaff(payload);
        Toast.show({ type: "success", text1: "Staff member added" });
      }
      setIsModalOpen(false);
      fetchStaff();
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Operation failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(targetId);
    try {
      await deleteStaff(targetId);
      Toast.show({ type: "success", text1: "Staff member removed" });
      fetchStaff();
    } catch {
      Toast.show({ type: "error", text1: "Failed to remove staff member" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleStaffStatus(id);
      fetchStaff();
    } catch {
      Toast.show({ type: "error", text1: "Failed to update status" });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="50%" height={24} borderRadius={6} />
            <SkeletonBlock width="70%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        </View>
        <View style={styles.list}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.staffCard, { gap: 8 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <SkeletonBlock width="50%" height={15} borderRadius={6} />
                <SkeletonBlock width={60} height={20} borderRadius={8} />
              </View>
              <SkeletonBlock width="40%" height={12} borderRadius={6} />
              <SkeletonBlock width="80%" height={12} borderRadius={6} />
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
          <Text style={styles.title}>Manage Staff</Text>
          <Text style={styles.subtitle}>Add staff and control exactly what they can access.</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing} style={styles.refreshBtn}>
          <RefreshCw size={16} color="#ea580c" />
        </TouchableOpacity>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <UserPlus size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {staff.length === 0 ? (
        <View style={styles.emptyState}>
          <Users size={40} color="#ea580c" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No staff members yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your managers, waiters, and chefs and decide exactly what each one can do.
          </Text>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {staff.map((member) => (
            <View key={member._id} style={styles.staffCard}>
              <View style={styles.staffCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.staffEmail}>{member.email}</Text>
                </View>
                <View style={[styles.roleBadge, { borderColor: ROLE_BADGE_COLORS[member.staffRole] || "#9ca3af" }]}>
                  <Text style={[styles.roleBadgeText, { color: ROLE_BADGE_COLORS[member.staffRole] || "#6b7280" }]}>
                    {member.staffRole}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleToggleStatus(member._id)}
                style={[styles.statusBadge, member.isActive ? styles.statusActive : styles.statusDisabled]}
              >
                {member.isActive ? <ShieldCheck size={13} color="#16a34a" /> : <ShieldOff size={13} color="#dc2626" />}
                <Text style={[styles.statusText, { color: member.isActive ? "#16a34a" : "#dc2626" }]}>
                  {member.isActive ? "Active" : "Disabled"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.permsText} numberOfLines={2}>
                {member.permissions?.length
                  ? member.permissions.map((p) => PERMISSION_LABELS[p] || p).join(", ")
                  : "No permissions granted"}
              </Text>

              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEditModal(member)} style={styles.cardActionBtn}>
                  <Pencil size={14} color="#ea580c" />
                  <Text style={styles.cardActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDeleteTarget(member._id)}
                  disabled={deletingId === member._id}
                  style={[styles.cardActionBtn, styles.cardActionDanger]}
                >
                  {deletingId === member._id ? (
                    <>
                      <ActivityIndicator size="small" color="#dc2626" />
                      <Text style={[styles.cardActionText, { color: "#dc2626" }]}>Removing...</Text>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} color="#dc2626" />
                      <Text style={[styles.cardActionText, { color: "#dc2626" }]}>Remove</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ADD/EDIT MODAL */}
      <Modal visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>Email *</Text>
            <TextInput
              style={[styles.input, !!editingStaff && styles.inputDisabled]}
              placeholder="staff@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!editingStaff}
              value={form.email}
              onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
            />

            <Text style={styles.fieldLabel}>{editingStaff ? "New Password" : "Password *"}</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder={editingStaff ? "Leave blank to keep current" : "8+ characters"}
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Role *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleRow}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => handleRoleChange(role)}
                  style={[styles.roleChip, form.staffRole === role && styles.roleChipActive]}
                >
                  <Text style={[styles.roleChipText, form.staffRole === role && styles.roleChipTextActive]}>{role}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.helperText}>
              Picking a role auto-checks its default permissions below - you can still customize them.
            </Text>

            <Text style={styles.fieldLabel}>Permissions</Text>
            <View style={styles.permissionsBox}>
              {PERMISSIONS.map((permission) => {
                const checked = form.permissions.includes(permission);
                return (
                  <TouchableOpacity
                    key={permission}
                    onPress={() => togglePermission(permission)}
                    style={styles.permissionRow}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <View style={styles.checkboxDot} />}
                    </View>
                    <Text style={styles.permissionLabel}>{PERMISSION_LABELS[permission]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {editingStaff && (
              <View style={styles.activeRow}>
                <View>
                  <Text style={styles.activeLabel}>Account Active</Text>
                  <Text style={styles.activeSubLabel}>Turn off to immediately revoke access.</Text>
                </View>
                <Switch
                  value={form.isActive}
                  onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                  trackColor={{ true: "#ea580c", false: "#e5e7eb" }}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitBtnText}>{editingStaff ? "Saving..." : "Adding..."}</Text>
                </>
              ) : (
                <Text style={styles.submitBtnText}>{editingStaff ? "Save Changes" : "Add Staff Member"}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <CustomModal
        visible={!!deleteTarget}
        type="error"
        title="Remove staff member?"
        message="They will immediately lose access to the dashboard. This cannot be undone."
        confirmText="Remove"
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
  staffCard: { backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", padding: 14 },
  staffCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  staffName: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  staffEmail: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  roleBadgeText: { fontSize: 11, fontWeight: "800" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 8 },
  statusActive: { backgroundColor: "#f0fdf4" },
  statusDisabled: { backgroundColor: "#fef2f2" },
  statusText: { fontSize: 11, fontWeight: "800" },
  permsText: { fontSize: 12, color: "#6b7280", fontWeight: "500", marginBottom: 10 },
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
  inputDisabled: { opacity: 0.6 },
  passwordWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "#f9fafb" },
  passwordInput: { flex: 1, paddingHorizontal: 14, height: 50, fontSize: 15, color: "#1f2937" },
  eyeIcon: { padding: 12 },
  roleRow: { flexDirection: "row" },
  roleChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, backgroundColor: "#f3f4f6", marginRight: 8 },
  roleChipActive: { backgroundColor: "#ea580c" },
  roleChipText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  roleChipTextActive: { color: "#fff" },
  helperText: { fontSize: 11, color: "#9ca3af", marginTop: 8, lineHeight: 16 },
  permissionsBox: { backgroundColor: "#ffffff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 8 },
  permissionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { borderColor: "#ea580c", backgroundColor: "#ea580c" },
  checkboxDot: { width: 8, height: 8, borderRadius: 2, backgroundColor: "#fff" },
  permissionLabel: { fontSize: 13, fontWeight: "600", color: "#374151", flex: 1 },
  activeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 16, marginTop: 20 },
  activeLabel: { fontSize: 14, fontWeight: "800", color: "#1f2937" },
  activeSubLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  submitBtn: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#ea580c", marginTop: 24 },
  submitBtnDisabled: { backgroundColor: "#9ca3af" },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

export default StaffManager;
