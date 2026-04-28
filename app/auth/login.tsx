import { API_BASE_URL, authApi } from "@/src/services/api";
import { useAppTheme } from "@/src/theme/app-theme";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await authApi.login({ email, password });
      router.replace("/(tabs)");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid email or password";
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: palette.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={{ backgroundColor: palette.background }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={[styles.appName, { color: palette.text }]}>STYLNK</Text>
          <Text style={[styles.tagline, { color: palette.textSecondary }]}>
            Connect with anyone, anywhere
          </Text>
          <Text style={[styles.apiHint, { color: palette.textMuted }]}>
            API: {API_BASE_URL}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: palette.text }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.elevated,
                color: palette.text,
                borderColor: palette.border,
              },
            ]}
            placeholder="Enter your email"
            placeholderTextColor={palette.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: palette.text }]}>Password</Text>
          <View
            style={[
              styles.passwordContainer,
              {
                backgroundColor: palette.elevated,
                borderColor: palette.border,
              },
            ]}
          >
            <TextInput
              style={[styles.passwordInput, { color: palette.text }]}
              placeholder="Enter your password"
              placeholderTextColor={palette.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showHide}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
            <Text style={[styles.dividerText, { color: palette.textSecondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push("/auth/register")}
          >
            <Text style={[styles.registerText, { color: palette.textSecondary }]}>
              Don&apos;t have an account?
              <Text style={styles.registerLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logoText: { fontSize: 36, color: "#fff", fontWeight: "bold" },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  tagline: { fontSize: 14, marginTop: 4 },
  apiHint: { fontSize: 11, marginTop: 6 },
  form: { width: "100%" },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
  },
  showHide: { paddingHorizontal: 14, color: Colors.primary, fontWeight: "600" },
  forgotPassword: { alignSelf: "flex-end", marginBottom: 24 },
  forgotText: { color: Colors.primary, fontSize: 13 },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 17,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
  },
  registerButton: { alignItems: "center" },
  registerText: { fontSize: 14 },
  registerLink: { color: Colors.primary, fontWeight: "bold" },
});
