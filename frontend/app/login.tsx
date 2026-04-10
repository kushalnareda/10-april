import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { apiCall } from "../utils/api";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/42a5fe19-1fe5-4564-9dac-01b582beb5b8/images/dfca9d65e66e2aaffa03ab278c90348443b263e53ed1fdf261a03431793fa62a.png";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      await login(res.session_token, res.user);
      router.replace("/planner");
    } catch (e: any) {
      setError(e.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
        <Text style={styles.emoji}>💕</Text>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Enter your details to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#B09CC0"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Your email"
          placeholderTextColor="#B09CC0"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          testID="login-btn"
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Let's go ✨</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>Your memories are safe and private 💕</Text>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 32,
  },
  input: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#1A1423",
    borderWidth: 1.5,
    borderColor: "rgba(255,20,147,0.2)",
    marginBottom: 14,
  },
  error: {
    color: "#FF1493",
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#FF1493",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 8,
    marginBottom: 24,
    minWidth: 200,
    alignItems: "center",
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
  disclaimer: { fontSize: 13, color: "#9E8FAB", textAlign: "center" },
});
