import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Calendar } from "react-native-calendars";
import api from "../../../services/api";
import { useTheme } from "../../../contexts/ThemeContext";

export default function ParentProgressScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const [allChildren, setAllChildren] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);

  function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function filterByDate(childList: any[], dateStr: string) {
    const start = new Date(dateStr + "T00:00:00.000Z").getTime();
    const end = new Date(dateStr + "T23:59:59.999Z").getTime();
    return childList.map((child: any) => {
      const tasks = (child.tasks || []).filter((t: any) => {
        const d = new Date(t.sessionDate).getTime();
        return d >= start && d <= end;
      });
      const completed = tasks.filter((t: any) => t.status === "COMPLETED").length;
      let totalQ = 0, correctQ = 0;
      for (const t of tasks) {
        for (const q of t.questions || []) {
          totalQ++;
          const a = q.answers?.[0];
          if (a?.isCorrect) correctQ++;
        }
      }
      return {
        ...child,
        totalTasks: tasks.length,
        completedTasks: completed,
        completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
        totalQuestions: totalQ,
        correctAnswers: correctQ,
        accuracy: totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0,
      };
    });
  }

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/parent/progress");
      setAllChildren(data.children || []);

      const marks: Record<string, any> = {};
      for (const child of data.children || []) {
        for (const t of child.tasks || []) {
          const dateStr = t.sessionDate.split("T")[0];
          if (!marks[dateStr]) {
            marks[dateStr] = {
              marked: true,
              dotColor: t.status === "COMPLETED" ? "#10B981" : "#F59E0B",
            };
          }
          if (t.status === "COMPLETED") {
            marks[dateStr].dotColor = "#10B981";
          }
        }
      }
      const todayStr = getTodayStr();
      marks[todayStr] = { ...marks[todayStr], selected: true, selectedColor: colors.primary };
      setMarkedDates(marks);

      setSelectedDate(todayStr);
      selectedRef.current = todayStr;
      setChildren(filterByDate(data.children || [], todayStr));
    } catch (err) {
      console.error("Failed to fetch progress");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProgress(); }, []);

  function updateMarks(dateStr: string | null) {
    setMarkedDates(prev => {
      const marks = { ...prev };
      Object.keys(marks).forEach(k => { marks[k] = { ...marks[k], selected: false }; });
      if (dateStr) {
        marks[dateStr] = { ...marks[dateStr], selected: true, selectedColor: colors.primary };
      }
      return marks;
    });
  }

  function onDayPress(day: { dateString: string }) {
    setSelectedDate(day.dateString);
    selectedRef.current = day.dateString;
    updateMarks(day.dateString);
    setChildren(filterByDate(allChildren, day.dateString));
  }

  function onMonthPress() {
    setSelectedDate(null);
    selectedRef.current = null;
    updateMarks(null);
    setChildren(allChildren);
  }

  if (loading && children.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Select a Child</Text>

        <TouchableOpacity
          style={[styles.calendarToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowCalendar(!showCalendar)}
        >
          <Ionicons name="calendar" size={18} color={colors.primary} />
          <Text style={[styles.calendarToggleText, { color: colors.textSecondary }]}>
            {selectedDate
              ? new Date(selectedDate + "T00:00:00").toLocaleDateString()
              : new Date().toLocaleDateString()}
          </Text>
          <Ionicons name={showCalendar ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {showCalendar && (
          <View style={[styles.calendarWrap, { backgroundColor: colors.card }]}>
            <Calendar key={theme}
              current={getTodayStr()}
              markedDates={markedDates}
              onDayPress={onDayPress}
              onMonthChange={onMonthPress}
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

        {children.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="analytics-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data for this period</Text>
          </View>
        ) : (
          children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/(parent)/child/${child.id}`)}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{child.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{child.name}</Text>
                <Text style={[styles.stat, { color: colors.textSecondary }]}>
                  {child.completedTasks}/{child.totalTasks} tasks · {child.accuracy}% accuracy
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  calendarToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  calendarToggleText: { flex: 1, fontSize: 14, fontWeight: "500" },
  calendarWrap: { borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  emptyCenter: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 16, marginTop: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600" },
  stat: { fontSize: 13, marginTop: 2 },
});
