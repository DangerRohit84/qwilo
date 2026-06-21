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
import { Ionicons } from "@expo/vector-icons";
import api from "../../../../services/api";
import { Question, AnswerResult } from "../../../../types";

export default function QuestionsScreen() {
  const { id: taskId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    Audio.requestPermissionsAsync();
    loadQuestionWithRetry();
  }, []);

  async function loadQuestionWithRetry() {
    for (let i = 0; i < 30; i++) {
      const loaded = await fetchNextQuestion();
      if (loaded) return;
      await new Promise((r) => setTimeout(r, 2000));
    }
    setLoading(false);
  }

  async function fetchNextQuestion(): Promise<boolean> {
    setLoading(true);
    setSelectedAnswer(null);
    setAnswered(false);
    setResult(null);
    setRecordedUri(null);
    try {
      const { data } = await api.get(
        `/student/tasks/${taskId}/questions/next`
      );
      if (data.done) {
        return false;
      } else {
        setQuestion(data);
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
        await submitVoiceAnswer(uri);
      }
    } catch {
      Alert.alert("Error", "Failed to stop recording");
    }
  }

  async function submitMCQAnswer(answer: string) {
    setSelectedAnswer(answer);
    setAnswered(true);
    try {
      const { data } = await api.post<AnswerResult>(
        `/student/questions/${question!.id}/answer`,
        { answerText: answer }
      );
      setResult(data);
    } catch {
      Alert.alert("Error", "Failed to submit answer");
    }
  }

  async function submitVoiceAnswer(uri: string | null) {
    if (!uri) return;
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

      const { data } = await api.post<AnswerResult>(
        `/student/questions/${question!.id}/answer-voice`,
        formData
      );
      setResult(data);
      setAnswered(true);
    } catch (err: any) {
      console.log("Voice answer error:", err.response?.status, err.response?.data);
      Alert.alert("Error", err.response?.data?.error || "Failed to submit voice answer");
    }
  }

  async function nextQuestion() {
    if (done) {
      router.replace("/(student)/(tabs)");
      return;
    }
    const hasNext = await fetchNextQuestion();
    if (!hasNext) setDone(true);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-done-circle" size={64} color="#10B981" />
        <Text style={styles.doneTitle}>All Questions Answered!</Text>
        <Text style={styles.doneSub}>Great job completing your homework</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace("/(student)/(tabs)")}>code: correct_answer
          <Text style={styles.doneBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCorrect = result?.isCorrect;
  const score = result?.score;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Question</Text>
        <Text style={styles.badge}>
          {question?.type === "MCQ" ? "Multiple Choice" : "Voice Answer"}
        </Text>
      </View>

      <View style={styles.questionBox}>
        <Text style={styles.questionText}>{question?.questionText}</Text>
      </View>

      {question?.type === "MCQ" ? (
        <View style={styles.options}>
          {question.options?.map((opt, i) => {
            const isSelected = selectedAnswer === opt;
            const isRight = answered && isCorrect && isSelected;
            const isWrong = answered && !isCorrect && isSelected;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.option,
                  isSelected && styles.selectedOption,
                  isRight && styles.correctOption,
                  isWrong && styles.wrongOption,
                ]}
                onPress={() => !answered && submitMCQAnswer(opt)}
                disabled={answered}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.selectedOptionText,
                  ]}
                >
                  {opt}
                </Text>
                {isRight && (
                  <Ionicons name="checkmark" size={20} color="#10B981" />
                )}
                {isWrong && (
                  <Ionicons name="close" size={20} color="#EF4444" />
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
            <Ionicons name="volume-high" size={24} color="#4F46E5" />
            <Text style={styles.replayText}>Listen Again</Text>
          </TouchableOpacity>

          {!recordedUri && (
            <TouchableOpacity
              style={[
                styles.recordBtn,
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
        </View>
      )}

      {answered && result && (
        <View
          style={[
            styles.resultBox,
            isCorrect ? styles.correctBg : styles.wrongBg,
          ]}
        >
          <Ionicons
            name={isCorrect ? "happy-outline" : "sad-outline"}
            size={24}
            color={isCorrect ? "#10B981" : "#EF4444"}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.resultTitle}>
              {isCorrect ? "Correct!" : "Not quite"}
            </Text>
            {question?.type !== "MCQ" && (
              <Text style={styles.resultScore}>Score: {score}/100</Text>
            )}
            {result.correctAnswer && (
              <Text style={styles.correctAnswerText}>
                Answer: {result.correctAnswer}
              </Text>
            )}
          </View>
        </View>
      )}

      {answered && result?.explanation && (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationTitle}>
            {question?.type === "MCQ" ? "Explanation" : "How to Improve"}
          </Text>
          {question?.type !== "MCQ" && result.correctAnswer && (
            <Text style={styles.explanationSub}>Correct answer: {result.correctAnswer}</Text>
          )}
          <Text style={styles.explanationText}>{result.explanation}</Text>
        </View>
      )}

      {answered && (
        <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion}>
          <Text style={styles.nextBtnText}>
            {done ? "Finish" : "Next Question"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 24 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  questionBox: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  questionText: { fontSize: 18, color: "#111827", lineHeight: 28 },
  options: { gap: 10, marginBottom: 24 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  selectedOption: { borderColor: "#4F46E5" },
  correctOption: { borderColor: "#10B981", backgroundColor: "#F0FDF4" },
  wrongOption: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  optionText: { fontSize: 16, color: "#374151", flex: 1 },
  selectedOptionText: { color: "#4F46E5", fontWeight: "600" },
  voiceSection: { alignItems: "center", gap: 20, marginBottom: 24 },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  replayText: { fontSize: 16, color: "#4F46E5", fontWeight: "600" },
  recordBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#4F46E5",
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
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  correctBg: { backgroundColor: "#F0FDF4" },
  wrongBg: { backgroundColor: "#FEF2F2" },
  resultTitle: { fontSize: 16, fontWeight: "700" },
  resultScore: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  correctAnswerText: { fontSize: 14, color: "#059669", fontWeight: "600", marginTop: 4 },
  explanationBox: {
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  explanationTitle: { fontSize: 14, fontWeight: "700", color: "#1D4ED8", marginBottom: 4 },
  explanationSub: { fontSize: 14, fontWeight: "600", color: "#059669", marginBottom: 4 },
  explanationText: { fontSize: 14, color: "#1E3A5F", lineHeight: 20 },
  nextBtn: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  nextBtnText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  doneTitle: { fontSize: 22, fontWeight: "700", color: "#111827", marginTop: 16 },
  doneSub: { fontSize: 16, color: "#6B7280", marginTop: 8 },
  doneBtn: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    width: "100%",
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
