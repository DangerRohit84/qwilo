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
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Calendar } from "react-native-calendars";
import api from "../../../services/api";
import { useTheme } from "../../../contexts/ThemeContext";

function filterTasksByDate(tasks: any[], startDate?: Date, endDate?: Date) {
  if (!startDate || !endDate) return tasks;
  const start = startDate.getTime();
  const end = endDate.getTime();
  return tasks.filter((t) => {
    const d = new Date(t.sessionDate).getTime();
    return d >= start && d <= end;
  });
}

function computeStats(tasks: any[]) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let totalQuestions = 0;
  let correctAnswers = 0;
  const subjectBreakdown: Record<string, { total: number; completed: number }> = {};

  for (const t of tasks) {
    const subj = t.subject || "Other";
    if (!subjectBreakdown[subj]) subjectBreakdown[subj] = { total: 0, completed: 0 };
    subjectBreakdown[subj].total++;
    if (t.status === "COMPLETED") subjectBreakdown[subj].completed++;

    for (const q of t.questions || []) {
      totalQuestions++;
      const a = q.answers?.[0];
      if (a?.isCorrect) correctAnswers++;
    }
  }

  return {
    totalTasks,
    completedTasks,
    completionRate,
    totalQuestions,
    correctAnswers,
    accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
    subjectBreakdown,
    tasks,
  };
}

export default function ChildProgressScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: result } = await api.get(`/parent/children/${id}/progress`);
        setAllTasks(result.tasks || []);
        setAllSessions(result.recentSessions || []);

        const marks: Record<string, any> = {};
        (result.recentSessions || []).forEach((s: any) => {
          const dateStr = s.date.split("T")[0];
          marks[dateStr] = {
            marked: true,
            dotColor: s.status === "COMPLETED" ? "#10B981" : "#F59E0B",
          };
        });
        setMarkedDates(marks);

        setData(computeStats(result.tasks || []));
      } catch (err) {
        console.error("Failed to fetch child progress");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function onDayPress(day: { dateString: string }) {
    setSelectedDate(day.dateString);
    selectedRef.current = day.dateString;
    const start = new Date(day.dateString + "T00:00:00.000Z");
    const end = new Date(day.dateString + "T23:59:59.999Z");
    setData(computeStats(filterTasksByDate(allTasks, start, end)));
  }

  function onMonthPress() {
    setSelectedDate(null);
    selectedRef.current = null;
    setData(computeStats(allTasks));
  }

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
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <Calendar key={theme}
              theme={{
                backgroundColor: colors.card,
                calendarBackground: colors.card,
                dayTextColor: colors.text,
                monthTextColor: colors.text,
                textDisabledColor: colors.textMuted,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: "#fff",
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
              }}
              markedDates={markedDates}
              onDayPress={onDayPress}
              onMonthChange={onMonthPress}
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
              .map((t: any) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.taskRow, { backgroundColor: colors.card }]}
                  onPress={() => router.push(`/(parent)/sessions/${t.sessionId}?taskId=${t.id}`)}
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
                </TouchableOpacity>
              ))}
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
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  taskLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  taskSubjectBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  taskSubjectText: { fontSize: 11, fontWeight: "700", maxWidth: 60 },
  taskInfo: { flex: 1 },
  taskDesc: { fontSize: 14, fontWeight: "500" },
  taskDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
});
