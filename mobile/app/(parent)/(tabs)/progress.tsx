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

export default function ParentProgressScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const [data, setData] = useState<any>(null);
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
        const { data: result } = await api.get("/parent/progress", { params });
        setData(result);

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
        console.error("Failed to fetch parent progress");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      applyPreset(preset);
    }, [])
  );

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

  const agg = data?.aggregated;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>All Children</Text>

        <View style={styles.presetRow}>
          {presets.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.presetBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                preset === p.key && {
                  backgroundColor: theme === "dark" ? "#4F46E5" : colors.primary,
                  borderColor: colors.primary,
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

        {agg && (
          <View style={styles.cardsRow}>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardValue, { color: colors.primary }]}>{agg.completionRate}%</Text>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Completion</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardValue, { color: colors.success }]}>{agg.accuracy}%</Text>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Accuracy</Text>
            </View>
          </View>
        )}

        {agg && (
          <View style={styles.cardsRow}>
            <View style={[styles.cardMini, { backgroundColor: colors.card }]}>
              <Text style={[styles.miniVal, { color: colors.text }]}>{agg.completedTasks}</Text>
              <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Tasks Done</Text>
            </View>
            <View style={[styles.cardMini, { backgroundColor: colors.card }]}>
              <Text style={[styles.miniVal, { color: colors.text }]}>{agg.correctAnswers}</Text>
              <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Correct</Text>
            </View>
          </View>
        )}

        {data?.children && data.children.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Per Child</Text>
            {data.children.map((child: any) => (
              <TouchableOpacity
                key={child.id}
                style={[styles.childRow, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/(parent)/child/${child.id}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{child.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.childInfo}>
                  <Text style={[styles.childName, { color: colors.text }]}>{child.name}</Text>
                  <Text style={[styles.childStat, { color: colors.textSecondary }]}>
                    {child.completedTasks}/{child.totalTasks} tasks · {child.accuracy}% accuracy
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {data?.children && data.children.length === 0 && (
          <View style={styles.emptyCenter}>
            <Ionicons name="analytics-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No children linked yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
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
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  childInfo: { flex: 1 },
  childName: { fontSize: 15, fontWeight: "600" },
  childStat: { fontSize: 12, marginTop: 2 },
  emptyCenter: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
});
