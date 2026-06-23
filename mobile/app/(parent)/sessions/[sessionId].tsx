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
import { Ionicons } from "@react-native-vector-icons/ionicons";
import api from "../../../services/api";
import { HomeworkSession } from "../../../types";
import { useTheme } from "../../../contexts/ThemeContext";

export default function SessionDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { sessionId, taskId } = useLocalSearchParams();
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
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.textSecondary }}>Session not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {new Date(session.date).toLocaleDateString()}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: session.homeworkImageUrl }}
          style={styles.homeworkImg}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks</Text>
        {(taskId ? session.tasks?.filter((t) => t.id === taskId) : session.tasks)?.map((task) => (
          <View key={task.id} style={[styles.taskCard, { backgroundColor: colors.card }]}>
            <View style={styles.taskHeader}>
              <View style={[styles.taskTypeBg, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.taskTypeText, { color: colors.primary }]}>
                  {task.type}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  task.status === "COMPLETED"
                    ? { backgroundColor: colors.success + "22" }
                    : task.status === "SUBMITTED"
                      ? { backgroundColor: colors.warning + "22" }
                      : { backgroundColor: colors.inputBg },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: task.status === "COMPLETED" ? colors.success : task.status === "SUBMITTED" ? colors.warning : colors.textMuted },
                  ]}
                >
                  {task.status}
                </Text>
              </View>
            </View>
            <Text style={[styles.taskSubject, { color: colors.text }]}>{task.subject}</Text>
            <Text style={[styles.taskDesc, { color: colors.textSecondary }]}>{task.description}</Text>

            {task.submission && (
              <>
                <Text style={[styles.subSection, { color: colors.text }]}>Submitted Work</Text>
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
                  <View style={[styles.analysisBox, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.analysisTitle, { color: colors.text }]}>AI Analysis</Text>
                    <Text style={[styles.analysisText, { color: colors.textSecondary }]}>
                      {task.submission.aiAnalysis}
                    </Text>
                  </View>
                )}
              </>
            )}

            {task.questions && task.questions.length > 0 && (
              <>
                <Text style={[styles.subSection, { color: colors.text }]}>
                  Questions ({task.questions.length})
                </Text>
                {task.questions.map((q) => {
                  const answer = q.answers?.[0];
                  const ansText = answer?.answerText || answer?.answer;
                  return (
                    <View key={q.id} style={[styles.qCard, { backgroundColor: colors.bg }]}>
                      <View style={styles.qHeader}>
                        <View style={[styles.qTypeBg, { backgroundColor: colors.primary + "18" }]}>
                          <Text style={[styles.qTypeText, { color: colors.primary }]}>
                            {q.type === "MCQ" ? "MCQ" : "Voice"}
                          </Text>
                        </View>
                        <Text style={[styles.qQuestion, { color: colors.text }]}>{q.questionText}</Text>
                        {answer && (
                          <Ionicons
                            name={answer.isCorrect ? "checkmark-circle" : "close-circle"}
                            size={20}
                            color={answer.isCorrect ? colors.success : colors.danger}
                          />
                        )}
                      </View>

                      {q.type === "MCQ" && q.options && typeof q.options === "object" && (
                        <View style={styles.optionsWrap}>
                          {Object.entries(q.options as Record<string, string>).map(([key, val]) => {
                            const isStudentAnswer = ansText === key || ansText === val;
                            let bg = "transparent";
                            let border = colors.border;
                            if (isStudentAnswer) {
                              bg = answer?.isCorrect ? colors.success + "22" : colors.danger + "22";
                              border = answer?.isCorrect ? colors.success : colors.danger;
                            }
                            return (
                              <View key={key} style={[styles.optionRow, { backgroundColor: bg, borderColor: border }]}>
                                <Text style={[styles.optionKey, { color: colors.textMuted }]}>{key}.</Text>
                                <Text style={[styles.optionVal, { color: colors.text }]}>{val}</Text>
                                {isStudentAnswer && (
                                  <Ionicons name={answer?.isCorrect ? "checkmark-circle" : "close-circle"} size={16} color={answer?.isCorrect ? colors.success : colors.danger} />
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {(q.type === "VOICE" || q.type === "Voice") && answer && (
                        <View style={styles.voiceRow}>
                          <Ionicons name="mic" size={16} color={colors.textSecondary} />
                          <Text style={[styles.voiceText, { color: colors.textSecondary }]} numberOfLines={2}>
                            {ansText || "No transcription"}
                          </Text>
                          <View style={[styles.scoreBadge, { backgroundColor: answer.isCorrect ? colors.success + "22" : colors.danger + "22" }]}>
                            <Text style={{ color: answer.isCorrect ? colors.success : colors.danger, fontSize: 12, fontWeight: "700" }}>
                              {answer.score}
                            </Text>
                          </View>
                        </View>
                      )}

                      {answer?.feedback && (
                        <Text style={[styles.feedbackText, { color: colors.textMuted }]}>Feedback: {answer.feedback}</Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
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
    paddingTop: 40,
  },
  backBtn: { width: 28 },
  title: { fontSize: 20, fontWeight: "700" },
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
    marginBottom: 12,
  },
  taskCard: {
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
  statusText: { fontSize: 11, fontWeight: "600" },
  taskSubject: { fontSize: 16, fontWeight: "600" },
  taskDesc: { fontSize: 14, marginTop: 4 },
  subSection: {
    fontSize: 14,
    fontWeight: "600",
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
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  analysisTitle: { fontSize: 13, fontWeight: "600" },
  analysisText: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  qCard: { padding: 12, borderRadius: 8, marginTop: 8 },
  qHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  qTypeBg: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  qTypeText: { fontSize: 10, fontWeight: "700" },
  qQuestion: { fontSize: 14, fontWeight: "500", flex: 1 },
  optionsWrap: { gap: 4, marginBottom: 4 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  optionKey: { fontSize: 13, fontWeight: "600", width: 16 },
  optionVal: { fontSize: 13, flex: 1 },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  voiceText: { fontSize: 13, flex: 1, fontStyle: "italic" },
  scoreBadge: {
    width: 32,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackText: { fontSize: 12, marginTop: 4, lineHeight: 16, fontStyle: "italic" },
});
