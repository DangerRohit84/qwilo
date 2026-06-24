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
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import api from "../../../../services/api";
import { Task } from "../../../../types";
import { useTheme } from "../../../../contexts/ThemeContext";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workImages, setWorkImages] = useState<string[]>([]);

  useEffect(() => {
    api.get(`/student/tasks/${id}`).then(({ data }) => {
      setTask(data);
    }).catch(() => {
      Alert.alert("Error", "Failed to load task");
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  async function pickWorkImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      if (!result.canceled) {
        setWorkImages((prev) => [
          ...prev,
          ...result.assets.map((a) => a.uri),
        ]);
      }
    } catch (err: any) {
      Alert.alert("Gallery Error", "Could not open gallery. Please check storage permissions in Settings.");
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
      for (let i = 0; i < workImages.length; i++) {
        const uri = workImages[i];
        if (Platform.OS === "web") {
          const response = await fetch(uri);
          const blob = await response.blob();
          const file = new File([blob], `work-${i}.jpg`, { type: "image/jpeg" });
          formData.append("images", file);
        } else {
          formData.append("images", {
            uri,
            type: "image/jpeg",
            name: `work-${i}.jpg`,
          } as any);
        }
      }

      const { data } = await api.post(
        `/student/tasks/${id}/submit`,
        formData
      );

      router.push(`/(student)/tasks/${id}/questions`);
    } catch (err: any) {
      console.log("Submit error:", err.response?.status, err.response?.data, err.message);
      Alert.alert(
        "Error",
        `Status: ${err.response?.status}\n${err.response?.data?.error || err.message || "Failed to submit"}`
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text }}>Task not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
         <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Task Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.taskInfo, { backgroundColor: colors.card }]}>
          <Text style={[styles.taskType, { color: colors.primary }]}>{task.type}</Text>
          <Text style={[styles.taskSubject, { color: colors.text }]}>{task.subject}</Text>
          <Text style={[styles.taskDesc, { color: colors.textSecondary }]}>{task.description}</Text>
        </View>

        {task.status === "PENDING" ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Upload Your Work</Text>
            <TouchableOpacity
              style={[styles.addImageBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={pickWorkImage}
            >
              <Ionicons name="add-circle" size={32} color={colors.primary} />
              <Text style={[styles.addImageText, { color: colors.primary }]}>Add Photos</Text>
            </TouchableOpacity>

            <View style={styles.imageGrid}>
              {workImages.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.thumb} />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
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
          <>
            <View style={[styles.submittedInfo, { backgroundColor: "#FFF7ED", borderColor: "#F59E0B" }]}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <Text style={[styles.submittedInfoText, { color: "#92400E" }]}>
                Work uploaded — answer the quiz to complete this task
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.questionBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/(student)/tasks/${id}/questions`)}
            >
              <Ionicons name="help-circle" size={24} color="#fff" />
              <Text style={styles.questionBtnText}>Answer Questions</Text>
            </TouchableOpacity>
          </>
        ) : task.status === "COMPLETED" ? (
          <View style={styles.completedBox}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={[styles.completedText, { color: colors.success }]}>Completed!</Text>
          </View>
        ) : null}
      </ScrollView>

      {task.status === "COMPLETED" && task.questions?.some(q => q.answers?.length) && (
        <View style={[styles.bottomBar, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.reviewBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/(student)/tasks/${id}/review`)}
          >
            <Ionicons name="eye" size={20} color="#fff" />
            <Text style={styles.reviewBtnText}>Review Answers</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 60,
  },
  title: { fontSize: 20, fontWeight: "700" },
  content: { flex: 1, padding: 24 },
  taskInfo: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  taskType: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  taskSubject: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  taskDesc: { fontSize: 15, marginTop: 8, lineHeight: 22 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  addImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: 8,
    marginBottom: 16,
  },
  addImageText: { fontSize: 16, fontWeight: "600" },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  thumb: { width: 100, height: 100, borderRadius: 8 },
  submitBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  questionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  questionBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  submittedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  submittedInfoText: { fontSize: 14, fontWeight: "500", flex: 1 },
  completedBox: { alignItems: "center", marginTop: 40 },
  completedText: { fontSize: 20, fontWeight: "700", marginTop: 12 },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  reviewBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  bottomBar: { padding: 16, paddingBottom: 32 },
});
