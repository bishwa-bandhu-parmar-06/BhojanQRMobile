import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import Toast from "react-native-toast-message";
import { launchImageLibrary } from "react-native-image-picker";
import {
  LifeBuoy,
  RefreshCw,
  Plus,
  ArrowLeft,
  Paperclip,
  X,
  FileText,
  CircleDot,
  Loader,
  CheckCircle2,
} from "lucide-react-native";

import { createSupportTicket, getMyTickets } from "../../API/supportTicketApi";
import { SkeletonBlock } from "../../components/Skeleton";
import type { HeaderAction } from "../../components/Header";

type TicketStatus = "open" | "in_progress" | "resolved";

interface Attachment {
  fileUrl: string;
  fileType: "image" | "video" | "raw";
  originalName?: string;
}

interface Ticket {
  _id: string;
  subject: string;
  description: string;
  attachments?: Attachment[];
  status: TicketStatus;
  createdAt: string;
  resolvedAt?: string;
}

// The three states a ticket can be in, as the backend spells them. Only an
// admin moves a ticket between them - a restaurant raises it (always "open")
// and then watches. That is why there is no control on these cards.
const STATUS_META: Record<
  TicketStatus,
  { label: string; color: string; bg: string; icon: React.ComponentType<any> }
> = {
  open: { label: "Open", color: "#d97706", bg: "#fffbeb", icon: CircleDot },
  in_progress: { label: "In progress", color: "#2563eb", bg: "#eff6ff", icon: Loader },
  resolved: { label: "Resolved", color: "#16a34a", bg: "#f0fdf4", icon: CheckCircle2 },
};

type TicketFilter = "all" | TicketStatus;

const TICKET_FILTERS: { id: TicketFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
];

// Matches uploadTicketAttachment on the server, which is configured for at
// most three files. Sending a fourth is rejected by multer, so the picker
// stops here rather than letting someone queue an upload that cannot succeed.
const MAX_ATTACHMENTS = 3;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

type SupportTicketManagerProps = {
  onHeaderActions?: (actions: HeaderAction[]) => void;
  // The raise-a-query form takes over the screen, so the section bar comes off
  // and the form's own back arrow becomes the single way out.
  onSubScreenChange?: (open: boolean) => void;
};

