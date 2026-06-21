import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { logout, getStoredUser } from "../../../services/auth";
import { User } from "../../../types";
import { useTheme } from "../../../contexts/ThemeContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatar}>
          <Ionicons name="person-circle" size={80} color={colors.primary} />
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{user?.name || "Student"}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email || ""}</Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <Ionicons name="school" size={20} color={colors.textSecondary} />
            <Text style={[styles.rowText, { color: colors.text }]}>Role: Student</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.danger }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { alignItems: "center", paddingTop: 80, padding: 24, paddingBottom: 100 },
  avatar: { marginBottom: 16 },
  name: { fontSize: 24, fontWeight: "700" },
  email: { fontSize: 14, marginTop: 4, marginBottom: 32 },
  card: {
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 24,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { fontSize: 16 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    width: "100%",
    marginTop: 24,
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
