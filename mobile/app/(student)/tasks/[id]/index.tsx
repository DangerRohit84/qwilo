import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../../services/api";
import { Task } from "../../../../types";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workImages, setWorkImages] = useState<string[]>([]);

  useEffect(() => {
    api.get(`/student/tasks/${id}`).then(({ data }) => {
      setTask(data);
      setLoading(false);
    });
  }, [id]);

  async function pickWorkImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      setWorkImages((prev) => [
        ...prev,
        ...result.assets.map((a) => a.uri),
      ]);
    }
  }

  async function submitWork() {
    if (workImages.length === 0) {
      Alert.alert("Error", "Please upload at least one photo of your work");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      workImages.forEach((uri, i) => {
        formData.append("images", {
          uri,
          type: "image/jpeg",
          name: `work-${i}.jpg`,
        } as any);
      });

      const { data } = await api.post(
        `/student/tasks/${id}/submit`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (data.questionCount > 0) {
        router.push(`/(student)/tasks/${id}/questions`);
      } else {
        Alert.alert("Submitted", "Your work has been submitted!");
        router.back();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to submit"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text>Task not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Task Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskType}>{task.type}</Text>
          <Text style={styles.taskSubject}>{task.subject}</Text>
          <Text style={styles.taskDesc}>{task.description}</Text>
        </View>

        {task.status === "PENDING" ? (
          <>
            <Text style={styles.sectionLabel}>Upload Your Work</Text>
            <TouchableOpacity
              style={styles.addImageBtn}
              onPress={pickWorkImage}
            >
              <Ionicons name="add-circle" size={32} color="#4F46E5" />
              <Text style={styles.addImageText}>Add Photos</Text>
            </TouchableOpacity>

            <View style={styles.imageGrid}>
              {workImages.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.thumb} />
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={submitWork}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit Work</Text>
              )}
            </TouchableOpacity>
          </>
        ) : task.status === "SUBMITTED" ? (
          <TouchableOpacity
            style={styles.questionBtn}
            onPress={() => router.push(`/(student)/tasks/${id}/questions`)}
          >
            <Ionicons name="help-circle" size={24} color="#fff" />
            <Text style={styles.questionBtnText}>Answer Questions</Text>
          </TouchableOpacity>
        ) : task.status === "COMPLETED" ? (
          <View style={styles.completedBox}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.completedText}>Completed!</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#fff",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  content: { flex: 1, padding: 24 },
  taskInfo: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  taskType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  taskSubject: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  taskDesc: { fontSize: 15, color: "#6B7280", marginTop: 8, lineHeight: 22 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  addImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    gap: 8,
    marginBottom: 16,
  },
  addImageText: { fontSize: 16, color: "#4F46E5", fontWeight: "600" },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  thumb: { width: 100, height: 100, borderRadius: 8 },
  submitBtn: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  questionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  questionBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  completedBox: { alignItems: "center", marginTop: 40 },
  completedText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#10B981",
    marginTop: 12,
  },
});
