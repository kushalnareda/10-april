import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/42a5fe19-1fe5-4564-9dac-01b582beb5b8/images/dfca9d65e66e2aaffa03ab278c90348443b263e53ed1fdf261a03431793fa62a.png";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export default function LoginScreen() {
  const router = useRouter();

  const handleGoogleSignIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const redirectUrl = window.location.origin + "/";
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    }
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: BG_URL }} style={styles.bgImage} />
      <View style={styles.overlay} />

      <TouchableOpacity
        testID="back-btn"
        style={styles.backBtn}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue your adventure</Text>

        <TouchableOpacity
          testID="google-signin-btn"
          style={styles.googleBtn}
          onPress={handleGoogleSignIn}
          activeOpacity={0.85}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Your memories are safe and private 💕
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.5)" },
  backBtn: { position: "absolute", top: 56, left: 24, zIndex: 10, padding: 8 },
  backText: { color: "#FF1493", fontSize: 16, fontWeight: "600" },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 56, marginBottom: 20 },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1A1423",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6A5D7B",
    textAlign: "center",
    marginBottom: 40,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255,20,147,0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
    minWidth: 280,
    justifyContent: "center",
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4285F4",
    marginRight: 12,
  },
  googleBtnText: { fontSize: 17, fontWeight: "600", color: "#1A1423" },
  disclaimer: { fontSize: 13, color: "#9E8FAB", textAlign: "center" },
});
