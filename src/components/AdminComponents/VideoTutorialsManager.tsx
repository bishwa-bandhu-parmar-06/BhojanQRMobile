import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, TextInput, Modal, Switch, Image, Linking, RefreshControl } from "react-native";
import Toast from "react-native-toast-message";
import { launchImageLibrary } from "react-native-image-picker";
import {
  Video as VideoIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  ExternalLink,
  EyeOff,
  Link2,
  UploadCloud,
  FileVideo,
} from "lucide-react-native";

import { getAdminVideos, createVideo, updateVideo, deleteVideo } from "../../API/videoApi";
import CustomModal from "../CustomModal";
import BhojanQRLoader from "../BhojanQRLoader";
import SectionError from "../SectionError";

const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const initialForm = {
  title: "",
  description: "",
  sourceType: "youtube" as "youtube" | "upload",
  youtubeUrl: "",
  isActive: true,
};

const VideoTutorialsManager = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [form, setForm] = useState(initialForm);
  const [videoAsset, setVideoAsset] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadVideos = async () => {
    setLoading(true);
    try {
      setLoadError(false);
      const res = await getAdminVideos();
      setVideos(res.data?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load tutorial videos" });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setLoadError(false);
      const res = await getAdminVideos();
      setVideos(res.data?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load tutorial videos" });
      setLoadError(true);
    } finally {
      setRefreshing(false);
    }
  };

  const openAddModal = () => {
    setEditingVideo(null);
    setForm(initialForm);
    setVideoAsset(null);
    setIsModalOpen(true);
  };

  const openEditModal = (video: any) => {
    setEditingVideo(video);
    setForm({
      title: video.title,
      description: video.description || "",
      sourceType: video.sourceType || "youtube",
      youtubeUrl: video.youtubeUrl || "",
      isActive: video.isActive,
    });
    setVideoAsset(null);
    setIsModalOpen(true);
  };

  const handlePickVideo = async () => {
    const result = await launchImageLibrary({ mediaType: "video" });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        Toast.show({ type: "error", text1: "Video is too large. Max 50MB." });
        return;
      }
      setVideoAsset(asset);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Toast.show({ type: "error", text1: "Title is required" });
      return;
    }
    if (form.sourceType === "youtube") {
      if (!extractYouTubeId(form.youtubeUrl)) {
        Toast.show({ type: "error", text1: "Enter a valid YouTube URL" });
        return;
      }
    } else {
      const hasExistingFile = editingVideo?.sourceType === "upload" && editingVideo?.videoUrl;
      if (!videoAsset && !hasExistingFile) {
        Toast.show({ type: "error", text1: "Select a video file to upload" });
        return;
      }
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("sourceType", form.sourceType);
      formData.append("isActive", form.isActive ? "true" : "false");
      if (form.sourceType === "youtube") {
        formData.append("youtubeUrl", form.youtubeUrl.trim());
      } else if (videoAsset) {
        formData.append("video", {
          uri: videoAsset.uri,
          type: videoAsset.type || "video/mp4",
          name: videoAsset.fileName || "video.mp4",
        } as any);
      }

      if (editingVideo) {
        await updateVideo(editingVideo._id, formData);
        Toast.show({ type: "success", text1: "Video updated successfully!" });
      } else {
        await createVideo(formData);
        Toast.show({ type: "success", text1: "Video added successfully!" });
      }
      setIsModalOpen(false);
      loadVideos();
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to save video" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteVideo(deleteTarget._id);
      setVideos((prev) => prev.filter((v) => v._id !== deleteTarget._id));
      Toast.show({ type: "success", text1: "Video deleted successfully!" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to delete video" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getThumbnail = (video: any) => {
    if (video.sourceType === "youtube") {
      const id = extractYouTubeId(video.youtubeUrl);
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }
    return null;
  };

  if (loading) {
    return <BhojanQRLoader fullScreen={false} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Manage Tutorials</Text>
          <Text style={styles.subtitle}>Videos shown in the public Video Library.</Text>
        </View>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loadError && videos.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyStateScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ea580c"]} />}>
          <SectionError message="Failed to load tutorial videos." onRetry={loadVideos} />
        </ScrollView>
      ) : videos.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyStateScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ea580c"]} />}>
          <VideoIcon size={40} color="#ea580c" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No tutorial videos yet</Text>
        </ScrollView>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ea580c"]} />}
        >
          {videos.map((video) => {
            const thumb = getThumbnail(video);
            return (
              <View key={video._id} style={styles.videoCard}>
                <View style={styles.thumbBox}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumbImg} />
                  ) : (
                    <VideoIcon size={28} color="#9ca3af" />
                  )}
                  <View style={styles.sourceBadge}>
                    {video.sourceType === "upload" ? <FileVideo size={10} color="#fff" /> : <Link2 size={10} color="#fff" />}
                    <Text style={styles.sourceBadgeText}>{video.sourceType === "upload" ? "Uploaded" : "YouTube"}</Text>
                  </View>
                  {!video.isActive && (
                    <View style={styles.hiddenBadge}>
                      <EyeOff size={10} color="#fff" />
                      <Text style={styles.sourceBadgeText}>Hidden</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                  {video.description ? <Text style={styles.videoDesc} numberOfLines={2}>{video.description}</Text> : null}
                  <View style={styles.videoActions}>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(video.sourceType === "upload" ? video.videoUrl : video.youtubeUrl)}
                      style={styles.videoActionBtn}
                    >
                      <ExternalLink size={12} color="#6b7280" />
                      <Text style={styles.videoActionText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEditModal(video)} style={styles.videoActionBtn}>
                      <Pencil size={12} color="#ea580c" />
                      <Text style={[styles.videoActionText, { color: "#ea580c" }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDeleteTarget(video)} style={styles.videoActionBtn}>
                      <Trash2 size={12} color="#dc2626" />
                      <Text style={[styles.videoActionText, { color: "#dc2626" }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingVideo ? "Edit Video" : "Add Video"}</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. How to generate QR codes for your tables"
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="A short summary of what this video covers"
              multiline
              numberOfLines={3}
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
            />

            <Text style={styles.fieldLabel}>Video Source *</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, form.sourceType === "youtube" && styles.toggleBtnActive]}
                onPress={() => { setForm((p) => ({ ...p, sourceType: "youtube" })); setVideoAsset(null); }}
              >
                <Link2 size={13} color={form.sourceType === "youtube" ? "#fff" : "#6b7280"} />
                <Text style={[styles.toggleBtnText, form.sourceType === "youtube" && styles.toggleBtnTextActive]}>YouTube URL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, form.sourceType === "upload" && styles.toggleBtnActive]}
                onPress={() => { setForm((p) => ({ ...p, sourceType: "upload" })); setVideoAsset(null); }}
              >
                <UploadCloud size={13} color={form.sourceType === "upload" ? "#fff" : "#6b7280"} />
                <Text style={[styles.toggleBtnText, form.sourceType === "upload" && styles.toggleBtnTextActive]}>Upload Video</Text>
              </TouchableOpacity>
            </View>

            {form.sourceType === "youtube" ? (
              <TextInput
                style={styles.input}
                placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                autoCapitalize="none"
                value={form.youtubeUrl}
                onChangeText={(v) => setForm((p) => ({ ...p, youtubeUrl: v }))}
              />
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={handlePickVideo}>
                <UploadCloud size={24} color="#ea580c" />
                <Text style={styles.uploadBoxTitle}>
                  {videoAsset
                    ? videoAsset.fileName || "Video selected"
                    : editingVideo?.sourceType === "upload" && editingVideo?.videoUrl
                    ? "Tap to replace the current video"
                    : "Tap to upload"}
                </Text>
                <Text style={styles.uploadBoxSub}>MP4, WebM or MOV, max 50MB</Text>
              </TouchableOpacity>
            )}

            <View style={styles.activeRow}>
              <Text style={styles.activeLabel}>Visible in the public Video Library</Text>
              <Switch
                value={form.isActive}
                onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                trackColor={{ true: "#ea580c", false: "#e5e7eb" }}
              />
            </View>

            <TouchableOpacity style={[styles.submitBtn, isSaving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <><Save size={16} color="#fff" /><Text style={styles.submitBtnText}>{editingVideo ? "Save Changes" : "Add Video"}</Text></>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <CustomModal
        visible={!!deleteTarget}
        type="error"
        title="Delete Video?"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  container: { flex: 1, backgroundColor: "#f9fafb" },
  headerRow: { flexDirection: "row", alignItems: "flex-end", padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6b7280", fontWeight: "500", marginTop: 4 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ea580c", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, marginHorizontal: 16, backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  emptyStateScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, marginHorizontal: 16, backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#1f2937" },

  list: { padding: 16, gap: 12 },
  videoCard: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", padding: 12 },
  thumbBox: { width: 90, height: 70, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" },
  thumbImg: { width: "100%", height: "100%" },
  sourceBadge: { position: "absolute", bottom: 4, left: 4, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  hiddenBadge: { position: "absolute", top: 4, right: 4, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(30,41,59,0.85)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sourceBadgeText: { color: "#fff", fontSize: 8, fontWeight: "800", textTransform: "uppercase" },
  videoTitle: { fontSize: 13, fontWeight: "800", color: "#1f2937" },
  videoDesc: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  videoActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  videoActionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  videoActionText: { fontSize: 11, fontWeight: "700", color: "#6b7280" },

  modalContainer: { flex: 1, backgroundColor: "#f9fafb" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 50, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  modalTitle: { fontSize: 19, fontWeight: "900", color: "#1f2937" },
  modalCloseBtn: { padding: 8, backgroundColor: "#f3f4f6", borderRadius: 100 },
  modalScroll: { padding: 20, paddingBottom: 40 },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: "#6b7280", textTransform: "uppercase", marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: 15, backgroundColor: "#f9fafb", color: "#1f2937" },
  textArea: { height: 90, paddingTop: 12, textAlignVertical: "top" },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: "#f3f4f6" },
  toggleBtnActive: { backgroundColor: "#ea580c" },
  toggleBtnText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  toggleBtnTextActive: { color: "#fff" },
  uploadBox: { borderWidth: 2, borderColor: "#e5e7eb", borderStyle: "dashed", borderRadius: 16, alignItems: "center", justifyContent: "center", paddingVertical: 28, backgroundColor: "#fff" },
  uploadBoxTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginTop: 8 },
  uploadBoxSub: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  activeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 16, marginTop: 20 },
  activeLabel: { fontSize: 13, fontWeight: "700", color: "#1f2937", flex: 1, paddingRight: 12 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 56, borderRadius: 16, backgroundColor: "#ea580c", marginTop: 24 },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

export default VideoTutorialsManager;
