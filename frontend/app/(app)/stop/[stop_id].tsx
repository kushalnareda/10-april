import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Image, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { apiCall, photoUrl } from "../../../utils/api";

interface Detour {
  detour_id?: string;
  place: string;
  what: string;
  photo_ids: string[];
  rating: number | null;
  comment: string;
}

interface Stop {
  stop_id: string;
  session_id: string;
  name: string;
  location: string;
  description: string;
  emoji: string;
  order: number;
  done: boolean;
  rating: number | null;
  comment: string | null;
  photo_ids: string[];
  detour: Detour | null;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} testID={`star-${star}`} onPress={() => onChange(star)}>
          <Text style={{ fontSize: 32, color: star <= value ? "#FF1493" : "#FFB6C1" }}>
            {star <= value ? "★" : "☆"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function StopDetailScreen() {
  const router = useRouter();
  const { stop_id, session_id } = useLocalSearchParams<{ stop_id: string; session_id: string }>();

  const [stop, setStop] = useState<Stop | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detour state
  const [showDetour, setShowDetour] = useState(false);
  const [detourPlace, setDetourPlace] = useState("");
  const [detourWhat, setDetourWhat] = useState("");
  const [detourRating, setDetourRating] = useState(0);
  const [detourComment, setDetourComment] = useState("");
  const [detourPhotoIds, setDetourPhotoIds] = useState<string[]>([]);
  const [detourSaved, setDetourSaved] = useState(false);
  const [detourSaving, setDetourSaving] = useState(false);

  const fetchStop = useCallback(async () => {
    try {
      const data = await apiCall(`/sessions/${session_id}`);
      const s = data.stops.find((x: Stop) => x.stop_id === stop_id);
      if (s) {
        setStop(s);
        setRating(s.rating || 0);
        setComment(s.comment || "");
        setPhotoIds(s.photo_ids || []);
        if (s.detour) {
          setDetourPlace(s.detour.place || "");
          setDetourWhat(s.detour.what || "");
          setDetourRating(s.detour.rating || 0);
          setDetourComment(s.detour.comment || "");
          setDetourPhotoIds(s.detour.photo_ids || []);
          setDetourSaved(true);
        }
      }
    } catch (e) { console.error(e); }
  }, [stop_id, session_id]);

  useEffect(() => { fetchStop(); }, [fetchStop]);

  const pickPhoto = async (isDetour = false) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access in settings");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.length) return;
    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      let base64: string;
      if (Platform.OS === "web") {
        // On web, uri is a data URL
        base64 = uri.includes(",") ? uri.split(",")[1] : uri;
      } else {
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      const res = await apiCall("/photos/upload", {
        method: "POST",
        body: JSON.stringify({ data: base64, stop_id, type: isDetour ? "detour" : "stop" }),
      });
      if (isDetour) {
        setDetourPhotoIds((prev) => [...prev, res.photo_id]);
      } else {
        setPhotoIds((prev) => [...prev, res.photo_id]);
        await apiCall(`/stops/${stop_id}`, {
          method: "PATCH",
          body: JSON.stringify({ photo_ids: [...photoIds, res.photo_id] }),
        });
      }
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (pid: string) => {
    const newIds = photoIds.filter((id) => id !== pid);
    setPhotoIds(newIds);
    await apiCall(`/stops/${stop_id}`, {
      method: "PATCH",
      body: JSON.stringify({ photo_ids: newIds }),
    });
    await apiCall(`/photos/${pid}`, { method: "DELETE" }).catch(() => {});
  };

  const saveDetour = async () => {
    if (!detourPlace.trim()) {
      Alert.alert("Required", "Please enter a place name 📍");
      return;
    }
    setDetourSaving(true);
    try {
      await apiCall(`/stops/${stop_id}/detour`, {
        method: "POST",
        body: JSON.stringify({
          place: detourPlace,
          what: detourWhat,
          photo_ids: detourPhotoIds,
          rating: detourRating || null,
          comment: detourComment,
        }),
      });
      setDetourSaved(true);
      setShowDetour(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setDetourSaving(false);
    }
  };

  const handleMarkDone = async () => {
    setSaving(true);
    try {
      await apiCall(`/stops/${stop_id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: true, rating: rating || null, comment }),
      });
      // Check if last stop
      const data = await apiCall(`/sessions/${session_id}`);
      const allDone = data.stops.every((s: Stop) => s.done);
      if (allDone) {
        router.replace(`/finale/${session_id}`);
      } else {
        router.replace(`/stages/${session_id}`);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
      setSaving(false);
    }
  };

  if (!stop) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity testID="stop-back-btn" onPress={() => router.back()} style={{ padding: 8 }}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{stop.name}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Stop hero */}
          <View style={styles.hero}>
            <Text style={styles.stopEmoji}>{stop.emoji}</Text>
            <Text style={styles.stopName}>{stop.name}</Text>
            {stop.location ? <Text style={styles.location}>📍 {stop.location}</Text> : null}
            {stop.description ? (
              <Text style={styles.description}>{stop.description}</Text>
            ) : null}
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Photos</Text>
            <View style={styles.photosGrid}>
              {photoIds.map((pid) => (
                <View key={pid} style={styles.photoWrapper}>
                  <Image
                    testID={`photo-${pid}`}
                    source={{ uri: photoUrl(pid) }}
                    style={styles.photo}
                  />
                  <TouchableOpacity
                    style={styles.photoDelete}
                    onPress={() => removePhoto(pid)}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                testID="add-photo-btn"
                style={styles.addPhotoBtn}
                onPress={() => pickPhoto(false)}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FF1493" />
                ) : (
                  <Text style={styles.addPhotoBtnText}>+</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Rate this stop</Text>
            <StarRating value={rating} onChange={setRating} />
          </View>

          {/* Comment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Your thoughts</Text>
            <TextInput
              testID="comment-input"
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="How was it? What made it special? 💕"
              placeholderTextColor="#C4B5D0"
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          {/* Detour */}
          <TouchableOpacity
            testID="detour-btn"
            style={[styles.detourBtn, detourSaved && styles.detourBtnSaved]}
            onPress={() => setShowDetour(true)}
          >
            <Text style={styles.detourBtnText}>
              {detourSaved ? `🧭 Detour: ${detourPlace}` : "🧭 Took a detour?"}
            </Text>
          </TouchableOpacity>

          {/* Mark done */}
          <TouchableOpacity
            testID="mark-done-btn"
            style={[styles.doneBtn, saving && { opacity: 0.7 }]}
            onPress={handleMarkDone}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.doneBtnText}>Mark as done ✓</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Detour Modal */}
      <Modal
        visible={showDetour}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetour(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%" }}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🧭 Our Detour</Text>
                <TouchableOpacity onPress={() => setShowDetour(false)}>
                  <Text style={{ color: "#9E8FAB", fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalLabel}>Where did you go? *</Text>
                <TextInput
                  testID="detour-place-input"
                  style={styles.modalInput}
                  value={detourPlace}
                  onChangeText={setDetourPlace}
                  placeholder="e.g. Hauz Khas Village"
                  placeholderTextColor="#C4B5D0"
                />

                <Text style={styles.modalLabel}>What did you do?</Text>
                <TextInput
                  testID="detour-what-input"
                  style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
                  value={detourWhat}
                  onChangeText={setDetourWhat}
                  placeholder="Describe the detour..."
                  placeholderTextColor="#C4B5D0"
                  multiline
                />

                <Text style={styles.modalLabel}>📸 Photos</Text>
                <View style={styles.photosGrid}>
                  {detourPhotoIds.map((pid) => (
                    <Image key={pid} source={{ uri: photoUrl(pid) }} style={styles.photo} />
                  ))}
                  <TouchableOpacity
                    testID="detour-add-photo-btn"
                    style={styles.addPhotoBtn}
                    onPress={() => pickPhoto(true)}
                    disabled={uploading}
                  >
                    <Text style={styles.addPhotoBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Rate it</Text>
                <StarRating value={detourRating} onChange={setDetourRating} />

                <Text style={[styles.modalLabel, { marginTop: 12 }]}>Comment</Text>
                <TextInput
                  testID="detour-comment-input"
                  style={styles.modalInput}
                  value={detourComment}
                  onChangeText={setDetourComment}
                  placeholder="Any thoughts?"
                  placeholderTextColor="#C4B5D0"
                />

                <TouchableOpacity
                  testID="save-detour-btn"
                  style={[styles.doneBtn, { marginTop: 20 }, detourSaving && { opacity: 0.7 }]}
                  onPress={saveDetour}
                  disabled={detourSaving}
                >
                  {detourSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.doneBtnText}>Save detour ✓</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF0F5" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F5" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "rgba(255,20,147,0.08)",
  },
  backText: { color: "#FF1493", fontSize: 16, fontWeight: "600" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#1A1423" },
  scroll: { padding: 20, paddingBottom: 48 },
  hero: {
    alignItems: "center", backgroundColor: "#fff", borderRadius: 24, padding: 24,
    marginBottom: 16, shadowColor: "#FF1493", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  stopEmoji: { fontSize: 56, marginBottom: 12 },
  stopName: { fontSize: 26, fontWeight: "700", color: "#1A1423", fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", textAlign: "center" },
  location: { fontSize: 15, color: "#6A5D7B", marginTop: 6 },
  description: { fontSize: 15, color: "#6A5D7B", marginTop: 12, textAlign: "center", lineHeight: 22 },
  section: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1423", marginBottom: 16 },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoWrapper: { position: "relative" },
  photo: { width: 80, height: 80, borderRadius: 12, backgroundColor: "#FFF0F5" },
  photoDelete: {
    position: "absolute", top: -6, right: -6, backgroundColor: "#FF1493",
    borderRadius: 12, width: 22, height: 22, alignItems: "center", justifyContent: "center",
  },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 12, backgroundColor: "#FFF0F5",
    borderWidth: 1.5, borderColor: "rgba(255,20,147,0.25)", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  addPhotoBtnText: { fontSize: 28, color: "#FF1493", fontWeight: "300" },
  commentInput: {
    borderWidth: 1.5, borderColor: "rgba(255,20,147,0.15)", borderRadius: 16,
    padding: 14, fontSize: 15, color: "#1A1423", minHeight: 100,
    textAlignVertical: "top", backgroundColor: "#FAFAFA",
  },
  charCount: { fontSize: 12, color: "#9E8FAB", textAlign: "right", marginTop: 4 },
  detourBtn: {
    borderWidth: 1.5, borderColor: "rgba(255,20,147,0.3)", borderRadius: 20,
    paddingVertical: 16, alignItems: "center", marginBottom: 16, backgroundColor: "#FFF0F5",
  },
  detourBtnSaved: { backgroundColor: "#fff", borderColor: "#FF1493" },
  detourBtnText: { color: "#FF1493", fontWeight: "600", fontSize: 16 },
  doneBtn: {
    backgroundColor: "#FF1493", borderRadius: 30, paddingVertical: 18, alignItems: "center",
    shadowColor: "#FF1493", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  doneBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", alignItems: "center",
  },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: 40, width: "100%", maxHeight: "90%",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 15,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: "#E0D0E8", borderRadius: 2,
    alignSelf: "center", marginBottom: 16,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1A1423" },
  modalLabel: { fontSize: 13, fontWeight: "600", color: "#6A5D7B", marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1.5, borderColor: "rgba(255,20,147,0.15)", borderRadius: 16,
    padding: 14, fontSize: 15, color: "#1A1423", backgroundColor: "#FAFAFA",
  },
});
