import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, TextInput, RefreshControl } from "react-native";
import Toast from "react-native-toast-message";
import { Mail, Users, Send, Trash2, RefreshCw, CheckCircle2, Clock, Sparkles } from "lucide-react-native";

import {
  getSubscribers,
  createNewsletter,
  generateNewsletterContent,
  getNewsletters,
  deleteNewsletter,
  sendNewsletter,
} from "../../API/newsletterApi";
import CustomModal from "../CustomModal";
import BhojanQRLoader from "../BhojanQRLoader";
import SectionError from "../SectionError";

const SUBJECT_MAX_LENGTH = 150;
const CONTENT_MAX_LENGTH = 8000;

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#f1f5f9", color: "#64748b" },
  sending: { bg: "#fff7ed", color: "#ea580c" },
  sent: { bg: "#f0fdf4", color: "#16a34a" },
  failed: { bg: "#fef2f2", color: "#dc2626" },
};

const NewsletterManager = () => {
  const [activeCount, setActiveCount] = useState(0);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ subject: "", content: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: "send" | "delete" | null; target: any }>({ type: null, target: null });
  const [isConfirmBusy, setIsConfirmBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      setLoadError(false);
      const [subsRes, newslettersRes] = await Promise.all([getSubscribers(1, 1), getNewsletters()]);
      setActiveCount(subsRes.data?.activeCount || 0);
      setNewsletters(newslettersRes.data?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load newsletter data" });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setLoadError(false);
      const [subsRes, newslettersRes] = await Promise.all([getSubscribers(1, 1), getNewsletters()]);
      setActiveCount(subsRes.data?.activeCount || 0);
      setNewsletters(newslettersRes.data?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load newsletter data" });
      setLoadError(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!form.subject.trim() || !form.content.trim()) {
      Toast.show({ type: "error", text1: "Subject and content are required" });
      return;
    }
    setIsSaving(true);
    try {
      await createNewsletter(form.subject, form.content);
      Toast.show({ type: "success", text1: "Draft created" });
      setForm({ subject: "", content: "" });
      loadData();
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to create draft" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!form.subject.trim()) {
      Toast.show({ type: "error", text1: "Enter a subject first - AI writes the content from that" });
      return;
    }
    setIsGenerating(true);
    try {
      const res = await generateNewsletterContent(form.subject.trim());
      setForm((prev) => ({ ...prev, content: res.data?.data?.content || "" }));
      Toast.show({ type: "success", text1: "Draft generated - review before saving" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "AI generation failed" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAction = async () => {
    const { type, target } = confirmState;
    setIsConfirmBusy(true);
    if (type === "send") {
      setSendingId(target._id);
      try {
        const res = await sendNewsletter(target._id);
        Toast.show({ type: "success", text1: res.data?.message || "Newsletter sent" });
        loadData();
      } catch (error: any) {
        Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to send" });
      } finally {
        setSendingId(null);
      }
    } else if (type === "delete") {
      try {
        await deleteNewsletter(target);
        Toast.show({ type: "success", text1: "Draft deleted" });
        loadData();
      } catch {
        Toast.show({ type: "error", text1: "Failed to delete draft" });
      }
    }
    setIsConfirmBusy(false);
    setConfirmState({ type: null, target: null });
  };

  if (loading) {
    return <BhojanQRLoader fullScreen={false} />;
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ea580c"]} />}
    >
      <View style={styles.statCard}>
        <View style={styles.statIconBox}>
          <Users size={22} color="#16a34a" />
        </View>
        <View>
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Subscribers</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Mail size={18} color="#ea580c" />
          <Text style={styles.cardTitle}>Create Newsletter</Text>
        </View>
        <Text style={styles.cardSubtitle}>A one-off update - never sent automatically on a schedule.</Text>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Subject</Text>
          <Text style={styles.charCount}>{form.subject.length}/{SUBJECT_MAX_LENGTH}</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="e.g. New: Kitchen workflow improvements are live"
          maxLength={SUBJECT_MAX_LENGTH}
          value={form.subject}
          onChangeText={(v) => setForm((p) => ({ ...p, subject: v }))}
        />

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Content (HTML supported)</Text>
          <Text style={styles.charCount}>{form.content.length}/{CONTENT_MAX_LENGTH}</Text>
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="<h2>Hi there!</h2><p>Here's what's new...</p>"
          maxLength={CONTENT_MAX_LENGTH}
          multiline
          numberOfLines={8}
          value={form.content}
          onChangeText={(v) => setForm((p) => ({ ...p, content: v }))}
        />

        <TouchableOpacity
          style={[styles.aiBtn, (isGenerating || !form.subject.trim()) && { opacity: 0.5 }]}
          onPress={handleGenerateContent}
          disabled={isGenerating || !form.subject.trim()}
        >
          {isGenerating ? <RefreshCw size={13} color="#7c3aed" /> : <Sparkles size={13} color="#7c3aed" />}
          <Text style={styles.aiBtnText}>Generate with AI</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.6 }]} onPress={handleCreateDraft} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <><Mail size={16} color="#fff" /><Text style={styles.saveBtnText}>Save as Draft</Text></>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Newsletter History</Text>
        {loadError && newsletters.length === 0 ? (
          <SectionError message="Failed to load newsletter history." onRetry={loadData} />
        ) : newsletters.length === 0 ? (
          <Text style={styles.emptyText}>No newsletters created yet.</Text>
        ) : (
          newsletters.map((n) => {
            const statusMeta = STATUS_COLORS[n.status] || STATUS_COLORS.draft;
            return (
              <View key={n._id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.historyTopRow}>
                    <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
                      <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{n.status}</Text>
                    </View>
                    <View style={styles.dateRow}>
                      <Clock size={11} color="#9ca3af" />
                      <Text style={styles.dateText}>{new Date(n.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <Text style={styles.historySubject} numberOfLines={1}>{n.subject}</Text>
                  {n.status === "sent" && (
                    <View style={styles.deliveredRow}>
                      <CheckCircle2 size={11} color="#16a34a" />
                      <Text style={styles.deliveredText}>
                        Delivered {n.deliveredCount}/{n.recipientCount}{n.failedCount > 0 ? ` (${n.failedCount} failed)` : ""}
                      </Text>
                    </View>
                  )}
                </View>
                {n.status === "draft" && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setConfirmState({ type: "send", target: n })}
                      disabled={sendingId === n._id}
                      style={styles.sendBtn}
                    >
                      {sendingId === n._id ? <ActivityIndicator color="#fff" size="small" /> : <Send size={13} color="#fff" />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setConfirmState({ type: "delete", target: n._id })} style={styles.deleteBtn}>
                      <Trash2 size={13} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      <CustomModal
        visible={!!confirmState.type}
        type={confirmState.type === "send" ? "success" : "error"}
        title={confirmState.type === "send" ? "Send Newsletter" : "Delete Draft"}
        message={
          confirmState.type === "send"
            ? `Send "${confirmState.target?.subject}" to ${activeCount} subscriber(s)? This cannot be undone.`
            : "Delete this draft? This cannot be undone."
        }
        confirmText={confirmState.type === "send" ? "Send Now" : "Delete"}
        cancelText="Cancel"
        onConfirm={handleConfirmAction}
        onCancel={() => !isConfirmBusy && setConfirmState({ type: null, target: null })}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  container: { flex: 1, backgroundColor: "#f9fafb" },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  statCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  statIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "900", color: "#1f2937" },
  statLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#1f2937" },
  cardSubtitle: { fontSize: 12, color: "#6b7280", marginBottom: 16 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, marginTop: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: "#374151" },
  charCount: { fontSize: 11, color: "#9ca3af" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 14, backgroundColor: "#f9fafb", color: "#1f2937" },
  textArea: { height: 140, paddingTop: 12, textAlignVertical: "top" },
  aiBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#faf5ff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 10 },
  aiBtnText: { fontSize: 12, fontWeight: "800", color: "#7c3aed" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#ea580c", height: 50, borderRadius: 12, marginTop: 16 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  emptyText: { fontSize: 13, color: "#9ca3af", marginTop: 8 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#f9fafb", marginTop: 8, gap: 10 },
  historyTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 10, color: "#9ca3af", fontWeight: "600" },
  historySubject: { fontSize: 13, fontWeight: "800", color: "#1f2937" },
  deliveredRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  deliveredText: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  sendBtn: { backgroundColor: "#ea580c", padding: 10, borderRadius: 10 },
  deleteBtn: { backgroundColor: "#fef2f2", padding: 10, borderRadius: 10 },
});

export default NewsletterManager;
