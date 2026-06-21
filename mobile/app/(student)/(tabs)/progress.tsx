import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import api from "../../../services/api";
import { StudentProgress } from "../../../types";

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

export default function ProgressScreen() {
  const [data, setData] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("all");
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);

  const fetchProgress = useCallback(
    async (startDate?: Date, endDate?: Date) => {
      setLoading(true);
      try {
        const params: any = {};
        if (startDate) params.startDate = startDate.toISOString();
        if (endDate) params.endDate = endDate.toISOString();
        const { data: result } = await api.get<StudentProgress>(
          "/student/history",
          { params }
        );
        setData(result);

        const marks: Record<string, any> = {};
        result.recentSessions.forEach((s) => {
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
        console.log("Progress fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      const range = getPresetRange(preset);
      fetchProgress(range.startDate, range.endDate);
    }, [preset])
  );

  function applyPreset(p: Preset) {
    setSelectedDate(null);
    selectedRef.current = null;
    setPreset(p);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Progress</Text>

        <View style={styles.presetRow}>
          {presets.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.presetBtn, preset === p.key && styles.presetActive]}
              onPress={() => applyPreset(p.key)}
            >
              <Text
                style={[
                  styles.presetText,
                  preset === p.key && styles.presetTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.calendarToggle}
          onPress={() => setShowCalendar(!showCalendar)}
        >
          <Ionicons
            name={showCalendar ? "chevron-up" : "calendar"}
            size={18}
            color="#4F46E5"
          />
          <Text style={styles.calendarToggleText}>
            {showCalendar ? "Hide Calendar" : "Pick a Date"}
          </Text>
        </TouchableOpacity>

        {showCalendar && (
          <View style={styles.calendarWrap}>
            <Calendar
              onDayPress={onDayPress}
              markedDates={markedDates}
              theme={{
                selectedDayBackgroundColor: "#4F46E5",
                todayTextColor: "#4F46E5",
                arrowColor: "#4F46E5",
                textMonthFontWeight: "700",
                textDayFontSize: 14,
              }}
            />
          </View>
        )}

        <View style={styles.cardsRow}>
          <View style={[styles.card, styles.cardPrimary]}>
            <Text style={styles.cardVal}>{data?.completionRate || 0}%</Text>
            <Text style={styles.cardLabel}>Completion</Text>
          </View>
          <View style={[styles.card, styles.cardSuccess]}>
            <Text style={styles.cardVal}>{data?.accuracy || 0}%</Text>
            <Text style={styles.cardLabel}>Accuracy</Text>
          </View>
        </View>

        <View style={styles.miniRow}>
          <View style={styles.miniCard}>
            <Ionicons name="checkmark-done" size={20} color="#10B981" />
            <Text style={styles.miniVal}>{data?.totalTasks || 0}</Text>
            <Text style={styles.miniLabel}>Tasks</Text>
          </View>
          <View style={styles.miniCard}>
            <Ionicons name="help-circle" size={20} color="#4F46E5" />
            <Text style={styles.miniVal}>{data?.totalQuestions || 0}</Text>
            <Text style={styles.miniLabel}>Questions</Text>
          </View>
          <View style={styles.miniCard}>
            <Ionicons name="calendar" size={20} color="#F59E0B" />
            <Text style={styles.miniVal}>{data?.totalSessions || 0}</Text>
            <Text style={styles.miniLabel}>Sessions</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>By Subject</Text>
        {data?.subjectBreakdown &&
          Object.entries(data.subjectBreakdown).length > 0 ? (
          Object.entries(data.subjectBreakdown).map(([subject, stats]) => {
            const pct =
              stats.total > 0
                ? Math.round((stats.completed / stats.total) * 100)
                : 0;
            return (
              <View key={subject} style={styles.subjectRow}>
                <Text style={styles.subjectName}>{subject}</Text>
                <View style={styles.subjectBar}>
                  <View
                    style={[styles.subjectFill, { width: `${pct}%` }]}
                  />
                </View>
                <Text style={styles.subjectStat}>
                  {stats.completed}/{stats.total}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No data for this period</Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  presetActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  presetText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  presetTextActive: { color: "#fff" },
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
    color: "#4F46E5",
  },
  calendarWrap: {
    backgroundColor: "#fff",
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
  cardPrimary: { backgroundColor: "#EEF2FF" },
  cardSuccess: { backgroundColor: "#F0FDF4" },
  cardVal: { fontSize: 32, fontWeight: "800", color: "#111827" },
  cardLabel: { fontSize: 13, color: "#6B7280", marginTop: 4, fontWeight: "600" },
  miniRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  miniCard: {
    flex: 1,
    backgroundColor: "#fff",
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
  miniVal: { fontSize: 20, fontWeight: "700", color: "#111827" },
  miniLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
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
    color: "#374151",
    fontWeight: "600",
  },
  subjectBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  subjectFill: { height: "100%", backgroundColor: "#4F46E5", borderRadius: 4 },
  subjectStat: {
    width: 50,
    textAlign: "right",
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  emptyText: { color: "#9CA3AF", fontSize: 14, textAlign: "center", marginTop: 8 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sessionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sessionDate: { fontSize: 14, color: "#374151", fontWeight: "500" },
  sessionTasks: { fontSize: 13, color: "#6B7280" },
});
