import { useEffect, useState, useRef, useCallback } from "react";
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
import { Calendar } from "react-native-calendars";
import api from "../../../services/api";
import { useTheme } from "../../../contexts/ThemeContext";

type Preset = "today" | "week" | "month" | "all";

function getPresetRange(preset: Preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (preset) {
    case "today":
      return {
        startDate: new Date(Date.UTC(y, m, d)),
        endDate: new Date(Date.UTC(y, m, d, 23, 59, 59, 999)),
      };
    case "week": {
      const day = now.getDay();
      const start = new Date(Date.UTC(y, m, d - (day === 0 ? 6 : day - 1)));
      const end = new Date(Date.UTC(y, m, d + (day === 0 ? 0 : 7 - day), 23, 59, 59, 999));
      return { startDate: start, endDate: end };
    }
    case "month":
      return {
        startDate: new Date(Date.UTC(y, m, 1)),
        endDate: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
      };
    default:
      return { startDate: undefined, endDate: undefined };
  }
}

export default function ChildProgressScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("all");
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const fetchProgress = useCallback(
    async (startDate?: Date, endDate?: Date) => {
      setLoading(true);
      try {
        const params: any = {};
        if (startDate) params.startDate = startDate.toISOString();
        if (endDate) params.endDate = endDate.toISOString();
        const { data: result } = await api.get(`/parent/children/${id}/progress`, { params });
        setData(result);
        setLoading(false);

        const marks: Record<string, any> = {};
        (result.recentSessions || []).forEach((s: any) => {
          const dateStr = s.date.split("T")[0];
          marks[dateStr] = {
            marked: true,
            dotColor: s.status === "COMPLETED" ? "#10B981" : "#F59E0B",
          };
        });

        if (selectedRef.current) {
          marks[selectedRef.current] = {
            ...marks[selectedRef.current],
            selected: true,
            selectedColor: "#4F46E5",
          };
        }

        setMarkedDates(marks);
      } catch (err) {
        console.error("Failed to fetch child progress");
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchProgress();
  }, []);

  function applyPreset(p: Preset) {
    setPreset(p);
    setSelectedDate(null);
    selectedRef.current = null;
    const range = getPresetRange(p);
    fetchProgress(range.startDate, range.endDate);
  }

  function onDayPress(day: { dateString: string }) {
    setSelectedDate(day.dateString);
    selectedRef.current = day.dateString;
    const start = new Date(day.dateString + "T00:00:00.000Z");
    const end = new Date(day.dateString + "T23:59:59.999Z");
    fetchProgress(start, end);
  }

  const presets: { key: Preset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" },
  ];

  if (loading && !data) {
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
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.presetRow}>
          {presets.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.presetBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                preset === p.key && {
                  backgroundColor: "#4F46E5",
                  borderColor: "#4F46E5",
                },
              ]}
              onPress={() => applyPreset(p.key)}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: colors.textSecondary },
                  preset === p.key && { color: "#fff" },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.calendarToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowCalendar(!showCalendar)}
        >
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={[styles.calendarToggleText, { color: colors.textSecondary }]}>
            {selectedDate
              ? new Date(selectedDate + "T00:00:00").toLocaleDateString()
              : "Select a date"}
          </Text>
          <Ionicons
            name={showCalendar ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {showCalendar && (
          <View style={[styles.calendarWrap, { backgroundColor: colors.card }]}>
            <Calendar
              theme={{
                backgroundColor: "transparent",
                calendarBackground: "transparent",
                dayTextColor: colors.text,
                monthTextColor: colors.text,
                arrowColor: colors.primary,
                todayTextColor: colors.primary,
                textDisabledColor: colors.textMuted,
              }}
              markedDates={markedDates}
              onDayPress={onDayPress}
            />
          </View>
        )}

        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardValue, { color: colors.primary }]}>{data?.completionRate || 0}%</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Completion</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardValue, { color: colors.success }]}>{data?.accuracy || 0}%</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Accuracy</Text>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View style={[styles.cardMini, { backgroundColor: colors.card }]}>
            <Text style={[styles.miniVal, { color: colors.text }]}>{data?.completedTasks || 0}</Text>
            <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Tasks Done</Text>
          </View>
          <View style={[styles.cardMini, { backgroundColor: colors.card }]}>
            <Text style={[styles.miniVal, { color: colors.text }]}>{data?.correctAnswers || 0}</Text>
            <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Correct</Text>
          </View>
        </View>

        {data?.subjectBreakdown && Object.keys(data.subjectBreakdown).length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>By Subject</Text>
            {Object.entries(data.subjectBreakdown).map(([subject, stats]: any) => (
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
          </>
        )}

        {data?.tasks && data.tasks.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks</Text>
            {data.tasks
              .sort((a: any, b: any) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
              .map((t: any) => {
                const isOpen = expandedTask === t.id;
                return (
                  <View key={t.id} style={styles.taskWrapper}>
                    <TouchableOpacity
                      style={[styles.taskRow, { backgroundColor: colors.card }, isOpen && styles.taskRowOpen]}
                      onPress={() => setExpandedTask(isOpen ? null : t.id)}
                    >
                      <View style={styles.taskLeft}>
                        <View style={[styles.taskSubjectBadge, { backgroundColor: colors.primary + "18" }]}>
                          <Text style={[styles.taskSubjectText, { color: colors.primary }]} numberOfLines={1}>
                            {t.subject || "Task"}
                          </Text>
                        </View>
                        <View style={styles.taskInfo}>
                          <Text style={[styles.taskDesc, { color: colors.text }]} numberOfLines={1}>
                            {t.description}
                          </Text>
                          <Text style={[styles.taskDate, { color: colors.textSecondary }]}>
                            {new Date(t.sessionDate).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.taskRight}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: t.status === "COMPLETED" ? colors.success + "22" : colors.warning + "22" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: t.status === "COMPLETED" ? colors.success : colors.warning },
                            ]}
                          >
                            {t.status === "COMPLETED" ? "Done" : "Pending"}
                          </Text>
                        </View>
                        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
                      </View>
                    </TouchableOpacity>

                    {isOpen && t.questions && t.questions.length > 0 && (
                      <View style={[styles.questionsWrap, { backgroundColor: colors.inputBg }]}>
                        {t.questions.map((q: any) => {
                          const ans = q.answers?.[0];
                          return (
                            <View key={q.id} style={styles.qCard}>
                              <View style={styles.qHeader}>
                                <View style={[styles.qTypeBg, { backgroundColor: colors.primary + "18" }]}>
                                  <Text style={[styles.qType, { color: colors.primary }]}>
                                    {q.type === "MCQ" ? "MCQ" : "Voice"}
                                  </Text>
                                </View>
                                <Text style={[styles.qText, { color: colors.text }]}>{q.questionText}</Text>
                              </View>
                              {ans && (
                                <View style={styles.ansRow}>
                                  <Ionicons
                                    name={ans.isCorrect ? "checkmark-circle" : "close-circle"}
                                    size={18}
                                    color={ans.isCorrect ? colors.success : colors.danger}
                                  />
                                  <Text style={[styles.ansText, { color: colors.textSecondary }]} numberOfLines={2}>
                                    {q.type === "MCQ" ? ans.answer : `Score: ${ans.score}`}
                                  </Text>
                                </View>
                              )}
                              {ans?.feedback && (
                                <Text style={[styles.feedbackText, { color: colors.textMuted }]}>{ans.feedback}</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
          </>
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
    paddingTop: 40,
  },
  backBtn: { width: 28 },
  title: { fontSize: 20, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 40 },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  presetBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  presetText: { fontSize: 13, fontWeight: "600" },
  calendarToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  calendarToggleText: { flex: 1, fontSize: 14, fontWeight: "500" },
  calendarWrap: { borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  cardsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  card: { flex: 1, padding: 20, borderRadius: 12, alignItems: "center" },
  cardValue: { fontSize: 32, fontWeight: "700" },
  cardLabel: { fontSize: 14, marginTop: 4 },
  cardMini: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
  miniVal: { fontSize: 20, fontWeight: "700" },
  miniLabel: { fontSize: 11, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 20, marginBottom: 12 },
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
  taskWrapper: { marginBottom: 8 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  taskRowOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  taskLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  taskRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  taskSubjectBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  taskSubjectText: { fontSize: 11, fontWeight: "700", maxWidth: 60 },
  taskInfo: { flex: 1 },
  taskDesc: { fontSize: 14, fontWeight: "500" },
  taskDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  questionsWrap: {
    padding: 12,
    borderRadius: 10,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  qCard: { marginBottom: 10 },
  qHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  qTypeBg: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  qType: { fontSize: 10, fontWeight: "700" },
  qText: { fontSize: 13, flex: 1 },
  ansRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  ansText: { fontSize: 13, flex: 1 },
  feedbackText: { fontSize: 12, marginTop: 4, lineHeight: 16, fontStyle: "italic" },
});
