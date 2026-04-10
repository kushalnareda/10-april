import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Image, Animated, Dimensions, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/42a5fe19-1fe5-4564-9dac-01b582beb5b8/images/dfca9d65e66e2aaffa03ab278c90348443b263e53ed1fdf261a03431793fa62a.png";

const { width, height } = Dimensions.get("window");

// Simple confetti items
const CONFETTI = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  emoji: ["💕", "✨", "🌸", "🎊", "💖", "🎉", "⭐"][i % 7],
  left: Math.random() * width,
  delay: Math.random() * 1000,
  duration: 2000 + Math.random() * 1500,
}));

function ConfettiPiece({ item }: { item: typeof CONFETTI[0] }) {
  const y = useRef(new Animated.Value(-50)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(item.delay),
      Animated.parallel([
        Animated.timing(y, { toValue: height, duration: item.duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(item.duration * 0.7),
          Animated.timing(opacity, { toValue: 0, duration: item.duration * 0.3, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: item.left,
        fontSize: 20,
        transform: [{ translateY: y }],
        opacity,
      }}
    >
      {item.emoji}
    </Animated.Text>
  );
}

export default function FinaleScreen() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Image source={{ uri: BG_URL }} style={styles.bgImage} />
      <View style={styles.overlay} />

      {/* Confetti */}
      {CONFETTI.map((item) => <ConfettiPiece key={item.id} item={item} />)}

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Text style={styles.bigEmoji}>🎉</Text>
          </Animated.View>

          <Text style={styles.title}>What a day!</Text>
          <Text style={styles.subtitle}>
            You made it through all the stops.{"\n"}
            What a beautiful adventure 💕
          </Text>

          <TouchableOpacity
            testID="view-storybook-btn"
            style={styles.primaryBtn}
            onPress={() => router.replace(`/storybook/${session_id}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>📖 Read our Storybook</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="back-to-stages-btn"
            style={styles.secondaryBtn}
            onPress={() => router.replace(`/stages/${session_id}`)}
          >
            <Text style={styles.secondaryBtnText}>← Back to stages</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,240,245,0.75)" },
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  bigEmoji: { fontSize: 96, marginBottom: 24 },
  title: {
    fontSize: 40,
    fontWeight: "700",
    color: "#1A1423",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: "#6A5D7B",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 48,
  },
  primaryBtn: {
    backgroundColor: "#FF1493",
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 48,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  secondaryBtn: {
    paddingVertical: 14,
  },
  secondaryBtnText: { color: "#6A5D7B", fontSize: 16 },
});
