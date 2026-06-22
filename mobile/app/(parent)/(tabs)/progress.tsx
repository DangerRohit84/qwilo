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
import { useTheme } from "../../../contexts/ThemeContext";

type Preset = "today" | "week" | "month" | "all";

function getPresetRange(preset: Preset) {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  switch (preset) {
    case "today":
      return {
        startDate: todayUTC,
        endDate: new Date(todayUTC.getTime() + 86400000 - 1),
      };
    case "week": {
      const day = now.getDay();
      const mondayOffset = day === 0 ? 6 : day - 1;
      const monday = new Date(todayUTC.getTime() - mondayOffset * 86400000);
      const sunday = new Date(monday.getTime() + 6 * 86400000 + 86400000 - 1);
      return { startDate: monday, endDate: sunday };
    }
    case "month": {
      const first = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const last = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
      return { startDate: first, endDate: last };
    }
    default:
      return { startDate: undefined, endDate: undefined };
  }
}

export default function ParentProgressScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("today");

  async function fetchChildren(p: Preset) {
    setLoading(true);
    const range = getPresetRange(p);
    const params: any = {};
    if (range.startDate) params.startDate = range.startDate.toISOString();
    if (range.endDate) params.endDate = range.endDate.toISOString();
    try {
      const { data } = await api.get("/parent/progress", { params });
      setChildren(data.children || []);
    } catch (err) {
      console.error("Failed to fetch children progress");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchChildren("today");
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Select a Child</Text>

        <View style={styles.presetRow}>
          {presets.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.presetBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                preset === p.key && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => { setPreset(p.key); fetchChildren(p.key); }}
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

        {children.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="analytics-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No children linked yet</Text>
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
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  presetBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  presetText: { fontSize: 13, fontWeight: "600" },
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
