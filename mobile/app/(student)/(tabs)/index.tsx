import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import api from "../../../services/api";
import { getStoredUser } from "../../../services/auth";
import { TaskListResponse, User } from "../../../types";

import { useTheme } from "../../../contexts/ThemeContext";

export default function StudentDashboard() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<TaskListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchTasks() {
    try {
      const { data: tasks } = await api.get<TaskListResponse>(
        "/student/tasks"
      );
      setData(tasks);
    } catch (err) {
      console.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      const interval = setInterval(fetchTasks, 5000);
      return () => clearInterval(interval);
    }, [])
  );

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  const typeIcon = (type: string) => {
    switch (type) {
      case "READING":
        return "book";
      case "WRITING":
        return "create";
      case "MATH":
        return "calculator";
      default:
        return "document-text";
    }
  };

  function renderTask(item: any) {
    const isPending = item.status === "PENDING";
    return (
      <TouchableOpacity
        style={[
          styles.taskCard,
          { backgroundColor: colors.card },
          isPending ? styles.pending : styles.completed,
        ]}
        onPress={() => router.push(`/(student)/tasks/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={[styles.taskIconWrap, { backgroundColor: isPending ? "#EEF2FF" : "#ECFDF5" }]}>
          <Ionicons
            name={typeIcon(item.type)}
            size={20}
            color={isPending ? colors.primary : colors.success}
          />
        </View>
        <View style={styles.taskInfo}>
          <View style={styles.taskTop}>
            <Text style={[styles.taskSubject, { color: colors.text }]}>{item.subject || "Task"}</Text>
            <View style={[styles.taskStatusDot, { backgroundColor: isPending ? colors.warning : colors.success }]} />
          </View>
          <Text style={[styles.taskDesc, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const pendingCount = data?.pending?.length || 0;
  const completedCount = data?.completed?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image source={require("../../../assets/logo.png")} style={{ width: 34, height: 34, resizeMode: "contain" }} />
          <Text style={[styles.logoText, { color: colors.text }]}>Qwilo</Text>
        </View>
        <Text style={[styles.greeting, { color: colors.text }]}>
          Hi, {user?.name?.split(" ")[0] || "Student"}
        </Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <View style={styles.stats}>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNum, { color: colors.success }]}>
            {completedCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.uploadBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => router.push("/(student)/homework-upload")}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={22} color="#fff" />
        <Text style={styles.uploadBtnText}>Upload Homework</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Tasks</Text>

      <FlatList
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90, paddingHorizontal: 20 }}
        data={[...(data?.pending || []), ...(data?.completed || [])]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderTask(item)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTasks();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.card }]}>
              <Ionicons name="clipboard-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Upload your homework to get started!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  logoText: { fontSize: 20, fontWeight: "700", letterSpacing: 1 },
  greeting: { fontSize: 28, fontWeight: "800" },
  date: { fontSize: 14, marginTop: 4 },
  stats: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#13376D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statNum: { fontSize: 28, fontWeight: "700" },
  statLabel: { fontSize: 13, marginTop: 4, fontWeight: "500" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 14,
    gap: 10,
    marginBottom: 24,
    backgroundColor: "#13376D",
    elevation: 4,

    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  uploadBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    elevation: 2,
    shadowColor: "#13376D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    gap: 12,
  },
  pending: { opacity: 1 },
  completed: { opacity: 0.75 },
  taskIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  taskInfo: { flex: 1 },
  taskTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  taskSubject: { fontSize: 15, fontWeight: "600" },
  taskStatusDot: { width: 6, height: 6, borderRadius: 3 },
  taskDesc: { fontSize: 13, marginTop: 3 },
  empty: { alignItems: "center", marginTop: 60 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 20, justifyContent: "center", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
  emptyText: { fontSize: 15, marginTop: 16 },
});
