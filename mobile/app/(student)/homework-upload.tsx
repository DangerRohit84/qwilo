import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import api, { invalidateCache } from "../../services/api";

import { useTheme } from "../../contexts/ThemeContext";

export default function HomeworkUploadScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed to take photos. Please enable it in Settings.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert("Camera Error", "Could not open camera. Please check camera permissions in Settings.");
    }
  }

  async function pickFromGallery() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Storage permission is needed to access photos. Please enable it in Settings.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert("Gallery Error", "Could not open gallery. Please check storage permissions in Settings.");
    }
  }

  async function uploadAndProcess() {
    if (!image) return;
    setLoading(true);
    try {
      const formData = new FormData();
      if (Platform.OS === "web") {
        const response = await fetch(image);
        const blob = await response.blob();
        const file = new File([blob], "homework.jpg", { type: "image/jpeg" });
        formData.append("image", file);
      } else {
        formData.append("image", {
          uri: image,
          type: "image/jpeg",
          name: "homework.jpg",
        } as any);
      }

      const { data: session } = await api.post("/student/homework", formData);

      await api.post(`/student/homework/${session.id}/process`);

      invalidateCache("student/tasks");
      invalidateCache("student/history");
      router.replace("/(student)/(tabs)");
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Failed to process homework";
      Alert.alert("Upload Failed", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Upload Homework</Text>
        <View style={{ width: 28 }} />
      </View>

      {image ? (
        <View style={styles.preview}>
          <Image source={{ uri: image }} style={styles.image} />
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.retakeBtn, { borderColor: colors.primary }]}
              onPress={() => setImage(null)}
            >
              <Ionicons name="refresh" size={20} color={colors.primary} />
              <Text style={[styles.retakeText, { color: colors.primary }]}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.processBtn, { backgroundColor: colors.primary }]}
              onPress={uploadAndProcess}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.processText}>Process</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.options}>
          <TouchableOpacity style={[styles.optionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickImage}>
            <Ionicons name="camera" size={40} color={colors.primary} />
            <Text style={[styles.optionText, { color: colors.textSecondary }]}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.optionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickFromGallery}>
            <Ionicons name="images" size={40} color={colors.primary} />
            <Text style={[styles.optionText, { color: colors.textSecondary }]}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 60,
  },
  title: { fontSize: 20, fontWeight: "700" },
  options: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    padding: 24,
  },
  optionBtn: {
    width: "100%",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  optionText: { fontSize: 16, fontWeight: "600", marginTop: 12 },
  preview: { flex: 1, padding: 24 },
  image: { flex: 1, borderRadius: 12, marginBottom: 16 },
  actionRow: { flexDirection: "row", gap: 12 },
  retakeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  retakeText: { fontSize: 16, fontWeight: "600" },
  processBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  processText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
