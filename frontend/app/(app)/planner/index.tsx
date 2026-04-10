import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { apiCall } from "../../../utils/api";

interface Session {
  session_id: string;
  title: string;
  date: string;
  total_stops: number;
  done_stops: number;
}

export default function PlannerScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiCall("/sessions");
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const onRefresh = () => { setRefreshing(true); fetchSessions(); };

  const renderSession = ({ item }: { item: Session }) => {
    const progress = item.total_stops > 0 ? item.done_stops / item.total_stops : 0;
    const allDone = item.done_stops === item.total_stops && item.total_stops > 0;
    return (
      <TouchableOpacity
        testID={`session-card-${item.session_id}`}
        style={styles.sessionCard}
        onPress={() => router.push(`/stages/${item.session_id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <Text style={styles.sessionTitle}>{item.title}</Text>
          <Text style={styles.sessionDate}>{item.date}</Text>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {allDone ? "✨ All done!" : `${item.done_stops}/${item.total_stops} stops`}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
        </View>
        {allDone && (
          <TouchableOpacity
            testID={`storybook-btn-${item.session_id}`}
            style={styles.storybookBtn}
            onPress={() => router.push(`/storybook/${item.session_id}`)}
          >
            <Text style={styles.storybookBtnText}>📖 Read storybook</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey {user?.name?.split(" ")[0] || "there"} 💕</Text>
          <Text style={styles.headerTitle}>Your Dates</Text>
        </View>
        <TouchableOpacity testID="logout-btn" onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF1493" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(i) => i.session_id}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1493" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌸</Text>
              <Text style={styles.emptyTitle}>No dates yet</Text>
              <Text style={styles.emptySubtitle}>Plan your first surprise date below!</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        testID="create-date-btn"
        style={styles.fab}
        onPress={() => router.push("/planner/create")}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Plan a Date</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF0F5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,20,147,0.08)",
  },
  greeting: { fontSize: 14, color: "#FF1493", fontWeight: "600" },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#1A1423" },
  logoutBtn: { padding: 8 },
  logoutText: { color: "#9E8FAB", fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255,20,147,0.08)",
  },
  cardTop: { marginBottom: 12 },
  sessionTitle: { fontSize: 20, fontWeight: "700", color: "#1A1423", marginBottom: 4 },
  sessionDate: { fontSize: 14, color: "#6A5D7B" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  progressText: { fontSize: 13, color: "#FF1493", fontWeight: "600", minWidth: 80 },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#FFB6C1",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#FF1493", borderRadius: 4 },
  storybookBtn: {
    marginTop: 12,
    backgroundColor: "#FFF0F5",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,20,147,0.2)",
  },
  storybookBtnText: { color: "#FF1493", fontWeight: "600", fontSize: 15 },
  fab: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    backgroundColor: "#FF1493",
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 40,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: "#1A1423", marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: "#6A5D7B", textAlign: "center" },
});
