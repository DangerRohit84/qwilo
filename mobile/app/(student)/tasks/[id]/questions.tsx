import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import api from "../../../../services/api";
import { Question } from "../../../../types";
import { useTheme } from "../../../../contexts/ThemeContext";

export default function QuestionsScreen() {
  const { id: taskId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    Audio.requestPermissionsAsync();
    loadQuestionWithRetry();
  }, []);

  async function loadQuestionWithRetry() {
    setLoading(true);
    for (let i = 0; i < 30; i++) {
      if (doneRef.current) {
        setLoading(false);
        return;
      }
      const loaded = await fetchNextQuestion();
      if (loaded) {
        setReady(true);
        setLoading(false);
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setLoading(false);
  }

  async function fetchNextQuestion(): Promise<boolean> {
    try {
      const { data } = await api.get(
        `/student/tasks/${taskId}/questions/next`
      );
      setSelectedAnswer(null);
      setRecordedUri(null);
      if (data.ready === false) {
        return false;
      }
      if (data.done) {
        doneRef.current = true;
        setDone(true);
        return false;
      } else {
        setQuestion(data);
        setCurrentIndex(data.currentIndex || 1);
        setTotalQuestions(data.totalCount || data.totalQuestions || 0);
        if (data.type === "VOICE") {
          speakQuestion(data.questionText);
        }
        return true;
      }
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }

  function speakQuestion(text: string) {
    Speech.stop();
    Speech.speak(text, { rate: 0.85, pitch: 1.0 });
  }

  async function startRecording() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();
      recordingRef.current = recording;
      setRecording(true);
    } catch {
      Alert.alert("Error", "Failed to start recording");
    }
  }

  async function stopRecording() {
    try {
      setRecording(false);
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        setRecordedUri(uri);
      }
    } catch {
      Alert.alert("Error", "Failed to stop recording");
    }
  }

  async function submitMCQAnswer(answer: string) {
    setSelectedAnswer(answer);
    setSubmittingAnswer(true);
    const currentQuestion = question;
    const hasNextPromise = fetchNextQuestion();
    api.post(
      `/student/questions/${currentQuestion!.id}/answer`,
      { answerText: answer }
    ).catch(() => {});
    const hasNext = await hasNextPromise;
    if (!hasNext) {
      setQuestion(null);
      setDone(true);
    }
    setSubmittingAnswer(false);
  }

  async function submitVoiceAnswer(uri: string | null) {
    if (!uri) return;
    setSubmittingAnswer(true);
    const currentQuestion = question;
    try {
      const formData = new FormData();
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        const ext = blob.type.split("/")[1] || "webm";
        const file = new File([blob], `answer.${ext}`, { type: blob.type });
        formData.append("audio", file);
      } else {
        formData.append("audio", {
          uri,
          type: "audio/webm",
          name: "answer.webm",
        } as any);
      }

      const hasNextPromise = fetchNextQuestion();
      api.post(
        `/student/questions/${currentQuestion!.id}/answer-voice`,
        formData
      ).catch(() => {});
      const hasNext = await hasNextPromise;
      if (!hasNext) {
        setQuestion(null);
        setDone(true);
      }
    } catch {
    } finally {
      setSubmittingAnswer(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (ready && !started) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Ionicons name="help-circle" size={64} color={colors.primary} />
        <Text style={[styles.readyTitle, { color: colors.text }]}>Quiz Ready!</Text>
        <Text style={[styles.readySub, { color: colors.textSecondary }]}>
          Answer all questions to complete this task
        </Text>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
          onPress={() => setStarted(true)}
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.startBtnText}>Start Quiz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Ionicons name="checkmark-done-circle" size={64} color={colors.success} />
        <Text style={[styles.doneTitle, { color: colors.text }]}>All Questions Answered!</Text>
        <Text style={[styles.doneSub, { color: colors.textSecondary }]}>
          {totalQuestions > 0 ? `Completed all ${totalQuestions} questions` : "Great job!"}
        </Text>
        <TouchableOpacity
          style={[styles.reviewDoneBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/(student)/tasks/${taskId}/review`)}
        >
          <Ionicons name="eye" size={20} color="#fff" />
          <Text style={styles.startBtnText}>Review Answers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dashboardBtn, { borderColor: colors.border }]}
          onPress={() => router.replace("/(student)/(tabs)")}
        >
          <Text style={[styles.dashboardBtnText, { color: colors.textSecondary }]}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!question) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Question</Text>
          {totalQuestions > 0 && (
            <Text style={[styles.counter, { color: colors.textSecondary }]}>
              {currentIndex} of {totalQuestions}
            </Text>
          )}
        </View>
        <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.inputBg }]}>
          {question?.type === "MCQ" ? "Multiple Choice" : "Voice Answer"}
        </Text>
      </View>

      <View style={[styles.questionBox, { backgroundColor: colors.card }]}>
        <Text style={[styles.questionText, { color: colors.text }]}>{question?.questionText}</Text>
      </View>

      {question?.type === "MCQ" ? (
        <View style={styles.options}>
          {question.options?.map((opt, i) => {
            const isSelected = selectedAnswer === opt;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.option,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isSelected && { borderColor: colors.primary },
                ]}
                onPress={() => !submittingAnswer && submitMCQAnswer(opt)}
                disabled={submittingAnswer}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.textSecondary },
                    isSelected && { color: colors.primary, fontWeight: "600" },
                  ]}
                >
                  {opt}
                </Text>
                {submittingAnswer && isSelected && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.voiceSection}>
          <TouchableOpacity
            style={styles.replayBtn}
            onPress={() => speakQuestion(question?.questionText || "")}
          >
            <Ionicons name="volume-high" size={24} color={colors.primary} />
            <Text style={[styles.replayText, { color: colors.primary }]}>Listen Again</Text>
          </TouchableOpacity>

          {!recordedUri && (
            <TouchableOpacity
              style={[
                styles.recordBtn,
                { backgroundColor: colors.primary },
                recording && styles.recordingActive,
              ]}
              onPress={recording ? stopRecording : startRecording}
            >
              <Ionicons
                name={recording ? "stop-circle" : "mic"}
                size={48}
                color="#fff"
              />
              <Text style={styles.recordText}>
                {recording ? "Stop Recording" : "Tap to Speak Answer"}
              </Text>
            </TouchableOpacity>
          )}

          {recordedUri && !submittingAnswer && (
            <View style={styles.voiceActions}>
              <TouchableOpacity
                style={[styles.voiceActionBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => { setRecordedUri(null); startRecording(); }}
              >
                <Ionicons name="refresh" size={20} color={colors.text} />
                <Text style={[styles.voiceActionText, { color: colors.text }]}>Re-record</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voiceActionBtn, styles.submitActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => submitVoiceAnswer(recordedUri)}
              >
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitActionText}>Submit Answer</Text>
              </TouchableOpacity>
            </View>
          )}

          {submittingAnswer && (
            <View style={{ alignItems: "center", padding: 20 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.replayText, { color: colors.textSecondary, marginTop: 12 }]}>Submitting...</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: "700" },
  counter: { fontSize: 13, marginTop: 2 },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  questionBox: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  questionText: { fontSize: 18, lineHeight: 28 },
  options: { gap: 10, marginBottom: 24 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionText: { fontSize: 16, flex: 1 },
  voiceSection: { alignItems: "center", gap: 20, marginBottom: 24 },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  replayText: { fontSize: 16, fontWeight: "600" },
  recordBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  recordingActive: { backgroundColor: "#EF4444" },
  recordText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  voiceActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  voiceActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  voiceActionText: { fontSize: 15, fontWeight: "600" },
  submitActionBtn: { borderWidth: 0 },
  submitActionText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  readyTitle: { fontSize: 22, fontWeight: "700", marginTop: 16 },
  readySub: { fontSize: 16, marginTop: 8, marginBottom: 32 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startBtnText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  doneTitle: { fontSize: 22, fontWeight: "700", marginTop: 16 },
  doneSub: { fontSize: 16, marginTop: 8 },
  reviewDoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  dashboardBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  dashboardBtnText: { fontSize: 16, fontWeight: "600" },
});
