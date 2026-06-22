import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { login, register } from "../../services/auth";
import { useTheme } from "../../contexts/ThemeContext";

export default function AuthScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STUDENT" as "STUDENT" | "PARENT",
    parentEmail: "",
  });

  async function handleSubmit() {
    if (!form.email || !form.password || (!isLogin && !form.name)) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
    if (!isLogin && form.role === "STUDENT" && !form.parentEmail) {
      Alert.alert("Error", "Please enter your parent's email");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(
          form.email,
          form.password,
          form.name,
          form.role,
          form.parentEmail || undefined
        );
      }
      router.replace(form.role === "PARENT" ? "/(parent)" : "/(student)");
    } catch (err: any) {
      const msg =
        err.response?.data?.error || err.message || "Something went wrong";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.primary }]}>Qwilo</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isLogin ? "Welcome back!" : "Start your learning journey"}
        </Text>

        {!isLogin && (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  form.role === "STUDENT" && { borderColor: colors.primary, backgroundColor: colors.inputBg },
                ]}
                onPress={() => setForm({ ...form, role: "STUDENT" })}
              >
                <Text
                  style={[
                    styles.roleText,
                    { color: colors.textSecondary },
                    form.role === "STUDENT" && { color: colors.primary, fontWeight: "600" },
                  ]}
                >
                  Student
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  form.role === "PARENT" && { borderColor: colors.primary, backgroundColor: colors.inputBg },
                ]}
                onPress={() => setForm({ ...form, role: "PARENT" })}
              >
                <Text
                  style={[
                    styles.roleText,
                    { color: colors.textSecondary },
                    form.role === "PARENT" && { color: colors.primary, fontWeight: "600" },
                  ]}
                >
                  Parent
                </Text>
              </TouchableOpacity>
            </View>
            {form.role === "STUDENT" && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Parent Email"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                value={form.parentEmail}
                onChangeText={(t) => setForm({ ...form, parentEmail: t })}
              />
            )}
          </>
        )}

        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.email}
          onChangeText={(t) => setForm({ ...form, email: t })}
        />
        <View style={styles.pwWrap}>
          <TextInput
            style={[styles.pwInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            value={form.password}
            onChangeText={(t) => setForm({ ...form, password: t })}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {isLogin ? "Login" : "Register"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={[styles.switchText, { color: colors.primary }]}>
            {isLogin
              ? "Don't have an account? Register"
              : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  pwWrap: { position: "relative", marginBottom: 12 },
  pwInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    paddingRight: 48,
    fontSize: 16,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  roleBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  roleText: { fontSize: 16 },
  btn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  switchText: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
});
