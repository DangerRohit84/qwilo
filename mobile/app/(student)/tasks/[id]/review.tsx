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
import { Ionicons } from "@react-native-vector-icons/ionicons";
import api from "../../../../services/api";
import { ReviewQuestion } from "../../../../types";
import { useTheme } from "../../../../contexts/ThemeContext";

export default function ReviewScreen() {
  const { id: taskId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
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
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const total = questions.length;
  const correct = questions.filter(q => q.isCorrect).length;
  const attempted = questions.filter(q => q.studentAnswer !== null).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Review Answers</Text>
        <View style={{ width: 28 }} />
      </View>

      {total > 0 && (
        <View style={[styles.summary, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {correct}/{total} correct
          </Text>
          <Text style={[styles.summarySub, { color: colors.textSecondary }]}>
            {total - attempted > 0 ? `${total - attempted} unanswered` : ""}
          </Text>
        </View>
      )}

      <ScrollView style={styles.list}>
        {questions.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No questions found</Text>
        ) : (
          questions.map((q, i) => (
            <View key={q.id} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.qNum, { color: colors.primary }]}>Q{i + 1}</Text>
                <View style={[styles.badge, { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {q.type}
                  </Text>
                </View>
              </View>
              <Text style={[styles.qText, { color: colors.text }]}>{q.questionText}</Text>

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
                          { borderColor: colors.border },
                          isCorrectAnswer && { borderColor: colors.success, backgroundColor: "#F0FDF4" },
                          isStudentAnswer && !isCorrectAnswer && { borderColor: colors.danger, backgroundColor: "#FEF2F2" },
                        ]}
                      >
                        <Text style={[styles.optionText, { color: colors.textSecondary }]}>{opt}</Text>
                        {isCorrectAnswer && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        )}
                        {isStudentAnswer && !isCorrectAnswer && (
                          <Ionicons name="close-circle" size={20} color={colors.danger} />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {q.type === "VOICE" && (
                <View style={styles.voiceResult}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Your answer:</Text>
                  <Text style={[styles.voiceAnswer, { color: colors.text }]}>{q.studentAnswer || "No answer"}</Text>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Expected answer:</Text>
                  <Text style={[styles.voiceCorrect, { color: colors.success }]}>{q.correctAnswer || "N/A"}</Text>
                </View>
              )}

              {q.score !== null && (
                <View style={[styles.scoreRow, { borderTopColor: colors.border }]}>
                  <Ionicons
                    name={q.isCorrect ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={q.isCorrect ? colors.success : colors.danger}
                  />
                  <Text style={[styles.scoreText, { color: q.isCorrect ? colors.success : colors.danger }]}>
                    {q.isCorrect ? "Correct" : "Incorrect"} — Score: {q.score}/100
                  </Text>
                </View>
              )}

              {q.feedback && (
                <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>{q.feedback}</Text>
              )}

              {q.studentAnswer === null && (
                <View style={[styles.unansweredBadge, { backgroundColor: "#FEF2F2" }]}>
                  <Ionicons name="time-outline" size={16} color={colors.danger} />
                  <Text style={[styles.unansweredText, { color: colors.danger }]}>Not answered</Text>
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
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 60,
  },
  title: { fontSize: 20, fontWeight: "700" },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  summaryText: { fontSize: 18, fontWeight: "700" },
  summarySub: { fontSize: 14 },
  list: { padding: 16 },
  empty: { textAlign: "center", marginTop: 40, fontSize: 16 },
  card: {
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
  qNum: { fontSize: 14, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  qText: { fontSize: 16, marginBottom: 12 },
  options: { gap: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: { fontSize: 14, flex: 1 },
  voiceResult: { gap: 4, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600" },
  voiceAnswer: { fontSize: 14, marginBottom: 8 },
  voiceCorrect: { fontSize: 14, fontWeight: "600" },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  scoreText: { fontSize: 14, fontWeight: "600" },
  feedbackText: { fontSize: 13, marginTop: 6, lineHeight: 18, fontStyle: "italic" },
  unansweredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
  },
  unansweredText: { fontSize: 12, fontWeight: "600" },
});
