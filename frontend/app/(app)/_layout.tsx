import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="planner/index" />
      <Stack.Screen name="planner/create" />
      <Stack.Screen name="stages/[session_id]" />
      <Stack.Screen name="drumroll/[stop_id]" />
      <Stack.Screen name="stop/[stop_id]" />
      <Stack.Screen name="finale/[session_id]" />
      <Stack.Screen name="storybook/[session_id]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F5" },
});
