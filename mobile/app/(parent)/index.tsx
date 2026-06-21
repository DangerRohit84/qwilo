import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { logout, getStoredUser } from "../../services/auth";
import { User } from "../../types";
import { useTheme } from "../../contexts/ThemeContext";
import ConfirmModal from "../../components/ConfirmModal";

export default function ParentDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [children, setChildren] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    getStoredUser().then(setUser);
    api.get("/parent/children").then(({ data }) => {
      setChildren(data);
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
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>
              Hi, {user?.name?.split(" ")[0] || "Parent"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your Children</Text>
          </View>
          <TouchableOpacity onPress={() => setShowLogout(true)} style={[styles.logoutIcon, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
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

      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { padding: 24, paddingBottom: 100 }]}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.childCard, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/(parent)/child/${item.id}`)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={[styles.childName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.childEmail, { color: colors.textSecondary }]}>{item.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  logoBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center" },
  logoText: { fontSize: 18, fontWeight: "700", letterSpacing: 1 },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: 4 },
  logoutIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  listContent: {},
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: "600" },
  childEmail: { fontSize: 13, marginTop: 2 },

});
