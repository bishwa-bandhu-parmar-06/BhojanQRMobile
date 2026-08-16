import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  Users,
  UserPlus,
  Mail,
  Send,
  X,
  Crown,
  Clock,
  CheckCircle2,
  Phone,
  Trash2,
  UserCheck,
} from "lucide-react-native";

import {
  getAllAdmins,
  inviteAdmin,
  resendAdminInvite,
  deleteAdmin,
} from "../../API/adminApi";
import CustomModal from "../CustomModal";
import { SkeletonBlock } from "../Skeleton";
import SectionError from "../SectionError";

const AdminTeamManager = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Sent by the server alongside the list, so "you" can be marked without a
  // second request for the profile.
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<any>(null);
  const [removing, setRemoving] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", mobile: "" });
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setLoadError(false);
      const res = await getAllAdmins();
      setAdmins(res?.data?.data || []);
      setCurrentAdminId(res?.data?.currentAdminId || null);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load the admin team" });
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openInvite = () => {
    setForm({ name: "", email: "", mobile: "" });
    setInviteOpen(true);
  };

  const submitInvite = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();

    if (!name || !email) {
      Toast.show({ type: "error", text1: "Name and email are required" });
      return;
    }

    setSending(true);
    try {
      await inviteAdmin({ name, email, mobile });
      Toast.show({
        type: "success",
        text1: "Invitation sent",
        text2: `${email} can now set their own password`,
      });
      setInviteOpen(false);
      load(true);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Could not send the invitation",
      });
    } finally {
      setSending(false);
    }
  };

  const resend = async (id: string, email: string) => {
    setResendingId(id);
    try {
      await resendAdminInvite(id);
      Toast.show({ type: "success", text1: "Invitation resent", text2: email });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Could not resend the invitation",
      });
    } finally {
      setResendingId(null);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget || removing) return;
    setRemoving(true);
    try {
      await deleteAdmin(removeTarget._id);
      Toast.show({
        type: "success",
        text1:
          removeTarget.status === "pending"
            ? "Invitation cancelled"
            : "Admin removed",
      });
      setRemoveTarget(null);
      load(true);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Could not remove this admin",
      });
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.card}>
              <SkeletonBlock width="50%" height={14} borderRadius={6} />
              <SkeletonBlock width="70%" height={12} borderRadius={6} style={styles.gap8} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (loadError && admins.length === 0) {
    return (
      <View style={styles.container}>
        <SectionError message="Failed to load the admin team." onRetry={() => load()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {admins.length} admin{admins.length === 1 ? "" : "s"}
        </Text>
        <TouchableOpacity style={styles.inviteBtn} onPress={openInvite} activeOpacity={0.85}>
          <UserPlus size={15} color="#ffffff" />
          <Text style={styles.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={admins}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            colors={["#f97316"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Users size={44} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No admins yet</Text>
            <Text style={styles.emptyBody}>
              Invite someone and they will receive an email to set their own password.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          // Straight from the record, not inferred. The old guess keyed off
          // lastLogin/passwordSetAt - fields the Admin model does not have -
          // so every account read as pending, including the super admin.
          const isPending = item.status === "pending";
          const isSuper = item.adminRole === "super_admin";
          const isYou = !!currentAdminId && item._id === currentAdminId;
          // The super admin cannot be removed, and neither can you remove
          // yourself; the server enforces both, so offering the button would
          // only produce an error.
          const canRemove = !isSuper && !isYou;

          return (
            <View style={[styles.card, isSuper && styles.cardSuper]}>
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.avatar,
                    isSuper ? styles.avatarSuper : isPending ? styles.avatarPending : styles.avatarSub,
                  ]}
                >
                  {isSuper ? (
                    <Crown size={18} color="#b45309" />
                  ) : isPending ? (
                    <Clock size={17} color="#d97706" />
                  ) : (
                    <UserCheck size={17} color="#2563eb" />
                  )}
                </View>

                <View style={styles.cardText}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name || "Unnamed"}
                    </Text>
                    {isYou && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>YOU</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.roleRow}>
                    <View style={[styles.roleBadge, isSuper ? styles.roleSuper : styles.roleSub]}>
                      <Text
                        style={[
                          styles.roleBadgeText,
                          isSuper ? styles.roleTextSuper : styles.roleTextSub,
                        ]}
                      >
                        {isSuper ? "SUPER ADMIN" : "SUB ADMIN"}
                      </Text>
                    </View>
                    {!!item.createdAt && (
                      <Text style={styles.joined}>
                        Joined {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={[styles.statusChip, isPending ? styles.statusPending : styles.statusActive]}>
                  {isPending ? (
                    <Clock size={10} color="#d97706" />
                  ) : (
                    <CheckCircle2 size={10} color="#16a34a" />
                  )}
                  <Text
                    style={[
                      styles.statusChipText,
                      isPending ? styles.statusTextPending : styles.statusTextActive,
                    ]}
                  >
                    {isPending ? "PENDING" : "ACTIVE"}
                  </Text>
                </View>
              </View>

              <View style={styles.contactBlock}>
                <View style={styles.contactRow}>
                  <Mail size={13} color="#94a3b8" />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
                {!!item.mobile && (
                  <View style={styles.contactRow}>
                    <Phone size={13} color="#94a3b8" />
                    <Text style={styles.contactText}>{item.mobile}</Text>
                  </View>
                )}
                {/* Who brought them in. The super admin has no inviter, which
                    is what makes them the root of the tree. */}
                {!isSuper && !!item.invitedBy?.name && (
                  <View style={styles.contactRow}>
                    <UserPlus size={13} color="#94a3b8" />
                    <Text style={styles.contactText} numberOfLines={1}>
                      Invited by {item.invitedBy.name}
                    </Text>
                  </View>
                )}
              </View>

              {(isPending || canRemove) && (
                <View style={styles.actionRow}>
                  {isPending && (
                    <TouchableOpacity
                      style={styles.resendBtn}
                      onPress={() => resend(item._id, item.email)}
                      disabled={resendingId === item._id}
                      activeOpacity={0.8}
                    >
                      {resendingId === item._id ? (
                        <ActivityIndicator size="small" color="#f97316" />
                      ) : (
                        <>
                          <Send size={12} color="#f97316" />
                          <Text style={styles.resendText}>Resend invite</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {canRemove && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => setRemoveTarget(item)}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={12} color="#dc2626" />
                      <Text style={styles.removeText}>
                        {isPending ? "Cancel" : "Remove"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      <CustomModal
        visible={!!removeTarget}
        type="error"
        title={removeTarget?.status === "pending" ? "Cancel invitation?" : "Remove admin?"}
        message={
          removeTarget?.status === "pending"
            ? `${removeTarget?.email} will no longer be able to use their invitation link.`
            : `${removeTarget?.name} will lose access to the admin portal immediately.`
        }
        confirmText={removeTarget?.status === "pending" ? "Cancel invitation" : "Remove"}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />

      <Modal
        visible={inviteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Invite an admin</Text>
              <TouchableOpacity onPress={() => setInviteOpen(false)} style={styles.sheetClose}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* No password field: the invitee sets their own from the emailed
                link, so nobody has to send a credential over a side channel. */}
            <Text style={styles.sheetHint}>
              They will get an email with a link to set their own password.
            </Text>

            <Text style={styles.label}>Full name *</Text>
            <TextInput
              cursorColor="#f97316"
              selectionColor="#fdba74"
              style={styles.input}
              placeholder="e.g. Priya Sharma"
              placeholderTextColor="#94a3b8"
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              cursorColor="#f97316"
              selectionColor="#fdba74"
              style={styles.input}
              placeholder="admin@bhojanqr.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
            />

            <Text style={styles.label}>Mobile</Text>
            <TextInput
              cursorColor="#f97316"
              selectionColor="#fdba74"
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={form.mobile}
              onChangeText={(v) => setForm((p) => ({ ...p, mobile: v }))}
            />

            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnBusy]}
              onPress={submitInvite}
              disabled={sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Mail size={16} color="#ffffff" />
                  <Text style={styles.sendBtnText}>Send invitation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AdminTeamManager;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  gap8: { marginTop: 8 },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  count: { fontSize: 12, fontWeight: "800", color: "#64748b" },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f97316",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  inviteBtnText: { fontSize: 13, fontWeight: "800", color: "#ffffff" },

  listContent: { padding: 16, paddingBottom: 32, gap: 10 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  // The super admin's card is tinted and outlined: it is the root of the
  // team and the one account that cannot be removed, so it should not look
  // like just another row.
  cardSuper: { borderColor: "#fed7aa", backgroundColor: "#fffdf9" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSuper: { backgroundColor: "#fef3c7" },
  avatarSub: { backgroundColor: "#eff6ff" },
  avatarPending: { backgroundColor: "#fffbeb" },
  cardText: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: "800", color: "#0f172a" },
  youBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: "#dcfce7",
  },
  youBadgeText: { fontSize: 9, fontWeight: "900", color: "#16a34a", letterSpacing: 0.5 },

  roleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  roleSuper: { backgroundColor: "#fef3c7" },
  roleSub: { backgroundColor: "#e0e7ff" },
  roleBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  roleTextSuper: { color: "#b45309" },
  roleTextSub: { color: "#4338ca" },
  joined: { flexShrink: 1, fontSize: 10, fontWeight: "600", color: "#94a3b8" },

  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: { backgroundColor: "#f0fdf4" },
  statusPending: { backgroundColor: "#fffbeb" },
  statusChipText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  statusTextActive: { color: "#16a34a" },
  statusTextPending: { color: "#d97706" },

  contactBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 7,
  },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactText: { flexShrink: 1, fontSize: 12, fontWeight: "600", color: "#64748b" },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 13 },
  resendBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  resendText: { fontSize: 12, fontWeight: "800", color: "#f97316" },
  removeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  removeText: { fontSize: 12, fontWeight: "800", color: "#dc2626" },

  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#334155", marginTop: 8 },
  emptyBody: { fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 19 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  sheet: { backgroundColor: "#ffffff", borderRadius: 20, padding: 20 },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  sheetClose: { padding: 6 },
  sheetHint: { fontSize: 12, color: "#64748b", marginTop: 6, marginBottom: 16, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: "700", color: "#475569", marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 11,
    paddingHorizontal: 13,
    height: 46,
    fontSize: 14,
    color: "#0f172a",
    paddingVertical: 0,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 13,
    backgroundColor: "#f97316",
    marginTop: 20,
  },
  sendBtnBusy: { opacity: 0.75 },
  sendBtnText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
});
