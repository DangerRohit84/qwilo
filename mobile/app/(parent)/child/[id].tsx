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
  const { id } = useLocalSearchParams();
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
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Progress</Text>
        <TouchableOpacity
          onPress={() => router.push(`/(parent)/sessions/${id}`)}
        >
          <Ionicons name="calendar" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.cards}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardValue, { color: colors.primary }]}>{data?.completionRate}%</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Completion</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardValue, { color: colors.primary }]}>{data?.accuracy}%</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Accuracy</Text>
          </View>
        </View>

        <View style={styles.cards}>
          <View style={[styles.cardSmall, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardValueSmall, { color: colors.text }]}>{data?.completedTasks}</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>/{data?.totalTasks} Tasks</Text>
          </View>
          <View style={[styles.cardSmall, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardValueSmall, { color: colors.text }]}>{data?.correctAnswers}</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>/{data?.totalQuestions} Correct</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>By Subject</Text>
        {data?.subjectBreakdown &&
          Object.entries(data.subjectBreakdown).map(([subject, stats]) => (
            <View key={subject} style={styles.subjectRow}>
              <Text style={[styles.subjectName, { color: colors.text }]}>{subject}</Text>
              <View style={[styles.subjectBar, { backgroundColor: colors.inputBg }]}>
                <View
                  style={[
                    styles.subjectFill,
                    {
                      width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.subjectStat, { color: colors.textSecondary }]}>
                {stats.completed}/{stats.total}
              </Text>
            </View>
          ))}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        {data?.recentSessions.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.sessionRow, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/(parent)/sessions/${s.id}`)}
          >
            <Text style={[styles.sessionDate, { color: colors.text }]}>
              {new Date(s.date).toLocaleDateString()}
            </Text>
            <Text style={[styles.sessionTasks, { color: colors.textSecondary }]}>{s.taskCount} tasks</Text>
            <View
              style={[
                styles.statusBadge,
                s.status === "COMPLETED"
                  ? { backgroundColor: colors.success + "22" }
                  : { backgroundColor: colors.warning + "22" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: s.status === "COMPLETED" ? colors.success : colors.warning },
                ]}
              >
                {s.status}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 56,
  },
  backBtn: { width: 28 },
  title: { fontSize: 20, fontWeight: "700" },
  content: { flex: 1, padding: 24 },
  cards: { flexDirection: "row", gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  cardValue: { fontSize: 32, fontWeight: "700" },
  cardLabel: { fontSize: 14, marginTop: 4 },
  cardSmall: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cardValueSmall: { fontSize: 24, fontWeight: "700" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 12,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  subjectName: { width: 80, fontSize: 14, fontWeight: "500" },
  subjectBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  subjectFill: { height: "100%", borderRadius: 4 },
  subjectStat: { width: 50, textAlign: "right", fontSize: 13 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  sessionDate: { flex: 1, fontSize: 14 },
  sessionTasks: { fontSize: 14, marginRight: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
});
