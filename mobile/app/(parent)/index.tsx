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

export default function ParentDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [children, setChildren] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredUser().then(setUser);
    api.get("/parent/children").then(({ data }) => {
      setChildren(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hi, {user?.name?.split(" ")[0] || "Parent"}
          </Text>
          <Text style={styles.subtitle}>Your Children</Text>
        </View>
        <TouchableOpacity
          onPress={async () => {
            await logout();
            router.replace("/(auth)");
          }}
        >
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.childCard}
            onPress={() => router.push(`/(parent)/child/${item.id}`)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{item.name}</Text>
              <Text style={styles.childEmail}>{item.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No children linked yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#fff",
  },
  greeting: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
  childName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  childEmail: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { color: "#9CA3AF", fontSize: 16, marginTop: 12 },
});
