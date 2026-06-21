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
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";

export default function HomeworkUploadScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
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
        formData.append("image", blob, "homework.jpg");
      } else {
        formData.append("image", {
          uri: image,
          type: "image/jpeg",
          name: "homework.jpg",
        } as any);
      }

      const { data: session } = await api.post("/student/homework", formData);

      await api.post(`/student/homework/${session.id}/process`);

      Alert.alert("Success", "Homework uploaded and processed!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to process homework"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Homework</Text>
        <View style={{ width: 28 }} />
      </View>

      {image ? (
        <View style={styles.preview}>
          <Image source={{ uri: image }} style={styles.image} />
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={() => setImage(null)}
            >
              <Ionicons name="refresh" size={20} color="#4F46E5" />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.processBtn}
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
          <TouchableOpacity style={styles.optionBtn} onPress={pickImage}>
            <Ionicons name="camera" size={40} color="#4F46E5" />
            <Text style={styles.optionText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionBtn} onPress={pickFromGallery}>
            <Ionicons name="images" size={40} color="#4F46E5" />
            <Text style={styles.optionText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#fff",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  options: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    padding: 24,
  },
  optionBtn: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  optionText: { fontSize: 16, fontWeight: "600", color: "#374151", marginTop: 12 },
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
    borderColor: "#4F46E5",
    gap: 8,
  },
  retakeText: { color: "#4F46E5", fontSize: 16, fontWeight: "600" },
  processBtn: {
    flex: 1,
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  processText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
