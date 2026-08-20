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
  Plus,
  Check,
} from "lucide-react-native";

import { getStaffList, getStaffRoles, getPermissionCatalogue, createStaff, updateStaff, deleteStaff, toggleStaffStatus } from "../../API/staffApi";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  STAFF_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  Permission,
  type PermissionGroup,
} from "../../constants/permissions";
import CustomModal from "../../components/CustomModal";
import type { HeaderAction } from "../../components/Header";
import { SkeletonBlock } from "../../components/Skeleton";
import { emailFieldProps } from "../../utils/emailInput";

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

type StaffFilter = "all" | "active" | "inactive";

// Filtering is client-side: the staff list is a handful of people already
// loaded in full, so a round trip per filter tap would be slower and no more
// correct. No backend change is needed for this - `isActive` already ships
// on every staff record.
const STAFF_FILTERS: { id: StaffFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

type StaffManagerProps = {
  // Puts this panel's controls in the dashboard's section bar.
  onHeaderActions?: (actions: HeaderAction[]) => void;
};

const StaffManager = ({ onHeaderActions }: StaffManagerProps) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<string[]>([...STAFF_ROLES]);
  // Seeded from the bundled constants so the form renders immediately, then
  // replaced by whatever the server actually enforces.
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>(PERMISSION_GROUPS);
  const [roleDefaults, setRoleDefaults] =
    useState<Record<string, Permission[]>>(DEFAULT_ROLE_PERMISSIONS);

  const allPermissionKeys = useMemo(
    () => permissionGroups.flatMap((g) => g.permissions.map((p) => p.key)),
    [permissionGroups],
  );
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
    getPermissionCatalogue()
      .then((res) => {
        const groups = res?.data?.data?.groups;
        const defaults = res?.data?.data?.roleDefaults;
        if (Array.isArray(groups) && groups.length) setPermissionGroups(groups);
        if (defaults && typeof defaults === "object") setRoleDefaults(defaults);
      })
      // A failure here is not worth a toast: the bundled catalogue is a
      // complete, working list, just possibly one release behind.
      .catch(() => {});

    getStaffRoles()
      .then((res) => {
        if (res?.data?.data?.length) setRoles(res.data.data);
      })
      .catch(() => {});
  }, []);

  const [statusFilter, setStatusFilter] = useState<StaffFilter>("all");

  const activeCount = staff.filter((m) => m.isActive).length;
  const visibleStaff =
    statusFilter === "all"
      ? staff
      : staff.filter((m) => (statusFilter === "active" ? m.isActive : !m.isActive));

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStaff();
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  // Handlers in a ref so the publishing effect below has no reactive deps at
  // all. Depending on the handlers directly would re-run it every render,
  // publishing a fresh array each time and bouncing renders between this
  // panel and the dashboard indefinitely.
  const handlersRef = useRef({ refresh: () => {}, add: () => {} });
  handlersRef.current = { refresh: handleRefresh, add: openAddModal };

  // Both are always offered: refreshing an empty team is reasonable, and
  // adding the first member is the whole point of an empty one.
  useEffect(() => {
    onHeaderActions?.([
      {
        key: "refresh",
        icon: RefreshCw,
        label: "Refresh",
        onPress: () => handlersRef.current.refresh(),
      },
      {
        key: "add-staff",
        icon: UserPlus,
        label: "Add staff",
        // Labelled pill, not a bare icon: this is the primary action on the
        // screen and it no longer has a copy in the page to fall back on.
        showLabel: true,
        onPress: () => handlersRef.current.add(),
      },
    ]);
  }, [onHeaderActions]);

  // Leaving the section takes the buttons with it.
  useEffect(() => () => onHeaderActions?.([]), [onHeaderActions]);

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
      permissions: roleDefaults[staffRole] || DEFAULT_ROLE_PERMISSIONS[staffRole] || [],
    }));
  };

  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState("");

  // A custom role is just a string on the staff record - the server stores
  // whatever it is sent (max 40 chars) and getStaffRoles surfaces every title
  // already in use back into this list. So nothing needs creating first; the
  // role exists the moment a member is saved with it.
  const commitNewRole = () => {
    const trimmed = newRole.trim();
    if (!trimmed) return;

    // Case-insensitive match so "cashier" does not become a second entry
    // beside an existing "Cashier".
    const existing = roles.find((r) => r.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      handleRoleChange(existing);
    } else {
      setRoles((prev) => [...prev, trimmed]);
      // Deliberately NOT routed through handleRoleChange: that applies a
      // role's default permissions, and a brand-new role has none. Setting
      // the field directly leaves the checkboxes exactly as the owner left
      // them rather than silently clearing what they had already ticked.
      setForm((prev) => ({ ...prev, staffRole: trimmed }));
    }

    setNewRole("");
    setAddingRole(false);
  };

  const toggleGroup = (keys: string[], grant: boolean) => {
    setForm((prev) => {
      const next = new Set(prev.permissions);
      keys.forEach((k) => (grant ? next.add(k) : next.delete(k)));
      return { ...prev, permissions: Array.from(next) };
    });
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

  // Flips isActive on the server (PATCH /staff/:id/status) and reflects it
  // immediately, rather than waiting on a full list refetch - a switch that
  // does not move until a round trip completes feels broken.
  //
  // On failure the row is put back exactly as it was, so the switch can never
  // show a state the server does not agree with.
  const handleToggleStatus = async (member: StaffMember) => {
    const id = member._id;
    if (togglingId) return; // one at a time; the list is small

    const next = !member.isActive;
    setTogglingId(id);
    setStaff((prev) => prev.map((m) => (m._id === id ? { ...m, isActive: next } : m)));

    try {
      const res = await toggleStaffStatus(id);
      // Trust the server's copy over the guess where it is available - the
      // endpoint returns the updated record.
      const updated = res?.data?.data;
      if (updated) {
        setStaff((prev) => prev.map((m) => (m._id === id ? { ...m, ...updated } : m)));
      }
      Toast.show({
        type: "success",
        text1: next ? `${member.name} can sign in` : `${member.name} is disabled`,
        text2: next ? undefined : "Their session ends on the next request",
      });
    } catch {
      setStaff((prev) => prev.map((m) => (m._id === id ? { ...m, isActive: !next } : m)));
      Toast.show({ type: "error", text1: "Failed to update status" });
    } finally {
      setTogglingId(null);
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
      {/* Both Add staff and Refresh now live in the section bar, so the page
          leads with the filter instead of a second copy of those controls. */}
      {staff.length > 0 && (
        <View style={styles.filterRow}>
          {STAFF_FILTERS.map(({ id, label }) => {
            const isActive = statusFilter === id;
            const count =
              id === "all"
                ? staff.length
                : id === "active"
                ? activeCount
                : staff.length - activeCount;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setStatusFilter(id)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {label}
                </Text>
                <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {staff.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconRing}>
            <View style={styles.emptyIconCircle}>
              <Users size={30} color="#ea580c" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No staff yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your managers, waiters and chefs, and choose exactly what each one can see
            and do in the dashboard.
          </Text>
          <TouchableOpacity style={styles.emptyCta} onPress={openAddModal} activeOpacity={0.85}>
            <UserPlus size={16} color="#fff" />
            <Text style={styles.emptyCtaText}>Add your first staff member</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {/* A one-line read on the team before any individual card - the
              number that matters day to day is how many can currently log in. */}
          {/* Doubles as feedback for the section bar's refresh icon, which is
              too small to hold a spinner of its own. */}
          <Text style={styles.listSummary}>
            {isRefreshing ? "Refreshing…" : `${activeCount} of ${staff.length} active`}
          </Text>

          {/* A filter matching nobody is not the same as having no staff, so
              it says so rather than reusing the "no staff yet" screen. */}
          {visibleStaff.length === 0 && (
            <View style={styles.filterEmpty}>
              <Text style={styles.filterEmptyText}>
                No {statusFilter} staff members
              </Text>
              <TouchableOpacity onPress={() => setStatusFilter("all")} activeOpacity={0.75}>
                <Text style={styles.filterEmptyLink}>Show all</Text>
              </TouchableOpacity>
            </View>
          )}

          {visibleStaff.map((member) => {
            const roleColor = ROLE_BADGE_COLORS[member.staffRole] || "#6b7280";
            const permCount = member.permissions?.length || 0;
            return (
              <View key={member._id} style={styles.staffCard}>
                {/* Identity row: initial, name, email, role. The monogram gives
                    each person a fixed anchor so a long list stays scannable. */}
                <View style={styles.staffTop}>
                  <View style={[styles.avatar, { backgroundColor: `${roleColor}1A` }]}>
                    <Text style={[styles.avatarText, { color: roleColor }]}>
                      {(member.name || "?").trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.staffIdentity}>
                    <Text style={styles.staffName} numberOfLines={1}>
                      {member.name}
                    </Text>
                    <Text style={styles.staffEmail} numberOfLines={1}>
                      {member.email}
                    </Text>
                  </View>

                  <View style={[styles.roleBadge, { backgroundColor: `${roleColor}14`, borderColor: `${roleColor}33` }]}>
                    <Text style={[styles.roleBadgeText, { color: roleColor }]}>{member.staffRole}</Text>
                  </View>
                </View>

                {/* An actual Switch rather than a tappable badge. The pill it
                    replaced looked like a status label, so the fact that it
                    also disabled someone's login was not discoverable. */}
                <View style={styles.accessRow}>
                  <View style={styles.accessText}>
                    <View style={styles.accessTitleRow}>
                      {member.isActive ? (
                        <ShieldCheck size={13} color="#16a34a" />
                      ) : (
                        <ShieldOff size={13} color="#dc2626" />
                      )}
                      <Text
                        style={[
                          styles.statusText,
                          member.isActive ? styles.statusTextOn : styles.statusTextOff,
                        ]}
                      >
                        {member.isActive ? "Can sign in" : "Sign-in disabled"}
                      </Text>
                    </View>
                    <Text style={styles.permCount}>
                      {permCount === 0
                        ? "No permissions"
                        : `${permCount} permission${permCount === 1 ? "" : "s"}`}
                    </Text>
                  </View>

                  {togglingId === member._id ? (
                    <ActivityIndicator size="small" color="#ea580c" />
                  ) : (
                    <Switch
                      value={member.isActive}
                      onValueChange={() => handleToggleStatus(member)}
                      // Any row mid-request locks the rest, so two overlapping
                      // writes cannot land out of order.
                      disabled={!!togglingId}
                      trackColor={{ false: "#e5e7eb", true: "#bbf7d0" }}
                      thumbColor={member.isActive ? "#16a34a" : "#f9fafb"}
                    />
                  )}
                </View>

                {permCount > 0 && (
                  <View style={styles.permChips}>
                    {member.permissions.slice(0, 3).map((p) => (
                      <View key={p} style={styles.permChip}>
                        <Text style={styles.permChipText}>{PERMISSION_LABELS[p] || p}</Text>
                      </View>
                    ))}
                    {permCount > 3 && (
                      <View style={styles.permChip}>
                        <Text style={styles.permChipText}>+{permCount - 3} more</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEditModal(member)} style={styles.cardActionBtn} activeOpacity={0.75}>
                    <Pencil size={14} color="#ea580c" />
                    <Text style={styles.cardActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDeleteTarget(member._id)}
                    disabled={deletingId === member._id}
                    style={[styles.cardActionBtn, styles.cardActionDanger]}
                    activeOpacity={0.75}
                  >
                    {deletingId === member._id ? (
                      <ActivityIndicator size="small" color="#dc2626" />
                    ) : (
                      <Trash2 size={14} color="#dc2626" />
                    )}
                    <Text style={[styles.cardActionText, styles.cardActionTextDanger]}>
                      {deletingId === member._id ? "Removing…" : "Remove"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
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
            <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>Email *</Text>
            <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
              style={[styles.input, !!editingStaff && styles.inputDisabled]}
              placeholder="staff@example.com"
              {...emailFieldProps}
              editable={!editingStaff}
              value={form.email}
              onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
            />

            <Text style={styles.fieldLabel}>{editingStaff ? "New Password" : "Password *"}</Text>
            <View style={styles.passwordWrapper}>
              <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
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

              {/* The role has always been free text on the server - the list
                  above is just Manager/Chef/Waiter plus whatever titles this
                  restaurant already uses. This is the only way to introduce
                  a new one, which previously meant an owner could not create
                  "Cashier" or "Host" at all. */}
              <TouchableOpacity
                onPress={() => setAddingRole(true)}
                style={[styles.roleChip, styles.roleChipAdd]}
                activeOpacity={0.75}
              >
                <Plus size={13} color="#ea580c" />
                <Text style={styles.roleChipAddText}>New role</Text>
              </TouchableOpacity>
            </ScrollView>

            {addingRole && (
              <View style={styles.newRoleRow}>
                <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
                  style={[styles.input, styles.newRoleInput]}
                  placeholder="e.g. Cashier"
                  value={newRole}
                  onChangeText={setNewRole}
                  autoFocus
                  maxLength={40}
                  autoCapitalize="words"
                  onSubmitEditing={commitNewRole}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={commitNewRole}
                  disabled={!newRole.trim()}
                  style={[styles.newRoleBtn, !newRole.trim() && styles.newRoleBtnDisabled]}
                  activeOpacity={0.8}
                >
                  <Check size={16} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setAddingRole(false);
                    setNewRole("");
                  }}
                  style={styles.newRoleCancel}
                  activeOpacity={0.75}
                >
                  <X size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.helperText}>
              Picking a role auto-checks its default permissions below - you can still customize
              them. A new role starts with nothing checked, so tick exactly what it should have.
            </Text>

            <View style={styles.permHeaderRow}>
              <Text style={styles.fieldLabel}>Permissions</Text>
              <Text style={styles.permGrantedCount}>
                {form.permissions.length} of {allPermissionKeys.length}
              </Text>
            </View>

            {/* Grouped, not one flat list of eighteen checkboxes. Grouping is
                what makes it obvious that a right has been left off - an
                owner scanning "Menu" sees both of its rows together, where a
                single column made it easy to grant edit and miss delete.
                Each group has a select-all so a common case is one tap. */}
            {permissionGroups.map((group) => {
              const keys = group.permissions.map((p) => p.key);
              const grantedCount = keys.filter((k) => form.permissions.includes(k)).length;
              const allGranted = grantedCount === keys.length;

              return (
                <View key={group.id} style={styles.permGroup}>
                  <View style={styles.permGroupHead}>
                    <View style={styles.permGroupTitleWrap}>
                      <Text style={styles.permGroupTitle}>{group.label}</Text>
                      {!!group.description && (
                        <Text style={styles.permGroupDesc}>{group.description}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleGroup(keys, !allGranted)}
                      style={styles.permGroupToggle}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.permGroupToggleText}>
                        {allGranted ? "Clear" : "All"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.permissionsBox}>
                    {group.permissions.map((item) => {
                      const checked = form.permissions.includes(item.key);
                      return (
                        <TouchableOpacity
                          key={item.key}
                          onPress={() => togglePermission(item.key)}
                          style={styles.permissionRow}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                            {checked && <View style={styles.checkboxDot} />}
                          </View>
                          <View style={styles.permissionTextWrap}>
                            <Text style={styles.permissionLabel}>
                              {item.label || PERMISSION_LABELS[item.key] || item.key}
                            </Text>
                            {/* The hint is where the consequence lives -
                                "cannot be undone", "lets someone widen
                                colleagues' access". A label alone does not
                                tell an owner what they are handing over. */}
                            {!!item.hint && (
                              <Text style={styles.permissionHint}>{item.hint}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}

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
  // refreshBtn / addBtn / addBtnText removed with the in-page controls -
  // both actions live in the section bar now.

  // Unboxed and centred, matching every other empty state in the dashboard.
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  emptySubtitle: { fontSize: 13, lineHeight: 20, color: "#6b7280", textAlign: "center", marginTop: 8 },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#ea580c",
  },
  emptyCtaText: { fontSize: 14, fontWeight: "800", color: "#ffffff" },

  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterPillActive: { backgroundColor: "#ea580c", borderColor: "#ea580c" },
  filterPillText: { fontSize: 12, fontWeight: "800", color: "#4b5563" },
  filterPillTextActive: { color: "#ffffff" },
  filterCount: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountActive: { backgroundColor: "rgba(255,255,255,0.9)" },
  filterCountText: { fontSize: 10, fontWeight: "800", color: "#6b7280" },
  filterCountTextActive: { color: "#ea580c" },

  filterEmpty: { alignItems: "center", gap: 6, paddingVertical: 36 },
  filterEmptyText: { fontSize: 13, fontWeight: "700", color: "#9ca3af" },
  filterEmptyLink: { fontSize: 13, fontWeight: "800", color: "#ea580c" },

  list: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 32 },
  listSummary: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    marginBottom: 4,
  },
  staffCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 14,
  },
  staffTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  // Tinted with the role's own colour at low alpha, so the monogram carries
  // the role at a glance even before the badge is read.
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontWeight: "900" },
  staffIdentity: { flex: 1 },
  staffName: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  staffEmail: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  roleBadgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },

  // Label block on the left, switch pinned right - the switch reads as the
  // control for the line it sits on.
  accessRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  accessText: { flex: 1 },
  accessTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 12, fontWeight: "800" },
  statusTextOn: { color: "#16a34a" },
  statusTextOff: { color: "#dc2626" },
  permCount: { fontSize: 11, fontWeight: "700", color: "#9ca3af" },

  // Up to three named permissions then a "+N more" - the old version joined
  // every label into one grey sentence that truncated mid-word.
  permChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  permChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  permChipText: { fontSize: 10, fontWeight: "700", color: "#6b7280" },

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
  inputDisabled: { opacity: 0.6 },
  passwordWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "#f9fafb" },
  passwordInput: { flex: 1, paddingHorizontal: 14, height: 50, fontSize: 15, color: "#1f2937" },
  eyeIcon: { padding: 12 },
  roleRow: { flexDirection: "row" },
  roleChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, backgroundColor: "#f3f4f6", marginRight: 8 },
  roleChipActive: { backgroundColor: "#ea580c" },
  roleChipAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderStyle: "dashed",
  },
  roleChipAddText: { fontSize: 12, fontWeight: "800", color: "#ea580c" },
  newRoleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  newRoleInput: { flex: 1, marginBottom: 0 },
  newRoleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
  },
  newRoleBtnDisabled: { backgroundColor: "#fdba74" },
  newRoleCancel: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  roleChipText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  roleChipTextActive: { color: "#fff" },
  helperText: { fontSize: 11, color: "#9ca3af", marginTop: 8, lineHeight: 16 },
  permHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  permGrantedCount: { fontSize: 12, fontWeight: "800", color: "#ea580c" },
  permGroup: { marginBottom: 16 },
  permGroupHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 7,
  },
  permGroupTitleWrap: { flex: 1 },
  permGroupTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#6b7280",
  },
  permGroupDesc: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  permGroupToggle: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  permGroupToggleText: { fontSize: 11, fontWeight: "800", color: "#ea580c" },
  permissionsBox: { backgroundColor: "#ffffff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 8 },
  // alignItems flex-start so the checkbox sits level with the first line of a
  // label that wraps onto two, rather than floating in the middle of it.
  permissionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, paddingHorizontal: 8 },
  permissionTextWrap: { flex: 1 },
  permissionHint: { fontSize: 11, lineHeight: 16, color: "#9ca3af", marginTop: 3 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { borderColor: "#ea580c", backgroundColor: "#ea580c" },
  checkboxDot: { width: 8, height: 8, borderRadius: 2, backgroundColor: "#fff" },
  permissionLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  activeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 16, marginTop: 20 },
  activeLabel: { fontSize: 14, fontWeight: "800", color: "#1f2937" },
  activeSubLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  submitBtn: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#ea580c", marginTop: 24 },
  submitBtnDisabled: { backgroundColor: "#9ca3af" },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

export default StaffManager;
