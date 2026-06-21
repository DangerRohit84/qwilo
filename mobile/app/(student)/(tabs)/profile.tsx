import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { logout, getStoredUser } from "../../../services/auth";
import api from "../../../services/api";
import { User } from "../../../types";
import { useTheme } from "../../../contexts/ThemeContext";

interface Session {
  id: string;
  date: string;
  status: string;
  taskCount: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        try {
          const { data } = await api.get("/student/history");
          if (active) setSessions(data.recentSessions || []);
        } catch {
        } finally {
          if (active) setLoading(false);
        }
      }
      load();
      return () => { active = false; };
    }, [])
  );

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
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
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

      <Text style={[styles.sectionTitle, { color: colors.text }]}>History</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
      ) : sessions.length > 0 ? (
        sessions.map((s) => (
          <View key={s.id} style={[styles.sessionRow, { backgroundColor: colors.card }]}>
            <View style={styles.sessionLeft}>
              <Ionicons
                name={
                  s.status === "COMPLETED"
                    ? "checkmark-circle"
                    : "time-outline"
                }
                size={20}
                color={s.status === "COMPLETED" ? colors.success : colors.warning}
              />
              <Text style={[styles.sessionDate, { color: colors.text }]}>
                {new Date(s.date).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.sessionTasks, { color: colors.textSecondary }]}>{s.taskCount} tasks</Text>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No sessions yet</Text>
      )}

      <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.danger }]} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { alignItems: "center", paddingTop: 80, padding: 24 },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    width: "100%",
    marginBottom: 12,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    width: "100%",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sessionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sessionDate: { fontSize: 14, fontWeight: "500" },
  sessionTasks: { fontSize: 13 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 8 },
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
