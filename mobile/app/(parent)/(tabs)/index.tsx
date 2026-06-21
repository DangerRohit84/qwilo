import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../services/api";
import { logout, getStoredUser } from "../../../services/auth";
import { User } from "../../../types";
import { useTheme } from "../../../contexts/ThemeContext";
import ConfirmModal from "../../../components/ConfirmModal";

export default function ParentDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    getStoredUser().then(setUser);
    api.get("/parent/progress").then(({ data }) => {
      setChildren(data.children || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            <Ionicons name="book" size={20} color="#fff" />
          </View>
          <Text style={[styles.logoText, { color: colors.text }]}>Qwilo</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Hi, {user?.name?.split(" ")[0] || "Parent"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your Children</Text>
        </View>
      </View>

      <ConfirmModal
        visible={showLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setShowLogout(false);
          await logout();
          router.replace("/(auth)");
        }}
        onCancel={() => setShowLogout(false)}
      />

      {children.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No children linked yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/(parent)/child/${child.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{child.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.childName, { color: colors.text }]}>{child.name}</Text>
                  <Text style={[styles.childEmail, { color: colors.textSecondary }]}>{child.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
              </View>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{child.completionRate}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completion</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.success }]}>{child.accuracy}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Accuracy</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{child.completedTasks}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tasks</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  logoBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center" },
  logoText: { fontSize: 18, fontWeight: "700", letterSpacing: 1 },
  headerContent: {},
  greeting: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: 4 },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  emptyText: { fontSize: 16, marginTop: 12 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  cardInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: "600" },
  childEmail: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 4 },
});
