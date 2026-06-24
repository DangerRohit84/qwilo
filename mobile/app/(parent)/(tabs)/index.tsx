import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Calendar } from "react-native-calendars";
import api from "../../../services/api";
import { logout, getStoredUser } from "../../../services/auth";
import { User } from "../../../types";
import { useTheme } from "../../../contexts/ThemeContext";
import ConfirmModal from "../../../components/ConfirmModal";

function performanceLevel(accuracy: number): { label: string; color: string } {
  if (accuracy >= 80) return { label: "Excellent", color: "#10B981" };
  if (accuracy >= 60) return { label: "Good", color: "#F59E0B" };
  if (accuracy >= 1) return { label: "Needs Work", color: "#EF4444" };
  return { label: "No Data", color: "#A5B4FC" };
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return "#10B981";
  if (accuracy >= 60) return "#F59E0B";
  return "#EF4444";
}

export default function ParentDashboard() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [aggregated, setAggregated] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);

  function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  const fetchProgress = useCallback(async (startDate?: string, endDate?: string, initialDate?: string) => {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await api.get("/parent/progress", { params });
      setChildren(data.children || []);
      setAggregated(data.aggregated || null);

      const marks: Record<string, any> = {};
      (data.recentSessions || []).forEach((s: any) => {
        const dateStr = s.date.split("T")[0];
        marks[dateStr] = {
          marked: true,
          dotColor: s.status === "COMPLETED" ? "#10B981" : "#F59E0B",
        };
      });
      const highlightDate = initialDate || selectedRef.current;
      if (highlightDate) {
        marks[highlightDate] = {
          ...marks[highlightDate],
          selected: true,
          selectedColor: colors.primary,
        };
      }
      setMarkedDates(marks);
    } catch (err) {
      console.error("Failed to fetch progress");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getStoredUser().then(setUser).catch(() => {});
    const todayStr = getTodayStr();
    setSelectedDate(todayStr);
    selectedRef.current = todayStr;
    fetchProgress(undefined, undefined, todayStr);
  }, []);

  function onDayPress(day: { dateString: string }) {
    setSelectedDate(day.dateString);
    selectedRef.current = day.dateString;
    setLoading(true);
    const start = new Date(day.dateString + "T00:00:00.000Z").toISOString();
    const end = new Date(day.dateString + "T23:59:59.999Z").toISOString();
    fetchProgress(start, end);
  }

  function onMonthPress() {
    setSelectedDate(null);
    selectedRef.current = null;
    setLoading(true);
    fetchProgress();
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
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image source={require("../../../assets/logo.png")} style={{ width: 34, height: 34, resizeMode: "contain" }} />
          <Text style={[styles.logoText, { color: colors.text }]}>Qwilo</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Hi, {user?.name?.split(" ")[0] || "Parent"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your Children</Text>
        </View>
      </View>

      {aggregated && children.length > 1 && (
        <View style={[styles.aggBar, { backgroundColor: colors.card }]}>
          <View style={styles.aggItem}>
            <Text style={[styles.aggValue, { color: colors.primary }]}>{aggregated.completionRate}%</Text>
            <Text style={[styles.aggLabel, { color: colors.textSecondary }]}>Completion</Text>
          </View>
          <View style={styles.aggDiv} />
          <View style={styles.aggItem}>
            <Text style={[styles.aggValue, { color: getAccuracyColor(aggregated.accuracy) }]}>{aggregated.accuracy}%</Text>
            <Text style={[styles.aggLabel, { color: colors.textSecondary }]}>Accuracy</Text>
          </View>
          <View style={styles.aggDiv} />
          <View style={styles.aggItem}>
            <Text style={[styles.aggValue, { color: colors.text }]}>{aggregated.completedTasks}/{aggregated.totalTasks}</Text>
            <Text style={[styles.aggLabel, { color: colors.textSecondary }]}>Tasks</Text>
          </View>
        </View>
      )}

      <ConfirmModal
        visible={showLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setShowLogout(false);
          await logout();
          router.replace("/(auth)");
        }}
        onCancel={() => setShowLogout(false)}
      />

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
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.card }]}>
            <Ionicons name="people-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No children linked yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {children.map((child) => {
            const level = performanceLevel(child.accuracy);
            const accColor = getAccuracyColor(child.accuracy);
            return (
              <TouchableOpacity
                key={child.id}
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/(parent)/child/${child.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: level.color }]}>
                    <Text style={styles.avatarText}>{child.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.childName, { color: colors.text }]}>{child.name}</Text>
                    <Text style={[styles.childEmail, { color: colors.textMuted }]}>{child.email}</Text>
                  </View>
                  <View style={[styles.perfBadge, { backgroundColor: level.color + "18" }]}>
                    <Text style={[styles.perfText, { color: level.color }]}>{level.label}</Text>
                  </View>
                </View>

                <View style={styles.mainStats}>
                  <View style={styles.statCol}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{child.completionRate}%</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completion</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={[styles.statValue, { color: accColor }]}>{child.accuracy}%</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Accuracy</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{child.completedTasks}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tasks</Text>
                  </View>
                </View>

                {(child.totalQuestions ?? 0) > 0 && (
                  <View style={[styles.qRow, { backgroundColor: colors.inputBg }]}>
                    <Ionicons name="bulb" size={15} color={accColor} />
                    <Text style={[styles.qText, { color: colors.textSecondary }]}>
                      {child.correctAnswers}/{child.totalQuestions} correct
                    </Text>
                    <View style={[styles.qPill, { backgroundColor: accColor + "18" }]}>
                      <Text style={[styles.qPillText, { color: accColor }]}>{child.accuracy}%</Text>
                    </View>
                  </View>
                )}

                {child.subjectBreakdown && Object.keys(child.subjectBreakdown).length > 0 && (
                  <View style={styles.subjSection}>
                    <Text style={[styles.subjTitle, { color: colors.textMuted }]}>Subjects</Text>
                    {Object.entries(child.subjectBreakdown as Record<string, { total: number; completed: number }>)
                      .sort(([, a], [, b]) => (b.completed / b.total) - (a.completed / a.total))
                      .slice(0, 4)
                      .map(([subject, stats]) => {
                        const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                        return (
                          <View key={subject} style={styles.subjRow}>
                            <Text style={[styles.subjName, { color: colors.text }]}>{subject}</Text>
                            <View style={[styles.subjBar, { backgroundColor: colors.bg }]}>
                              <View style={[styles.subjFill, { width: `${pct}%`, backgroundColor: getAccuracyColor(pct) }]} />
                            </View>
                            <Text style={[styles.subjStat, { color: colors.textSecondary }]}>{stats.completed}/{stats.total}</Text>
                          </View>
                        );
                      })}
                    {Object.keys(child.subjectBreakdown).length > 4 && (
                      <Text style={[styles.moreSubj, { color: colors.textMuted }]}>+{Object.keys(child.subjectBreakdown).length - 4} more</Text>
                    )}
                  </View>
                )}

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.footerText, { color: colors.primary }]}>View full progress</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  logoText: { fontSize: 18, fontWeight: "700", letterSpacing: 1 },
  headerContent: {},
  greeting: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: 2 },
  aggBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#13376D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  aggItem: { flex: 1, alignItems: "center" },
  aggValue: { fontSize: 18, fontWeight: "700" },
  aggLabel: { fontSize: 10, marginTop: 2, fontWeight: "500" },
  aggDiv: { width: 1, height: 28, backgroundColor: "#E0E7FF" },
  emptyCenter: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 80 },
  calendarToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  calendarToggleText: { flex: 1, fontSize: 14, fontWeight: "500" },
  calendarWrap: { marginHorizontal: 20, borderRadius: 12, overflow: "hidden", marginBottom: 12 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 20, justifyContent: "center", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
  emptyText: { fontSize: 15, marginTop: 16 },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#13376D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  cardInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: "600" },
  childEmail: { fontSize: 12, marginTop: 2 },
  perfBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  perfText: { fontSize: 11, fontWeight: "700" },
  mainStats: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCol: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 4, fontWeight: "500" },
  qRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, marginBottom: 12 },
  qText: { fontSize: 13, flex: 1 },
  qPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  qPillText: { fontSize: 11, fontWeight: "700" },
  subjSection: { marginBottom: 12 },
  subjTitle: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  subjRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  subjName: { width: 56, fontSize: 12, fontWeight: "500" },
  subjBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  subjFill: { height: "100%", borderRadius: 3 },
  subjStat: { width: 34, textAlign: "right", fontSize: 11 },
  moreSubj: { fontSize: 11, marginTop: 2, fontStyle: "italic" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, paddingTop: 12, borderTopWidth: 1 },
  footerText: { fontSize: 13, fontWeight: "600" },
});
