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
import { useTheme } from "../../../contexts/ThemeContext";

export default function SessionDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { sessionId } = useLocalSearchParams();
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
        {session.tasks?.map((task) => (
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
                  return (
                    <View key={q.id} style={[styles.qRow, { backgroundColor: colors.bg }]}>
                      <View style={styles.qLeft}>
                        <View style={[styles.qTypeBg, { backgroundColor: colors.primary + "18" }]}>
                          <Text style={[styles.qType, { color: colors.primary }]}>
                            {q.type === "MCQ" ? "MCQ" : "Voice"}
                          </Text>
                        </View>
                        <Text style={[styles.qText, { color: colors.text }]} numberOfLines={2}>
                          {q.questionText}
                        </Text>
                      </View>
                      {answer && (
                        <View
                          style={[
                            styles.qScore,
                            answer.isCorrect
                              ? { backgroundColor: colors.success + "22" }
                              : { backgroundColor: colors.danger + "22" },
                          ]}
                        >
                          <Text
                            style={{
                              color: answer.isCorrect ? colors.success : colors.danger,
                              fontSize: 12,
                              fontWeight: "700",
                            }}
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
  qRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  qLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  qTypeBg: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  qType: { fontSize: 10, fontWeight: "700" },
  qText: { fontSize: 13, flex: 1 },
  qScore: {
    width: 32,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
