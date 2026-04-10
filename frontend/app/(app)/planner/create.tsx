import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { apiCall } from "../../../utils/api";

const EMOJIS = ["📍","🍜","🍕","☕","🎬","🎮","🛍️","🌸","🎨","🎡","🎭","🌃","🎶","🍣","🎂","🌹","💆","🏖️","🚇","🎠"];

interface StopForm {
  name: string;
  location: string;
  description: string;
  password: string;
  emoji: string;
}

function EmojiPicker({ selected, onSelect }: { selected: string; onSelect: (e: string) => void }) {
  return (
    <View style={ep.grid}>
      {EMOJIS.map((e) => (
        <TouchableOpacity
          key={e}
          style={[ep.item, selected === e && ep.selected]}
          onPress={() => onSelect(e)}
        >
          <Text style={ep.emoji}>{e}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ep = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  item: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F5" },
  selected: { backgroundColor: "#FF1493" },
  emoji: { fontSize: 24 },
});

export default function CreateSessionScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("Taara & Cookie's Day Out");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [stops, setStops] = useState<StopForm[]>([
    { name: "", location: "", description: "", password: "", emoji: "📍" },
  ]);
  const [saving, setSaving] = useState(false);

  const addStop = () => {
    if (stops.length >= 10) return;
    setStops([...stops, { name: "", location: "", description: "", password: "", emoji: "📍" }]);
  };

  const updateStop = (idx: number, field: keyof StopForm, val: string) => {
    const updated = [...stops];
    updated[idx] = { ...updated[idx], [field]: val };
    setStops(updated);
  };

  const removeStop = (idx: number) => {
    if (stops.length === 1) return;
    setStops(stops.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Oops", "Give your date a name!");
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      if (!s.name.trim() || !s.password.trim()) {
        return Alert.alert("Oops", `Stop ${i + 1} needs a name and password`);
      }
    }
    setSaving(true);
    try {
      const body = {
        title,
        date,
        stops: stops.map((s, i) => ({ ...s, order: i + 1 })),
      };
      const res = await apiCall("/sessions", { method: "POST", body: JSON.stringify(body) });
      router.replace(`/stages/${res.session_id}`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={{ padding: 8 }}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan the Date 💕</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Session info */}
          <View style={styles.section}>
            <Text style={styles.label}>Date Name</Text>
            <TextInput
              testID="session-title-input"
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Taara & Cookie's Day Out"
              placeholderTextColor="#C4B5D0"
            />
            <Text style={[styles.label, { marginTop: 16 }]}>Date</Text>
            <TextInput
              testID="session-date-input"
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#C4B5D0"
            />
          </View>

          {/* Stops */}
          <Text style={styles.sectionTitle}>Stops ({stops.length}/10)</Text>
          {stops.map((stop, idx) => (
            <View key={idx} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={styles.stopBadge}>
                  <Text style={styles.stopBadgeText}>{idx + 1}</Text>
                </View>
                <Text style={styles.stopTitle}>Stop {idx + 1}</Text>
                {stops.length > 1 && (
                  <TouchableOpacity onPress={() => removeStop(idx)} style={styles.removeBtn}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.label}>Emoji</Text>
              <EmojiPicker selected={stop.emoji} onSelect={(e) => updateStop(idx, "emoji", e)} />

              <Text style={styles.label}>Stop Name *</Text>
              <TextInput
                testID={`stop-name-${idx}`}
                style={styles.input}
                value={stop.name}
                onChangeText={(v) => updateStop(idx, "name", v)}
                placeholder="e.g. Game time"
                placeholderTextColor="#C4B5D0"
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                testID={`stop-location-${idx}`}
                style={styles.input}
                value={stop.location}
                onChangeText={(v) => updateStop(idx, "location", v)}
                placeholder="e.g. Cyber Cafe, Hauz Khas"
                placeholderTextColor="#C4B5D0"
              />

              <Text style={styles.label}>Description (shown after unlock)</Text>
              <TextInput
                testID={`stop-desc-${idx}`}
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                value={stop.description}
                onChangeText={(v) => updateStop(idx, "description", v)}
                placeholder="What's the surprise? 🎉"
                placeholderTextColor="#C4B5D0"
                multiline
              />

              <Text style={styles.label}>Password (case-insensitive) *</Text>
              <TextInput
                testID={`stop-password-${idx}`}
                style={styles.input}
                value={stop.password}
                onChangeText={(v) => updateStop(idx, "password", v)}
                placeholder="e.g. tekken"
                placeholderTextColor="#C4B5D0"
                secureTextEntry={false}
              />
            </View>
          ))}

          {stops.length < 10 && (
            <TouchableOpacity testID="add-stop-btn" style={styles.addBtn} onPress={addStop}>
              <Text style={styles.addBtnText}>+ Add Another Stop</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            testID="save-session-btn"
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save & Start the Date 🎉</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF0F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,20,147,0.08)",
  },
  back: { color: "#FF1493", fontSize: 16, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A1423" },
  scroll: { padding: 16, paddingBottom: 48 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1A1423", marginBottom: 12 },
  stopCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stopHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  stopBadge: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#FF1493",
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  stopBadgeText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  stopTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1A1423" },
  removeBtn: { padding: 8 },
  removeText: { color: "#9E8FAB", fontSize: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#6A5D7B", marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: "rgba(255,20,147,0.15)",
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    color: "#1A1423",
    backgroundColor: "#FAFAFA",
  },
  addBtn: {
    borderWidth: 1.5,
    borderColor: "rgba(255,20,147,0.3)",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
    borderStyle: "dashed",
  },
  addBtnText: { color: "#FF1493", fontWeight: "600", fontSize: 16 },
  saveBtn: {
    backgroundColor: "#FF1493",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
