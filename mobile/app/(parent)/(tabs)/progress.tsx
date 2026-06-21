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
import { useTheme } from "../../../contexts/ThemeContext";

interface ChildProgress {
  id: string;
  name: string;
  email: string;
  completionRate: number;
  accuracy: number;
  completedTasks: number;
  totalTasks: number;
  correctAnswers: number;
  totalQuestions: number;
}

export default function ParentProgressScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [data, setData] = useState<ChildProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/parent/progress").then(({ data }) => {
      setData(data);
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>All Children</Text>

        {data.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="analytics-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No children linked yet</Text>
          </View>
        ) : (
          data.map((child) => (
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
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  emptyCenter: { alignItems: "center", marginTop: 80 },
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
