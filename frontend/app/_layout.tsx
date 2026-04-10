import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, View, StyleSheet } from "react-native";
import { AuthProvider } from "../context/AuthContext";

const isWeb = Platform.OS === "web";

export default function RootLayout() {
  const nav = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(app)" />
    </Stack>
  );

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      {isWeb ? (
        <View style={styles.webOuter}>
          <View style={styles.webInner}>{nav}</View>
        </View>
      ) : (
        nav
      )}
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: "#F9E4EF",
    alignItems: "center",
  },
  webInner: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#FFF0F5",
    overflow: "hidden",
  },
});
