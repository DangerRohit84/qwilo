import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Calendar } from "react-native-calendars";
import api from "../../../services/api";
import { StudentProgress } from "../../../types";
import { useTheme } from "../../../contexts/ThemeContext";

export default function ProgressScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);

  function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function updateMarkedDates(dateStr: string | null, taskList: any[]) {
    const marks: Record<string, any> = {};
    for (const t of taskList) {
      const d = t.sessionDate.split("T")[0];
      if (!marks[d]) {
        marks[d] = {
          marked: true,
          dotColor: t.status === "COMPLETED" ? "#10B981" : "#F59E0B",
        };
      }
      if (t.status === "COMPLETED") {
        marks[d].dotColor = "#10B981";
      }
    }
    if (dateStr) {
      marks[dateStr] = {
        ...marks[dateStr],
        selected: true,
        selectedColor: colors.primary,
      };
    }
    setMarkedDates(marks);
  }

  function filterByDate(list: any[], dateStr: string) {
    const start = new Date(dateStr + "T00:00:00.000Z").getTime();
    const end = new Date(dateStr + "T23:59:59.999Z").getTime();
    return list.filter((t) => {
      const d = new Date(t.sessionDate).getTime();
      return d >= start && d <= end;
    });
  }

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result } = await api.get<StudentProgress>("/student/history");

      const all = result.tasks || [];
      all.sort(
        (a: any, b: any) =>
          new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
      );
      setAllTasks(all);

      const todayStr = getTodayStr();
      updateMarkedDates(todayStr, all);
      setSelectedDate(todayStr);
      selectedRef.current = todayStr;
      setTasks(filterByDate(all, todayStr));
    } catch (err) {
      console.log("Progress fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchProgress(); }, []));

  function computeStats(list: any[]) {
    const totalTasks = list.length;
    const completedTasks = list.filter((t) => t.status === "COMPLETED").length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let totalQuestions = 0;
    let correctAnswers = 0;
    const subjectBreakdown: Record<string, { total: number; completed: number }> = {};

    for (const t of list) {
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
    };
  }

  const filteredStats = computeStats(tasks);

  function onDayPress(day: { dateString: string }) {
    setSelectedDate(day.dateString);
    selectedRef.current = day.dateString;
    updateMarkedDates(day.dateString, allTasks);
    setTasks(filterByDate(allTasks, day.dateString));
  }

  function onMonthPress() {
    setSelectedDate(null);
    selectedRef.current = null;
    updateMarkedDates(null, allTasks);
    setTasks(allTasks);
  }

  if (loading && allTasks.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>My Progress</Text>

        <TouchableOpacity
          style={styles.calendarToggle}
          onPress={() => setShowCalendar(!showCalendar)}
        >
          <Ionicons
            name={showCalendar ? "chevron-up" : "calendar"}
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.calendarToggleText, { color: colors.primary }]}>
            {selectedDate
              ? new Date(selectedDate + "T00:00:00").toLocaleDateString()
              : new Date().toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {showCalendar && (
          <View style={[styles.calendarWrap, { backgroundColor: colors.card }]}>
            <Calendar key={theme}
              current={getTodayStr()}
              onDayPress={onDayPress}
              onMonthChange={onMonthPress}
              markedDates={markedDates}
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
                textMonthFontWeight: "700",
                textDayFontSize: 14,
              }}
            />
          </View>
        )}

        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.cardVal, { color: colors.text }]}>{filteredStats.completionRate}%</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Completion</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.cardVal, { color: colors.text }]}>{filteredStats.accuracy}%</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Accuracy</Text>
          </View>
        </View>

        <View style={styles.miniRow}>
          <View style={[styles.miniCard, { backgroundColor: colors.card }]}>
            <Ionicons name="checkmark-done" size={20} color={colors.success} />
            <Text style={[styles.miniVal, { color: colors.text }]}>{filteredStats.totalTasks}</Text>
            <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Tasks</Text>
          </View>
          <View style={[styles.miniCard, { backgroundColor: colors.card }]}>
            <Ionicons name="help-circle" size={20} color={colors.primary} />
            <Text style={[styles.miniVal, { color: colors.text }]}>{filteredStats.totalQuestions}</Text>
            <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Questions</Text>
          </View>
          <View style={[styles.miniCard, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar" size={20} color={colors.warning} />
            <Text style={[styles.miniVal, { color: colors.text }]}>{filteredStats.completedTasks}</Text>
            <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Sessions</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>By Subject</Text>
        {filteredStats.subjectBreakdown && Object.keys(filteredStats.subjectBreakdown).length > 0 ? (
          Object.entries(filteredStats.subjectBreakdown).map(([subject, stats]) => {
            const pct =
              stats.total > 0
                ? Math.round((stats.completed / stats.total) * 100)
                : 0;
            return (
              <View key={subject} style={styles.subjectRow}>
                <Text style={[styles.subjectName, { color: colors.textSecondary }]}>{subject}</Text>
                <View style={[styles.subjectBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[styles.subjectFill, { width: `${pct}%`, backgroundColor: colors.primary }]}
                  />
                </View>
                <Text style={[styles.subjectStat, { color: colors.textSecondary }]}>
                  {stats.completed}/{stats.total}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data for this period</Text>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks</Text>
        {tasks.length > 0 ? (
          tasks.map((t: any) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.taskRow, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/(student)/tasks/${t.id}`)}
            >
              <View style={styles.taskLeft}>
                <Ionicons
                  name={
                    t.status === "COMPLETED"
                      ? "checkmark-circle"
                      : t.status === "SUBMITTED"
                      ? "time-outline"
                      : "ellipse-outline"
                  }
                  size={18}
                  color={
                    t.status === "COMPLETED"
                      ? colors.success
                      : t.status === "SUBMITTED"
                      ? colors.warning
                      : colors.textMuted
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskDesc, { color: colors.text }]} numberOfLines={2}>
                    {t.description}
                  </Text>
                  <Text style={[styles.taskMeta, { color: colors.textMuted }]}>
                    {t.subject} &middot;{" "}
                    {new Date(t.sessionDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Text style={[styles.taskStatus, { color: colors.textSecondary }]}>
                {t.status === "COMPLETED"
                  ? "Done"
                  : t.status === "SUBMITTED"
                  ? "Submitted"
                  : "Pending"}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tasks in this period</Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 20,
  },
  calendarToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
  },
  calendarToggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  calendarWrap: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  cardsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardVal: { fontSize: 32, fontWeight: "800" },
  cardLabel: { fontSize: 13, marginTop: 4, fontWeight: "600" },
  miniRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  miniCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    gap: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  miniVal: { fontSize: 20, fontWeight: "700" },
  miniLabel: { fontSize: 11, fontWeight: "600" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  subjectName: {
    width: 80,
    fontSize: 14,
    fontWeight: "600",
  },
  subjectBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  subjectFill: { height: "100%", borderRadius: 4 },
  subjectStat: {
    width: 50,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 8 },
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
  taskDesc: { fontSize: 14, fontWeight: "500" },
  taskMeta: { fontSize: 12, marginTop: 2 },
  taskStatus: { fontSize: 12, fontWeight: "600", marginLeft: 8 },
});
