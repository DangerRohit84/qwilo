import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { logout, getStoredUser } from "../../services/auth";
import { User } from "../../types";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  async function handleLogout() {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)");
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Ionicons name="person-circle" size={80} color="#4F46E5" />
      </View>
      <Text style={styles.name}>{user?.name || "Student"}</Text>
      <Text style={styles.email}>{user?.email || ""}</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="school" size={20} color="#6B7280" />
          <Text style={styles.rowText}>Role: Student</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    paddingTop: 80,
    padding: 24,
  },
  avatar: { marginBottom: 16 },
  name: { fontSize: 24, fontWeight: "700", color: "#111827" },
  email: { fontSize: 14, color: "#6B7280", marginTop: 4, marginBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: { fontSize: 16, color: "#374151" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    width: "100%",
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