const SupportTicketManager = ({
  onHeaderActions,
  onSubScreenChange,
}: SupportTicketManagerProps) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketFilter>("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await getMyTickets();
      setTickets(res?.data?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load your queries" });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTickets();
  };

  const openForm = useCallback(() => {
    setSubject("");
    setDescription("");
    setAttachments([]);
    setIsFormOpen(true);
  }, []);

  const closeForm = () => setIsFormOpen(false);

  useEffect(() => {
    onSubScreenChange?.(isFormOpen);
  }, [isFormOpen, onSubScreenChange]);

  // Switching sections must not leave the dashboard believing the form is
  // still up, or the section bar would stay hidden on whatever opens next.
  useEffect(() => () => onSubScreenChange?.(false), [onSubScreenChange]);

  const handlersRef = useRef({ refresh: () => {}, raise: () => {} });
  handlersRef.current = { refresh: handleRefresh, raise: openForm };

  // Both are permanent. Raising a query is the entire point of the screen,
  // and it is needed most when the list is empty.
  useEffect(() => {
    onHeaderActions?.([
      {
        key: "refresh",
        icon: RefreshCw,
        label: "Refresh",
        onPress: () => handlersRef.current.refresh(),
      },
      {
        key: "raise-request",
        icon: Plus,
        label: "Raise request",
        showLabel: true,
        onPress: () => handlersRef.current.raise(),
      },
    ]);
  }, [onHeaderActions]);

  useEffect(() => () => onHeaderActions?.([]), [onHeaderActions]);

  const counts = useMemo(
    () => ({
      all: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
    }),
    [tickets],
  );

  const visibleTickets =
    statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

  const pickAttachment = async () => {
    if (attachments.length >= MAX_ATTACHMENTS) return;
    const result = await launchImageLibrary({
      mediaType: "mixed",
      quality: 0.8,
      selectionLimit: MAX_ATTACHMENTS - attachments.length,
    });
    if (result.didCancel || !result.assets?.length) return;
    setAttachments((prev) => [...prev, ...result.assets!].slice(0, MAX_ATTACHMENTS));
  };

  const removeAttachment = (index: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== index));

  const trimmedSubject = subject.trim();
  const trimmedDescription = description.trim();
  const canSubmit = !!trimmedSubject && !!trimmedDescription && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("subject", trimmedSubject);
      formData.append("description", trimmedDescription);
      attachments.forEach((asset, i) => {
        formData.append("attachments", {
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          name: asset.fileName || `attachment-${i + 1}.jpg`,
        } as any);
      });

      await createSupportTicket(formData);
      Toast.show({
        type: "success",
        text1: "Query raised",
        text2: "Our team will get back to you soon",
      });
      setIsFormOpen(false);
      // A new ticket is always "open", so drop any filter that would hide the
      // thing that was just created.
      setStatusFilter("all");
      fetchTickets();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Failed to raise your query",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Raise a query: full sub-screen, same shape as the menu forms -------

  if (isFormOpen) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBar} onPress={closeForm} activeOpacity={0.7}>
          <ArrowLeft size={18} color="#374151" />
          <Text style={styles.backBarText}>Raise a Query</Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.formIntro}>
            Describe what went wrong and our support team will pick it up. You can attach
            a screenshot or short clip if it helps explain the problem.
          </Text>

          <Text style={styles.label}>Subject</Text>
          <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. QR code for table 4 is not scanning"
            placeholderTextColor="#9ca3af"
            maxLength={150}
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.counter}>{description.length}/2000</Text>
          </View>
          <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What happened, and what were you trying to do?"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>Attachments</Text>
            <Text style={styles.counter}>
              {attachments.length}/{MAX_ATTACHMENTS}
            </Text>
          </View>

          {attachments.length > 0 && (
            <View style={styles.attachRow}>
              {attachments.map((asset, index) => (
                <View key={`${asset.uri}-${index}`} style={styles.attachThumbWrap}>
                  <Image source={{ uri: asset.uri }} style={styles.attachThumb} />
                  <TouchableOpacity
                    style={styles.attachRemove}
                    onPress={() => removeAttachment(index)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityLabel="Remove attachment"
                  >
                    <X size={11} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {attachments.length < MAX_ATTACHMENTS && (
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={pickAttachment}
              activeOpacity={0.8}
            >
              <Paperclip size={15} color="#ea580c" />
              <Text style={styles.attachBtnText}>
                {attachments.length ? "Add another" : "Attach a photo or video"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Disabled until there is something to send - the server rejects an
              empty subject or description anyway, so offering the button
              before then only buys a round trip and an error toast. */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit query</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ---- List ---------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.list}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.ticketCard, { gap: 10 }]}>
              <SkeletonBlock width={90} height={22} borderRadius={11} />
              <SkeletonBlock width="70%" height={15} borderRadius={6} />
              <SkeletonBlock width="90%" height={12} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Nothing raised, ever. No pills - three filters over an empty list is
  // chrome describing nothing.
  if (tickets.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconRing}>
            <View style={styles.emptyIconCircle}>
              <LifeBuoy size={30} color="#ea580c" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No queries yet</Text>
          <Text style={styles.emptySubtitle}>
            Stuck on something, or found a problem? Raise a query and our support team
            will take it from there. You can track its progress here.
          </Text>
          <TouchableOpacity style={styles.emptyCta} onPress={openForm} activeOpacity={0.85}>
            <Plus size={15} color="#ffffff" />
            <Text style={styles.emptyCtaText}>Raise query</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Shown from the first ticket onwards: even with one, the pills say what
          state it is in without opening anything. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {TICKET_FILTERS.map(({ id, label }) => {
          const isActive = statusFilter === id;
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
                <Text
                  style={[styles.filterCountText, isActive && styles.filterCountTextActive]}
                >
                  {counts[id]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.list}>
        {visibleTickets.length === 0 && (
          <View style={styles.filterEmpty}>
            <Text style={styles.filterEmptyText}>
              No{" "}
              {TICKET_FILTERS.find((f) => f.id === statusFilter)?.label.toLowerCase()}{" "}
              queries
            </Text>
            <TouchableOpacity onPress={() => setStatusFilter("all")} activeOpacity={0.75}>
              <Text style={styles.filterEmptyLink}>Show all</Text>
            </TouchableOpacity>
          </View>
        )}

        {visibleTickets.map((ticket) => {
          const meta = STATUS_META[ticket.status] || STATUS_META.open;
          const StatusIcon = meta.icon;
          const attachCount = ticket.attachments?.length || 0;

          return (
            <View key={ticket._id} style={styles.ticketCard}>
              <View style={styles.ticketTop}>
                <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                  <StatusIcon size={12} color={meta.color} />
                  <Text style={[styles.statusChipText, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
                <Text style={styles.ticketDate}>{formatDate(ticket.createdAt)}</Text>
              </View>

              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <Text style={styles.ticketDescription} numberOfLines={4}>
                {ticket.description}
              </Text>

              {attachCount > 0 && (
                <View style={styles.ticketFoot}>
                  <FileText size={12} color="#9ca3af" />
                  <Text style={styles.ticketFootText}>
                    {attachCount} attachment{attachCount === 1 ? "" : "s"}
                  </Text>
                </View>
              )}

              {ticket.status === "resolved" && ticket.resolvedAt && (
                <View style={styles.ticketFoot}>
                  <CheckCircle2 size={12} color="#16a34a" />
                  <Text style={[styles.ticketFootText, { color: "#16a34a" }]}>
                    Resolved on {formatDate(ticket.resolvedAt)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {isRefreshing && (
          <ActivityIndicator size="small" color="#ea580c" style={styles.refreshSpinner} />
        )}
      </View>
    </View>
  );
};

export default SupportTicketManager;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

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
  backBarText: { fontSize: 15, fontWeight: "800", color: "#1f2937" },

  // The bottom tab bar sits below this screen, so the submit button needs
  // room or it ends up flush against it.
  formScrollContent: { padding: 16, paddingBottom: 48 },
  formIntro: { fontSize: 13, lineHeight: 20, color: "#6b7280", marginBottom: 18 },
  label: { fontSize: 12, fontWeight: "800", color: "#374151", marginBottom: 7 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  counter: { fontSize: 11, fontWeight: "700", color: "#9ca3af", marginBottom: 7 },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  textarea: { height: 140 },

  attachRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  attachThumbWrap: { width: 72, height: 72 },
  attachThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  attachRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f8fafc",
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
  },
  attachBtnText: { fontSize: 13, fontWeight: "800", color: "#ea580c" },

  submitBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },
  submitBtnDisabled: { backgroundColor: "#fdba74" },
  submitBtnText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },

  // Unboxed and vertically centred, matching every other empty state.
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
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ea580c",
  },
  emptyCtaText: { fontSize: 14, fontWeight: "800", color: "#ffffff" },

  // A ScrollView's base style carries flexGrow 1, so without this it takes
  // every spare pixel of the column: the pills end up floating in the middle
  // of a tall empty band with the ticket list shoved to the bottom of the
  // screen. It has to sit on the ScrollView itself - putting it on the
  // content container does not constrain the scroller.
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  // alignItems keeps the pills their natural height, which the content
  // container would otherwise stretch to the full row.
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
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

  list: { padding: 16, paddingTop: 12, gap: 12, paddingBottom: 32 },
  ticketCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 14,
  },
  ticketTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusChipText: { fontSize: 11, fontWeight: "800" },
  ticketDate: { fontSize: 11, fontWeight: "700", color: "#9ca3af" },
  ticketSubject: { fontSize: 15, fontWeight: "800", color: "#111827" },
  ticketDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6b7280",
    marginTop: 5,
  },
  ticketFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  ticketFootText: { fontSize: 11, fontWeight: "700", color: "#9ca3af" },

  refreshSpinner: { marginTop: 4 },
});
