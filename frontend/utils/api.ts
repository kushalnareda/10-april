import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await AsyncStorage.getItem("session_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BACKEND_URL}/api${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      errMsg = err.detail || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  return res.json();
}

export function photoUrl(photoId: string): string {
  return `${BACKEND_URL}/api/photos/${photoId}`;
}
