import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, Animated, Image, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiCall } from "../../../utils/api";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/42a5fe19-1fe5-4564-9dac-01b582beb5b8/images/dfca9d65e66e2aaffa03ab278c90348443b263e53ed1fdf261a03431793fa62a.png";

const DRUMROLL_EMOJIS = ["🎀","💕","✨","🌸","🎊","💖","🎉","🥁"];

// ── Realistic snare drum roll via Web Audio API ───────────────────────────────
function playDrumRollSound() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx() as AudioContext;

    // Master compressor for cohesion
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 6;
    comp.ratio.value = 4;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;
    comp.connect(ctx.destination);

    // ── Snare hit: tonal body + bandpass noise ──────────────────────────────
    const playSnare = (time: number, vel: number) => {
      const decay = 0.055 + vel * 0.03;

      // Tonal body — two detuned triangle oscillators
      [170, 285].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.45, time + decay);
        g.gain.setValueAtTime(vel * (i === 0 ? 0.55 : 0.35), time);
        g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
        osc.connect(g); g.connect(comp);
        osc.start(time); osc.stop(time + decay + 0.01);
      });

      // Snare wire buzz — bandpass-filtered white noise
      const bufLen = Math.floor(ctx.sampleRate * (decay + 0.08));
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 3200;
      bp.Q.value = 0.7;

      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1800;

      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vel * 0.9, time);
      ng.gain.exponentialRampToValueAtTime(0.0001, time + decay + 0.06);

      noise.connect(hp); hp.connect(bp); bp.connect(ng); ng.connect(comp);
      noise.start(time); noise.stop(time + decay + 0.09);

      // Crisp transient click
      const click = ctx.createOscillator();
      const cg = ctx.createGain();
      click.type = "square";
      click.frequency.value = 1200;
      cg.gain.setValueAtTime(vel * 0.2, time);
      cg.gain.exponentialRampToValueAtTime(0.0001, time + 0.012);
      click.connect(cg); cg.connect(comp);
      click.start(time); click.stop(time + 0.013);
    };

    // ── Crash cymbal at the end ─────────────────────────────────────────────
    const playCrash = (time: number) => {
      const dur = 1.4;
      const bufLen = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 5000;
      const bp = ctx.createBiquadFilter();
      bp.type = "peaking"; bp.frequency.value = 8000; bp.gain.value = 6;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.55, time);
      g.gain.setValueAtTime(0.55, time + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(comp);
      src.start(time); src.stop(time + dur + 0.05);
    };

    // ── Big bass drum at the very end ────────────────────────────────────────
    const playKick = (time: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.28);
      g.gain.setValueAtTime(0.9, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
      osc.connect(g); g.connect(comp);
      osc.start(time); osc.stop(time + 0.33);
    };

    // ── Accelerating roll: 180 ms → 32 ms over 3 s, with crescendo ──────────
    let t = ctx.currentTime + 0.08;
    let interval = 0.18;
    const minInterval = 0.032;
    const rollEnd = ctx.currentTime + 3.0;
    const startT = t;

    while (t < rollEnd) {
      const progress = Math.min((t - startT) / (rollEnd - startT), 1);
      const vel = 0.28 + progress * 0.72;          // quiet → loud
      playSnare(t, vel);
      t += interval;
      interval = Math.max(minInterval, interval * 0.878);
    }

    // Final crash + kick on the downbeat
    playCrash(t);
    playKick(t + 0.01);

  } catch (e) { /* silently ignore */ }
}

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
    // Play drum roll sound on mount
    playDrumRollSound();

    // Looping bounce for emoji
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -24, duration: 500, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();

    // Cycle emojis — speed up during roll
    let speed = 600;
    let timer: ReturnType<typeof setInterval>;
    const startCycle = (ms: number) => {
      timer = setInterval(() => {
        setEmojiIdx((i) => (i + 1) % DRUMROLL_EMOJIS.length);
        speed = Math.max(80, speed - 30);
        clearInterval(timer);
        startCycle(speed);
      }, ms);
    };
    startCycle(speed);

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
