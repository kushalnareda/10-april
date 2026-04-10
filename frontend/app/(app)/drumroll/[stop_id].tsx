import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, Animated, Image, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiCall } from "../../../utils/api";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/42a5fe19-1fe5-4564-9dac-01b582beb5b8/images/dfca9d65e66e2aaffa03ab278c90348443b263e53ed1fdf261a03431793fa62a.png";

const DRUMROLL_EMOJIS = ["🎀","💕","✨","🌸","🎊","💖","🎉","🥁"];

export default function DrumrollScreen() {
  const router = useRouter();
  const { stop_id, session_id } = useLocalSearchParams<{ stop_id: string; session_id: string }>();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [emojiIdx, setEmojiIdx] = useState(0);

  // Bounce animation
  const bounce = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Looping bounce for emoji
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -24, duration: 500, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();

    // Cycle emojis
    const timer = setInterval(() => setEmojiIdx((i) => (i + 1) % DRUMROLL_EMOJIS.length), 600);

    return () => { loop.stop(); clearInterval(timer); };
  }, []);

  const triggerShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleUnlock = async () => {
    if (!password.trim()) {
      setError("Enter the password to unlock! 🔑");
      triggerShake();
      return;
    }
    setUnlocking(true);
    setError("");
    try {
      await apiCall(`/stops/${stop_id}/unlock`, {
        method: "POST",
        body: JSON.stringify({ password: password.trim() }),
      });
      router.replace(`/stop/${stop_id}?session_id=${session_id}`);
    } catch (e: any) {
      const msg = e.message || "Wrong password";
      setError(msg.includes("Wrong") ? "Wrong password 🙈 Try again!" : msg);
      setPassword("");
      triggerShake();
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Image source={{ uri: BG_URL }} style={styles.bgImage} />
        <View style={styles.overlay} />

        <SafeAreaView style={styles.safe}>
          <TouchableOpacity
            testID="drumroll-back-btn"
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.content}>
            {/* Animated emoji */}
            <Animated.View style={{ transform: [{ translateY: bounce }] }}>
              <Text style={styles.drumrollEmoji}>{DRUMROLL_EMOJIS[emojiIdx]}</Text>
            </Animated.View>

            <Text style={styles.nextStop}>NEXT STOP</Text>
            <Text style={styles.mystery}>???</Text>
            <Text style={styles.hint}>Ask for the secret password 🤫</Text>

            {/* Password input */}
            <Animated.View
              style={[styles.inputContainer, { transform: [{ translateX: shake }] }]}
            >
              <TextInput
                testID="password-input"
                style={[styles.input, error ? styles.inputError : null]}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(""); }}
                placeholder="Enter password..."
                placeholderTextColor="rgba(106,93,123,0.5)"
                autoCapitalize="none"
                onSubmitEditing={handleUnlock}
                returnKeyType="go"
              />
              <TouchableOpacity
                testID="unlock-btn"
                style={[styles.unlockBtn, unlocking && { opacity: 0.7 }]}
                onPress={handleUnlock}
                disabled={unlocking}
              >
                <Text style={styles.unlockBtnText}>{unlocking ? "..." : "→"}</Text>
              </TouchableOpacity>
            </Animated.View>

            {error ? (
              <Text testID="password-error" style={styles.errorText}>{error}</Text>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,240,245,0.7)" },
  safe: { flex: 1 },
  backBtn: { padding: 16, paddingTop: 16 },
  backText: { color: "#FF1493", fontSize: 16, fontWeight: "600" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  drumrollEmoji: { fontSize: 80, marginBottom: 24 },
  nextStop: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF1493",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  mystery: {
    fontSize: 48,
    fontWeight: "700",
    color: "#1A1423",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    marginBottom: 8,
  },
  hint: { fontSize: 16, color: "#6A5D7B", marginBottom: 40, textAlign: "center" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: "#1A1423",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputError: { color: "#FF1493" },
  unlockBtn: {
    backgroundColor: "#FF1493",
    borderRadius: 16,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockBtnText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  errorText: { color: "#FF1493", fontSize: 15, marginTop: 16, fontWeight: "500" },
});
