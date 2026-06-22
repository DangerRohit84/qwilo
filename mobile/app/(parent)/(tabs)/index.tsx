import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../services/api";
import { logout, getStoredUser } from "../../../services/auth";
import { User } from "../../../types";
import { useTheme } from "../../../contexts/ThemeContext";
import ConfirmModal from "../../../components/ConfirmModal";

function performanceLevel(accuracy: number): { label: string; color: string } {
  if (accuracy >= 80) return { label: "Excellent", color: "#10B981" };
  if (accuracy >= 60) return { label: "Good", color: "#F59E0B" };
  if (accuracy >= 1) return { label: "Needs Work", color: "#EF4444" };
  return { label: "No Data", color: "#6B7280" };
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return "#10B981";
  if (accuracy >= 60) return "#F59E0B";
  return "#EF4444";
}

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

export default function ParentDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [aggregated, setAggregated] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const [preset, setPreset] = useState<Preset>("today");

  async function fetchProgress(p: Preset) {
    setLoading(true);
    const range = getPresetRange(p);
    const params: any = {};
    if (range.startDate) params.startDate = range.startDate.toISOString();
    if (range.endDate) params.endDate = range.endDate.toISOString();
    try {
      const { data } = await api.get("/parent/progress", { params });
      setChildren(data.children || []);
      setAggregated(data.aggregated || null);
    } catch (err) {
      console.error("Failed to fetch progress");
    }
    setLoading(false);
  }

  useEffect(() => {
    getStoredUser().then(setUser);
    fetchProgress("today");
  }, []);

  const presets: { key: Preset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" },
  ];

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
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            <Ionicons name="book" size={20} color="#fff" />
          </View>
          <Text style={[styles.logoText, { color: colors.text }]}>Qwilo</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Hi, {user?.name?.split(" ")[0] || "Parent"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your Children</Text>
        </View>

        {aggregated && children.length > 1 && (
          <View style={[styles.aggRow, { backgroundColor: colors.inputBg }]}>
            <View style={styles.aggItem}>
              <Text style={[styles.aggValue, { color: colors.primary }]}>{aggregated.completionRate}%</Text>
              <Text style={[styles.aggLabel, { color: colors.textSecondary }]}>Completion</Text>
            </View>
            <View style={styles.aggDivider} />
            <View style={styles.aggItem}>
              <Text style={[styles.aggValue, { color: getAccuracyColor(aggregated.accuracy) }]}>{aggregated.accuracy}%</Text>
              <Text style={[styles.aggLabel, { color: colors.textSecondary }]}>Accuracy</Text>
            </View>
            <View style={styles.aggDivider} />
            <View style={styles.aggItem}>
              <Text style={[styles.aggValue, { color: colors.text }]}>{aggregated.completedTasks}/{aggregated.totalTasks}</Text>
              <Text style={[styles.aggLabel, { color: colors.textSecondary }]}>Tasks</Text>
            </View>
          </View>
        )}
      </View>

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

      {children.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No children linked yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View style={styles.presetRow}>
            {presets.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.presetBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  preset === p.key && { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
                ]}
                onPress={() => { setPreset(p.key); fetchProgress(p.key); }}
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
                    <Text style={[styles.childEmail, { color: colors.textSecondary }]}>{child.email}</Text>
                  </View>
                  <View style={[styles.perfBadge, { backgroundColor: level.color + "22" }]}>
                    <Text style={[styles.perfText, { color: level.color }]}>{level.label}</Text>
                  </View>
                </View>

                <View style={styles.mainStats}>
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{child.completionRate}%</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completion</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: accColor }]}>{child.accuracy}%</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Accuracy</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{child.completedTasks}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tasks Done</Text>
                  </View>
                </View>

                {(child.totalQuestions ?? 0) > 0 && (
                  <View style={[styles.questionRow, { backgroundColor: colors.inputBg }]}>
                    <Ionicons name="help-buoy" size={16} color={colors.primary} />
                    <Text style={[styles.questionText, { color: colors.textSecondary }]}>
                      Questions: {child.correctAnswers}/{child.totalQuestions} correct
                    </Text>
                    <Text style={[styles.questionPct, { color: accColor, fontWeight: "700" }]}>
                      ({child.accuracy}%)
                    </Text>
                  </View>
                )}

                {child.subjectBreakdown && Object.keys(child.subjectBreakdown).length > 0 && (
                  <View style={styles.subjectSection}>
                    <Text style={[styles.subjectSectionTitle, { color: colors.textMuted }]}>By Subject</Text>
                    {Object.entries(child.subjectBreakdown as Record<string, { total: number; completed: number }>)
                      .sort(([, a], [, b]) => (b.completed / b.total) - (a.completed / a.total))
                      .slice(0, 4)
                      .map(([subject, stats]) => {
                        const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                        return (
                          <View key={subject} style={styles.subjectRow}>
                            <Text style={[styles.subjectName, { color: colors.text }]}>{subject}</Text>
                            <View style={[styles.subjectBar, { backgroundColor: colors.bg }]}>
                              <View
                                style={[
                                  styles.subjectFill,
                                  { width: `${pct}%`, backgroundColor: getAccuracyColor(pct) },
                                ]}
                              />
                            </View>
                            <Text style={[styles.subjectStat, { color: colors.textSecondary }]}>
                              {stats.completed}/{stats.total}
                            </Text>
                          </View>
                        );
                      })}
                    {Object.keys(child.subjectBreakdown).length > 4 && (
                      <Text style={[styles.moreSubjects, { color: colors.textMuted }]}>
                        +{Object.keys(child.subjectBreakdown).length - 4} more
                      </Text>
                    )}
                  </View>
                )}

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.tapHint, { color: colors.primary }]}>View full progress</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  logoBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center" },
  logoText: { fontSize: 18, fontWeight: "700", letterSpacing: 1 },
  headerContent: {},
  greeting: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: 4 },
  aggRow: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    alignItems: "center",
  },
  aggItem: { flex: 1, alignItems: "center" },
  aggValue: { fontSize: 18, fontWeight: "700" },
  aggLabel: { fontSize: 10, marginTop: 2 },
  aggDivider: { width: 1, height: 32, backgroundColor: "#D1D5DB", opacity: 0.4 },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  presetBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  presetText: { fontSize: 13, fontWeight: "600" },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  emptyText: { fontSize: 16, marginTop: 12 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  cardInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: "600" },
  childEmail: { fontSize: 12, marginTop: 2 },
  perfBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  perfText: { fontSize: 11, fontWeight: "700" },
  mainStats: { flexDirection: "row", gap: 12, marginBottom: 12 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 4 },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  questionText: { fontSize: 13, flex: 1 },
  questionPct: { fontSize: 13 },
  subjectSection: {
    marginBottom: 12,
  },
  subjectSectionTitle: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  subjectName: { width: 60, fontSize: 12, fontWeight: "500" },
  subjectBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  subjectFill: { height: "100%", borderRadius: 3 },
  subjectStat: { width: 36, textAlign: "right", fontSize: 11 },
  moreSubjects: { fontSize: 11, marginTop: 2, fontStyle: "italic" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  tapHint: { fontSize: 13, fontWeight: "600" },
});
