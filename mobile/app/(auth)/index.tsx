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
import { login, register } from "../../services/auth";

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Homework Tracker</Text>
        <Text style={styles.subtitle}>
          {isLogin ? "Welcome back!" : "Create your account"}
        </Text>

        {!isLogin && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  form.role === "STUDENT" && styles.roleActive,
                ]}
                onPress={() => setForm({ ...form, role: "STUDENT" })}
              >
                <Text
                  style={[
                    styles.roleText,
                    form.role === "STUDENT" && styles.roleTextActive,
                  ]}
                >
                  Student
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  form.role === "PARENT" && styles.roleActive,
                ]}
                onPress={() => setForm({ ...form, role: "PARENT" })}
              >
                <Text
                  style={[
                    styles.roleText,
                    form.role === "PARENT" && styles.roleTextActive,
                  ]}
                >
                  Parent
                </Text>
              </TouchableOpacity>
            </View>
            {form.role === "STUDENT" && (
              <TextInput
                style={styles.input}
                placeholder="Parent Email (optional)"
                keyboardType="email-address"
                value={form.parentEmail}
                onChangeText={(t) => setForm({ ...form, parentEmail: t })}
              />
            )}
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.email}
          onChangeText={(t) => setForm({ ...form, email: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={form.password}
          onChangeText={(t) => setForm({ ...form, password: t })}
        />

        <TouchableOpacity
          style={styles.btn}
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
          <Text style={styles.switchText}>
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
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#4F46E5",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  roleActive: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  roleText: { fontSize: 16, color: "#6B7280" },
  roleTextActive: { color: "#4F46E5", fontWeight: "600" },
  btn: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  switchText: {
    color: "#4F46E5",
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
});
