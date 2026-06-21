import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../services/api";
import { StudentProgress } from "../../../types";
import { useTheme } from "../../../contexts/ThemeContext";

export default function ChildProgressScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [data, setData] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/parent/children/${id}/progress`).then(({ data }) => {
      setData(data);
      setLoading(false);
    });
  }, [id]);

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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Progress</Text>
        <TouchableOpacity
          onPress={() => router.push(`/(parent)/sessions/${id}`)}
        >
          <Ionicons name="calendar" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.cards}>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{data?.completionRate}%</Text>
            <Text style={styles.cardLabel}>Completion</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{data?.accuracy}%</Text>
            <Text style={styles.cardLabel}>Accuracy</Text>
          </View>
        </View>

        <View style={styles.cards}>
          <View style={styles.cardSmall}>
            <Text style={styles.cardValueSmall}>{data?.completedTasks}</Text>
            <Text style={styles.cardLabel}>/{data?.totalTasks} Tasks</Text>
          </View>
          <View style={styles.cardSmall}>
            <Text style={styles.cardValueSmall}>{data?.correctAnswers}</Text>
            <Text style={styles.cardLabel}>/{data?.totalQuestions} Correct</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>By Subject</Text>
        {data?.subjectBreakdown &&
          Object.entries(data.subjectBreakdown).map(([subject, stats]) => (
            <View key={subject} style={styles.subjectRow}>
              <Text style={styles.subjectName}>{subject}</Text>
              <View style={styles.subjectBar}>
                <View
                  style={[
                    styles.subjectFill,
                    {
                      width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.subjectStat}>
                {stats.completed}/{stats.total}
              </Text>
            </View>
          ))}

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {data?.recentSessions.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.sessionRow}
            onPress={() => router.push(`/(parent)/sessions/${s.id}`)}
          >
            <Text style={styles.sessionDate}>
              {new Date(s.date).toLocaleDateString()}
            </Text>
            <Text style={styles.sessionTasks}>{s.taskCount} tasks</Text>
            <View
              style={[
                styles.statusBadge,
                s.status === "COMPLETED"
                  ? styles.statusDone
                  : styles.statusPending,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  s.status === "COMPLETED"
                    ? styles.statusTextDone
                    : styles.statusTextPending,
                ]}
              >
                {s.status}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#fff",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  content: { flex: 1, padding: 24 },
  cards: { flexDirection: "row", gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  cardValue: { fontSize: 32, fontWeight: "700", color: "#4F46E5" },
  cardLabel: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  cardSmall: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cardValueSmall: { fontSize: 24, fontWeight: "700", color: "#111827" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 20,
    marginBottom: 12,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  subjectName: { width: 80, fontSize: 14, color: "#374151", fontWeight: "500" },
  subjectBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  subjectFill: { height: "100%", backgroundColor: "#4F46E5", borderRadius: 4 },
  subjectStat: { width: 50, textAlign: "right", fontSize: 13, color: "#6B7280" },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  sessionDate: { flex: 1, fontSize: 14, color: "#374151" },
  sessionTasks: { fontSize: 14, color: "#6B7280", marginRight: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusDone: { backgroundColor: "#D1FAE5" },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusTextDone: { color: "#059669" },
  statusTextPending: { color: "#D97706" },
});
