import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../services/api";
import { HomeworkSession } from "../../../types";

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<HomeworkSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/parent/sessions/${sessionId}`).then(({ data }) => {
      setSession(data);
      setLoading(false);
    });
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>Session not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {new Date(session.date).toLocaleDateString()}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <Image
          source={{ uri: session.homeworkImageUrl }}
          style={styles.homeworkImg}
        />

        <Text style={styles.sectionTitle}>Tasks</Text>
        {session.tasks?.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <View
                style={[
                  styles.taskTypeBg,
                  {
                    backgroundColor:
                      task.type === "READING"
                        ? "#EEF2FF"
                        : task.type === "WRITING"
                          ? "#FEF3C7"
                          : "#F0FDF4",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.taskTypeText,
                    {
                      color:
                        task.type === "READING"
                          ? "#4F46E5"
                          : task.type === "WRITING"
                            ? "#D97706"
                            : "#059669",
                    },
                  ]}
                >
                  {task.type}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  task.status === "COMPLETED"
                    ? styles.statusDone
                    : task.status === "SUBMITTED"
                      ? styles.statusPending
                      : styles.statusTodo,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    task.status === "COMPLETED"
                      ? styles.statusTextDone
                      : task.status === "SUBMITTED"
                        ? styles.statusTextPending
                        : styles.statusTextTodo,
                  ]}
                >
                  {task.status}
                </Text>
              </View>
            </View>
            <Text style={styles.taskSubject}>{task.subject}</Text>
            <Text style={styles.taskDesc}>{task.description}</Text>

            {task.submission && (
              <>
                <Text style={styles.subSection}>Submitted Work</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(task.submission.images as string[]).map((url, i) => (
                    <Image
                      key={i}
                      source={{ uri: url }}
                      style={styles.subImage}
                    />
                  ))}
                </ScrollView>
                {task.submission.aiAnalysis && (
                  <View style={styles.analysisBox}>
                    <Text style={styles.analysisTitle}>AI Analysis</Text>
                    <Text style={styles.analysisText}>
                      {task.submission.aiAnalysis}
                    </Text>
                  </View>
                )}
              </>
            )}

            {task.questions && task.questions.length > 0 && (
              <>
                <Text style={styles.subSection}>
                  Questions ({task.questions.length})
                </Text>
                {task.questions.map((q) => {
                  const answer = q.answers?.[0];
                  return (
                    <View key={q.id} style={styles.qRow}>
                      <View style={styles.qLeft}>
                        <Text style={styles.qType}>
                          {q.type === "MCQ" ? "MCQ" : "Voice"}
                        </Text>
                        <Text style={styles.qText} numberOfLines={2}>
                          {q.questionText}
                        </Text>
                      </View>
                      {answer && (
                        <View
                          style={[
                            styles.qScore,
                            answer.isCorrect
                              ? styles.qCorrect
                              : styles.qWrong,
                          ]}
                        >
                          <Text
                            style={[
                              styles.qScoreText,
                              { color: answer.isCorrect ? "#059669" : "#DC2626" },
                            ]}
                          >
                            {answer.score}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
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
  homeworkImg: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  taskTypeBg: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  taskTypeText: { fontSize: 12, fontWeight: "600" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDone: { backgroundColor: "#D1FAE5" },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusTodo: { backgroundColor: "#E5E7EB" },
  statusText: { fontSize: 11, fontWeight: "600" },
  statusTextDone: { color: "#059669" },
  statusTextPending: { color: "#D97706" },
  statusTextTodo: { color: "#6B7280" },
  taskSubject: { fontSize: 16, fontWeight: "600", color: "#111827" },
  taskDesc: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  subSection: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  subImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  analysisBox: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  analysisTitle: { fontSize: 13, fontWeight: "600", color: "#374151" },
  analysisText: { fontSize: 13, color: "#6B7280", marginTop: 4, lineHeight: 18 },
  qRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  qLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  qType: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4F46E5",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qText: { fontSize: 13, color: "#374151", flex: 1 },
  qScore: {
    width: 32,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  qCorrect: { backgroundColor: "#D1FAE5" },
  qWrong: { backgroundColor: "#FEE2E2" },
  qScoreText: { fontSize: 12, fontWeight: "700" },
});
