import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/42a5fe19-1fe5-4564-9dac-01b582beb5b8/images/dfca9d65e66e2aaffa03ab278c90348443b263e53ed1fdf261a03431793fa62a.png";

export default function IndexScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/planner");
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: BG_URL }} style={styles.bgImage} />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={styles.emoji}>💕</Text>
        <Text style={styles.title}>Taara & Cookie's{"\n"}Day Out</Text>
        <Text style={styles.subtitle}>A little surprise, one stop at a time ✨</Text>
        <TouchableOpacity
          testID="get-started-btn"
          style={styles.btn}
          onPress={() => router.push("/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Let's go ✨</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: {
    fontSize: 38,
    fontWeight: "700",
    color: "#1A1423",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    lineHeight: 48,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6A5D7B",
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 24,
  },
  btn: {
    backgroundColor: "#FF1493",
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 48,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F5" },
  loadingText: { marginTop: 12, color: "#6A5D7B", fontSize: 16 },
});
