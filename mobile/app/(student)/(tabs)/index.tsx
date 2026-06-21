import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../services/api";
import { getStoredUser } from "../../../services/auth";
import { TaskListResponse, User } from "../../../types";

export default function StudentDashboard() {
  const router = useRouter();
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
        style={[styles.taskCard, isPending ? styles.pending : styles.completed]}
        onPress={() => router.push(`/(student)/tasks/${item.id}`)}
      >
        <View style={styles.taskLeft}>
          <Ionicons
            name={typeIcon(item.type)}
            size={24}
            color={isPending ? "#4F46E5" : "#10B981"}
          />
          <View style={styles.taskInfo}>
            <Text style={styles.taskSubject}>{item.subject || "Task"}</Text>
            <Text style={styles.taskDesc} numberOfLines={1}>
              {item.description}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isPending ? "ellipse-outline" : "checkmark-circle"}
          size={24}
          color={isPending ? "#D1D5DB" : "#10B981"}
        />
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const pendingCount = data?.pending?.length || 0;
  const completedCount = data?.completed?.length || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hi, {user?.name?.split(" ")[0] || "Student"}
        </Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: "#10B981" }]}>
            {completedCount}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.uploadBtn}
        onPress={() => router.push("/(student)/homework-upload")}
      >
        <Ionicons name="camera" size={24} color="#fff" />
        <Text style={styles.uploadBtnText}>Upload Homework</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Today's Tasks</Text>

      <FlatList
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
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              Upload your homework to get started!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  greeting: { fontSize: 26, fontWeight: "800", color: "#111827" },
  date: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  stats: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNum: { fontSize: 28, fontWeight: "700", color: "#4F46E5" },
  statLabel: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  uploadBtnText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  pending: { borderLeftWidth: 3, borderLeftColor: "#4F46E5" },
  completed: { borderLeftWidth: 3, borderLeftColor: "#10B981", opacity: 0.7 },
  taskLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  taskInfo: { flex: 1 },
  taskSubject: { fontSize: 14, fontWeight: "600", color: "#111827" },
  taskDesc: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { color: "#9CA3AF", fontSize: 16, marginTop: 12 },
});
