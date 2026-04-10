import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Image, ActivityIndicator, Alert, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { apiCall, photoUrl } from "../../../utils/api";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

interface Detour {
  detour_id?: string;
  place: string;
  what?: string;
  photo_ids: string[];
  rating?: number | null;
  comment?: string;
}

interface Stop {
  stop_id: string;
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

interface Session {
  session_id: string;
  title: string;
  date: string;
}

function Stars({ n }: { n: number | null }) {
  if (!n) return null;
  return (
    <Text style={styles.stars}>
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </Text>
  );
}

function StopCard({ stop, index }: { stop: Stop; index: number }) {
  return (
    <View style={styles.stopCard}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.stopBadge}>
          <Text style={styles.stopBadgeNum}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.stopEmoji}>{stop.emoji}</Text>
            <Text style={styles.stopName}>{stop.name}</Text>
          </View>
          {stop.location ? (
            <Text style={styles.stopLocation}>📍 {stop.location}</Text>
          ) : null}
        </View>
      </View>

      {/* Photos grid */}
      {stop.photo_ids.length > 0 && (
        <View style={styles.photosRow}>
          {stop.photo_ids.slice(0, 3).map((pid) => (
            <Image
              key={pid}
              source={{ uri: photoUrl(pid) }}
              style={styles.cardPhoto}
            />
          ))}
          {stop.photo_ids.length > 3 && (
            <View style={styles.morePhotos}>
              <Text style={styles.morePhotosText}>+{stop.photo_ids.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Rating + Comment */}
      <Stars n={stop.rating} />
      {stop.comment ? (
        <Text style={styles.comment}>"{stop.comment}"</Text>
      ) : null}

      {/* Detour block */}
      {stop.detour && (
        <View style={styles.detourBlock}>
          <Text style={styles.detourLabel}>🧭 DETOUR</Text>
          <Text style={styles.detourPlace}>{stop.detour.place}</Text>
          {stop.detour.what ? <Text style={styles.detourWhat}>{stop.detour.what}</Text> : null}
          {stop.detour.photo_ids?.length > 0 && (
            <View style={styles.photosRow}>
              {stop.detour.photo_ids.slice(0, 3).map((pid) => (
                <Image key={pid} source={{ uri: photoUrl(pid) }} style={styles.cardPhoto} />
              ))}
            </View>
          )}
          <Stars n={stop.detour.rating ?? null} />
          {stop.detour.comment ? <Text style={styles.comment}>"{stop.detour.comment}"</Text> : null}
        </View>
      )}

      {!stop.done && (
        <View style={styles.skippedBadge}>
          <Text style={styles.skippedText}>Skipped</Text>
        </View>
      )}
    </View>
  );
}

export default function StorybookScreen() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await apiCall(`/sessions/${session_id}`);
      setSession(data.session);
      setStops(data.stops);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [session_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateStopHTML = (stop: Stop, idx: number): string => {
    const stars = stop.rating ? "★".repeat(stop.rating) + "☆".repeat(5 - stop.rating) : "";
    const photosHtml = stop.photo_ids.slice(0, 3).map(pid =>
      `<img src="${BACKEND_URL}/api/photos/${pid}" alt="photo" style="width:calc(33.3% - 6px);height:120px;object-fit:cover;border-radius:12px;" />`
    ).join("");
    const photosBlock = stop.photo_ids.length > 0 ? `<div style="display:flex;gap:8px;margin:12px 0;">${photosHtml}</div>` : "";

    let detourHtml = "";
    if (stop.detour) {
      const dStars = stop.detour.rating ? "★".repeat(stop.detour.rating) + "☆".repeat(5 - stop.detour.rating) : "";
      const dPhotos = (stop.detour.photo_ids || []).slice(0, 3).map(pid =>
        `<img src="${BACKEND_URL}/api/photos/${pid}" alt="photo" style="width:calc(33.3% - 6px);height:100px;object-fit:cover;border-radius:10px;" />`
      ).join("");
      detourHtml = `
        <div style="background:#FFF0F5;border-radius:16px;padding:16px;margin-top:16px;border-left:4px solid #FF1493;">
          <p style="font-size:11px;font-weight:700;color:#FF1493;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px 0;">🧭 Detour</p>
          <p style="font-size:18px;font-weight:700;color:#1A1423;margin:0 0 4px 0;">${stop.detour.place}</p>
          ${stop.detour.what ? `<p style="font-size:14px;color:#6A5D7B;margin:4px 0;">${stop.detour.what}</p>` : ""}
          ${dPhotos ? `<div style="display:flex;gap:6px;margin:8px 0;">${dPhotos}</div>` : ""}
          ${dStars ? `<p style="color:#FF1493;font-size:20px;margin:4px 0;">${dStars}</p>` : ""}
          ${stop.detour.comment ? `<p style="font-style:italic;color:#6A5D7B;font-size:14px;margin:4px 0;">"${stop.detour.comment}"</p>` : ""}
        </div>`;
    }

    const skippedBadge = !stop.done ? `<span style="background:#FFB6C1;color:#fff;font-size:11px;font-weight:700;border-radius:20px;padding:3px 10px;letter-spacing:1px;">SKIPPED</span>` : "";

    return `
      <div style="background:#fff;border-radius:20px;padding:24px;margin:16px 0;box-shadow:0 4px 24px rgba(255,20,147,0.08);border:1px solid rgba(255,20,147,0.08);page-break-inside:avoid;">
        <div style="display:flex;align-items:center;margin-bottom:12px;">
          <div style="background:#FF1493;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;margin-right:10px;flex-shrink:0;">${idx + 1}</div>
          <div>
            <p style="margin:0;font-size:22px;font-weight:700;color:#1A1423;font-family:'Georgia',serif;">${stop.emoji} ${stop.name}</p>
            ${stop.location ? `<p style="margin:2px 0 0;font-size:13px;color:#6A5D7B;">📍 ${stop.location}</p>` : ""}
          </div>
          ${skippedBadge}
        </div>
        ${photosBlock}
        ${stars ? `<p style="color:#FF1493;font-size:22px;margin:8px 0;">${stars}</p>` : ""}
        ${stop.comment ? `<p style="font-style:italic;color:#6A5D7B;font-size:15px;line-height:1.6;border-left:3px solid #FFB6C1;padding-left:12px;margin:8px 0;">"${stop.comment}"</p>` : ""}
        ${detourHtml}
      </div>`;
  };

  const generatePDFHtml = (): string => {
    const stopsHtml = stops.map((stop, idx) => generateStopHTML(stop, idx)).join("");
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Lato', 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1A1423; }
          .cover {
            min-height: 100vh; display: flex; flex-direction: column;
            align-items: center; justify-content: center; text-align: center;
            padding: 48px; page-break-after: always;
            background: linear-gradient(135deg, #FF1493 0%, #FF69B4 50%, #FFB6C1 100%);
          }
          .cover-emoji { font-size: 80px; margin-bottom: 24px; }
          .cover-title { font-family: 'Playfair Display', Georgia, serif; font-size: 42px; color: #fff; line-height: 1.2; margin-bottom: 16px; text-shadow: 0 2px 8px rgba(0,0,0,0.15); }
          .cover-date { font-size: 18px; color: rgba(255,255,255,0.85); font-weight: 300; margin-bottom: 12px; }
          .cover-subtitle { font-size: 16px; color: rgba(255,255,255,0.75); font-style: italic; }
          .content { max-width: 680px; margin: 0 auto; padding: 32px 24px; }
          .section-heading { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; color: #FF1493; text-align: center; margin: 32px 0 8px; }
          .divider { border: none; border-top: 2px solid rgba(255,20,147,0.12); margin: 16px 0; }
          .footer { text-align: center; padding: 40px; color: #9E8FAB; font-size: 14px; }
          .footer-heart { font-size: 24px; margin-bottom: 8px; display: block; }
        </style>
      </head>
      <body>
        <div class="cover">
          <div class="cover-emoji">💕</div>
          <h1 class="cover-title">${session?.title || "Our Day Out"}</h1>
          <p class="cover-date">📅 ${session?.date || ""}</p>
          <p class="cover-subtitle">A day we'll never forget</p>
        </div>
        <div class="content">
          <h2 class="section-heading">Our Adventure</h2>
          <hr class="divider" />
          ${stopsHtml}
        </div>
        <div class="footer">
          <span class="footer-heart">💕</span>
          Made with love · Taara & Cookie's Day Out
        </div>
      </body>
      </html>`;
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const html = generatePDFHtml();
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
        } else {
          Alert.alert("PDF Ready", "PDF has been generated at: " + uri);
        }
      }
    } catch (e: any) {
      Alert.alert("PDF Error", e.message || "Could not generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="storybook-back-btn" onPress={() => router.back()} style={{ padding: 8 }}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📖 Storybook</Text>
        <TouchableOpacity
          testID="download-pdf-btn"
          style={styles.pdfBtn}
          onPress={handleDownloadPDF}
          disabled={pdfLoading}
        >
          {pdfLoading ? (
            <ActivityIndicator size="small" color="#FF1493" />
          ) : (
            <Text style={styles.pdfBtnText}>↓ PDF</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cover */}
        <View style={styles.coverCard}>
          <Text style={styles.coverEmoji}>💕</Text>
          <Text style={styles.coverTitle}>{session?.title}</Text>
          <Text style={styles.coverDate}>📅 {session?.date}</Text>
          <Text style={styles.coverSubtitle}>A day we'll never forget ✨</Text>
        </View>

        {/* Stops */}
        <Text style={styles.chapterTitle}>Our Adventure</Text>
        <View style={styles.divider} />

        {stops.map((stop, idx) => (
          <StopCard key={stop.stop_id} stop={stop} index={idx} />
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerHeart}>💕</Text>
          <Text style={styles.footerText}>Made with love · Taara & Cookie's Day Out</Text>
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A1423" },
  pdfBtn: {
    backgroundColor: "#FFF0F5", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1.5, borderColor: "rgba(255,20,147,0.3)", minWidth: 72, alignItems: "center",
  },
  pdfBtnText: { color: "#FF1493", fontWeight: "700", fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 48 },

  // Cover card
  coverCard: {
    backgroundColor: "#FF1493",
    borderRadius: 28,
    padding: 36,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  coverEmoji: { fontSize: 64, marginBottom: 16 },
  coverTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    lineHeight: 36,
    marginBottom: 8,
  },
  coverDate: { fontSize: 15, color: "rgba(255,255,255,0.85)", marginBottom: 6 },
  coverSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.75)", fontStyle: "italic" },

  chapterTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FF1493",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    marginBottom: 8,
  },
  divider: { height: 2, backgroundColor: "rgba(255,20,147,0.1)", marginBottom: 16, borderRadius: 1 },

  // Stop cards
  stopCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,20,147,0.06)",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  stopBadge: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#FF1493",
    alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0,
  },
  stopBadgeNum: { color: "#fff", fontWeight: "700", fontSize: 16 },
  stopEmoji: { fontSize: 20 },
  stopName: {
    fontSize: 20, fontWeight: "700", color: "#1A1423",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  stopLocation: { fontSize: 13, color: "#6A5D7B", marginTop: 2 },

  photosRow: { flexDirection: "row", gap: 6, marginVertical: 12, flexWrap: "wrap" },
  cardPhoto: { width: 90, height: 90, borderRadius: 12, backgroundColor: "#FFF0F5" },
  morePhotos: {
    width: 90, height: 90, borderRadius: 12, backgroundColor: "#FFB6C1",
    alignItems: "center", justifyContent: "center",
  },
  morePhotosText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  stars: { fontSize: 22, color: "#FF1493", marginVertical: 4 },
  comment: {
    fontSize: 15, color: "#6A5D7B", fontStyle: "italic", lineHeight: 22,
    borderLeftWidth: 3, borderLeftColor: "#FFB6C1", paddingLeft: 12, marginVertical: 8,
  },

  // Detour block
  detourBlock: {
    backgroundColor: "#FFF0F5", borderRadius: 16, padding: 16, marginTop: 12,
    borderLeftWidth: 4, borderLeftColor: "#FF1493",
  },
  detourLabel: {
    fontSize: 11, fontWeight: "700", color: "#FF1493",
    letterSpacing: 2, textTransform: "uppercase", marginBottom: 6,
  },
  detourPlace: { fontSize: 18, fontWeight: "700", color: "#1A1423", marginBottom: 4 },
  detourWhat: { fontSize: 14, color: "#6A5D7B", marginBottom: 8, lineHeight: 20 },

  skippedBadge: {
    alignSelf: "flex-start", marginTop: 8,
    backgroundColor: "#FFB6C1", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  skippedText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 1 },

  // Footer
  footer: { alignItems: "center", paddingVertical: 32 },
  footerHeart: { fontSize: 32, marginBottom: 8 },
  footerText: { fontSize: 14, color: "#9E8FAB", textAlign: "center" },
});
