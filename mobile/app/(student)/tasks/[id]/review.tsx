import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../../services/api";
import { ReviewQuestion } from "../../../../types";

export default function ReviewScreen() {
  const { id: taskId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/student/tasks/${taskId}/review`)
      .then(({ data }) => setQuestions(data))
      .catch(() => {})
      .finally(() => setLoading(false));
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Review Answers</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView style={styles.list}>
        {questions.length === 0 ? (
          <Text style={styles.empty}>No questions found</Text>
        ) : (
          questions.map((q, i) => (
            <View key={q.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.qNum}>Q{i + 1}</Text>
                <View style={[styles.badge, q.type === "MCQ" ? styles.mcqBadge : styles.voiceBadge]}>
                  <Text style={[styles.badgeText, q.type === "MCQ" ? styles.mcqBadgeText : styles.voiceBadgeText]}>
                    {q.type}
                  </Text>
                </View>
              </View>
              <Text style={styles.qText}>{q.questionText}</Text>

              {q.type === "MCQ" && q.options && (
                <View style={styles.options}>
                  {q.options.map((opt, oi) => {
                    const isStudentAnswer = opt === q.studentAnswer;
                    const isCorrectAnswer = opt === q.correctAnswer;
                    return (
                      <View
                        key={oi}
                        style={[
                          styles.optionRow,
                          isCorrectAnswer && styles.correctOpt,
                          isStudentAnswer && !isCorrectAnswer && styles.wrongOpt,
                        ]}
                      >
                        <Text style={styles.optionText}>{opt}</Text>
                        {isCorrectAnswer && (
                          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        )}
                        {isStudentAnswer && !isCorrectAnswer && (
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {q.type === "VOICE" && (
                <View style={styles.voiceResult}>
                  <Text style={styles.label}>Your answer:</Text>
                  <Text style={styles.voiceAnswer}>{q.studentAnswer || "No answer"}</Text>
                  <Text style={styles.label}>Correct answer:</Text>
                  <Text style={styles.voiceCorrect}>{q.correctAnswer}</Text>
                </View>
              )}

              {q.score !== null && (
                <View style={styles.scoreRow}>
                  <Ionicons
                    name={q.isCorrect ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={q.isCorrect ? "#10B981" : "#EF4444"}
                  />
                  <Text style={[styles.scoreText, q.isCorrect ? styles.correctScore : styles.wrongScore]}>
                    {q.isCorrect ? "Correct" : "Incorrect"} — Score: {q.score}/100
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
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
  list: { padding: 16 },
  empty: { textAlign: "center", color: "#9CA3AF", marginTop: 40, fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  qNum: { fontSize: 14, fontWeight: "700", color: "#4F46E5" },
  badge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 },
  mcqBadge: { backgroundColor: "#EEF2FF" },
  voiceBadge: { backgroundColor: "#FFF7ED" },
  badgeText: { fontSize: 12, fontWeight: "600" },
  mcqBadgeText: { color: "#4F46E5" },
  voiceBadgeText: { color: "#EA580C" },
  qText: { fontSize: 16, color: "#111827", marginBottom: 12 },
  options: { gap: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  correctOpt: { borderColor: "#10B981", backgroundColor: "#F0FDF4" },
  wrongOpt: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  optionText: { fontSize: 14, color: "#374151", flex: 1 },
  voiceResult: { gap: 4, marginBottom: 8 },
  label: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  voiceAnswer: { fontSize: 14, color: "#111827", marginBottom: 8 },
  voiceCorrect: { fontSize: 14, color: "#059669", fontWeight: "600" },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  scoreText: { fontSize: 14, fontWeight: "600" },
  correctScore: { color: "#10B981" },
  wrongScore: { color: "#EF4444" },
});
