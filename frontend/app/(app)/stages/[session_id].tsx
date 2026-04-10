import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiCall } from "../../../utils/api";

interface Stop {
  stop_id: string;
  name: string;
  location: string;
  emoji: string;
  order: number;
  unlocked: boolean;
  done: boolean;
  rating: number | null;
}

interface Session {
  session_id: string;
  title: string;
  date: string;
}

type StopStatus = "done" | "current" | "locked";

function getStopStatus(stop: Stop, stops: Stop[]): StopStatus {
  if (stop.done) return "done";
  const prevDone = stop.order === 1 || stops.find((s) => s.order === stop.order - 1)?.done;
  if (prevDone) return "current";
  return "locked";
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <Text style={{ fontSize: 12, marginTop: 2 }}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </Text>
  );
}

export default function StagesScreen() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const data = await apiCall(`/sessions/${session_id}`);
      setSession(data.session);
      setStops(data.stops);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session_id]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const onRefresh = () => { setRefreshing(true); fetchSession(); };

  const doneCount = stops.filter((s) => s.done).length;
  const allDone = doneCount === stops.length && stops.length > 0;

  const handleStopTap = (stop: Stop) => {
    const status = getStopStatus(stop, stops);
    if (status === "locked") return;
    if (status === "done" || stop.unlocked) {
      router.push(`/stop/${stop.stop_id}?session_id=${session_id}`);
    } else {
      router.push(`/drumroll/${stop.stop_id}?session_id=${session_id}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/planner")} style={{ padding: 8 }}>
          <Text style={styles.back}>← Dates</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🍪 {session?.title || "Loading..."}</Text>
          <Text style={styles.progressLabel}>{doneCount}/{stops.length} done</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#FF1493" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1493" />}
        >
          <Text style={styles.subtitle}>Today's adventure 🗺️</Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${stops.length > 0 ? (doneCount / stops.length) * 100 : 0}%` as any }]} />
            </View>
          </View>

          {/* Stops */}
          {stops.map((stop) => {
            const status = getStopStatus(stop, stops);
            return (
              <TouchableOpacity
                key={stop.stop_id}
                testID={`stop-item-${stop.stop_id}`}
                style={[
                  styles.stopRow,
                  status === "locked" && styles.stopLocked,
                  status === "done" && styles.stopDone,
                  status === "current" && styles.stopCurrent,
                ]}
                onPress={() => handleStopTap(stop)}
                disabled={status === "locked"}
                activeOpacity={status === "locked" ? 1 : 0.8}
              >
                <View style={[styles.emojiBox, status === "done" && styles.emojiDone]}>
                  <Text style={styles.emojiText}>
                    {status === "done" ? "✓" : status === "locked" ? "🔒" : stop.emoji}
                  </Text>
                </View>
                <View style={styles.stopInfo}>
                  <Text style={[styles.stopName, status === "locked" && styles.lockedText]}>
                    {stop.name}
                  </Text>
                  {stop.location ? (
                    <Text style={styles.stopLocation}>📍 {stop.location}</Text>
                  ) : null}
                  <StarDisplay rating={stop.rating} />
                </View>
                <View style={styles.stopStatus}>
                  {status === "current" && (
                    <View style={styles.tapBadge}>
                      <Text style={styles.tapText}>tap ✨</Text>
                    </View>
                  )}
                  {status === "done" && <Text style={styles.doneText}>done!</Text>}
                  {status === "locked" && <Text style={styles.lockedBadge}>locked</Text>}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Storybook CTA */}
          {allDone && (
            <TouchableOpacity
              testID="view-storybook-btn"
              style={styles.storybookBtn}
              onPress={() => router.push(`/storybook/${session_id}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.storybookBtnText}>📖 Read our Storybook</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
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
  back: { color: "#FF1493", fontSize: 14, fontWeight: "600" },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1A1423" },
  progressLabel: { fontSize: 12, color: "#FF1493", fontWeight: "600" },
  scroll: { padding: 20, paddingBottom: 48 },
  subtitle: { fontSize: 18, fontWeight: "600", color: "#6A5D7B", marginBottom: 16 },
  progressContainer: { marginBottom: 24 },
  progressBar: {
    height: 8, backgroundColor: "#FFB6C1",
    borderRadius: 4, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#FF1493", borderRadius: 4 },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stopLocked: { opacity: 0.6 },
  stopDone: { borderLeftWidth: 3, borderLeftColor: "#FF1493" },
  stopCurrent: {
    borderWidth: 2,
    borderColor: "#FF1493",
    shadowColor: "#FF1493",
    shadowOpacity: 0.2,
  },
  emojiBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "#FFF0F5",
    alignItems: "center", justifyContent: "center",
    marginRight: 14,
  },
  emojiDone: { backgroundColor: "#FF1493" },
  emojiText: { fontSize: 22 },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 16, fontWeight: "600", color: "#1A1423" },
  lockedText: { color: "#9E8FAB" },
  stopLocation: { fontSize: 13, color: "#6A5D7B", marginTop: 2 },
  stopStatus: { alignItems: "flex-end" },
  tapBadge: {
    backgroundColor: "#FF1493", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tapText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  doneText: { color: "#FF1493", fontSize: 13, fontWeight: "600" },
  lockedBadge: { color: "#9E8FAB", fontSize: 13 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  storybookBtn: {
    marginTop: 16,
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
  storybookBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
