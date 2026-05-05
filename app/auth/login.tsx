import { authApi } from "@/src/services/api";
import socket from "@/src/socket";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
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
import StyLnkLogo from "../../components/StyLnkLogo";
import { Colors } from "../../constants/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login({ email, password });

      // 🔥 IMPORTANT: register socket
      socket.emit("register", res.id);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.logoPanel}>
            <StyLnkLogo size="lg" />
            <Text style={styles.title}>Welcome back</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>
              Email address
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: Colors.white,
                  color: palette.text,
                  borderColor: Colors.brandPale,
                },
              ]}
              placeholder="Enter your email"
              placeholderTextColor={palette.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>
              Password
            </Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  backgroundColor: Colors.white,
                  borderColor: Colors.brandPale,
                },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: palette.text }]}
                placeholder="Enter password"
                placeholderTextColor={palette.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={Colors.brandBlue}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  Remember me
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotText}>Forget password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.signInButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerSection}>
              <Text style={styles.orText}>
                Or Continue with Facebook and Google
              </Text>
            </View>

            <TouchableOpacity style={styles.facebookButton}>
              <View style={styles.socialContent}>
                <View style={styles.facebookIcon}>
                  <Text style={styles.facebookLogo}>f</Text>
                </View>
                <Text
                  style={styles.socialButtonText}
                >
                  Continue with Facebook
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.googleButton}>
              <View style={styles.googleContent}>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleLogo}>G</Text>
                </View>
                <Text
                  style={styles.googleButtonText}
                >
                  Continue with Google
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpButton}
              onPress={() => router.push("/auth/register")}
            >
              <Text
                style={styles.signUpText}
              >
                Don&apos;t have an account?{" "}
                <Text style={styles.signUpLink}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brandNavy },
  scroll: { flexGrow: 1 },
  scrollView: { backgroundColor: Colors.brandNavy },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 24,
  },
  logoPanel: {
    alignItems: "center",
    marginBottom: 34,
    marginTop: 28,
  },
  title: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 26,
  },
  form: { width: "100%" },
  label: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 20,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 15,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.brandCyan,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.brandTeal,
  },
  checkboxLabel: {
    color: Colors.brandPale,
    fontSize: 14,
  },
  forgotPassword: { alignSelf: "flex-end" },
  forgotText: { color: Colors.brandCyan, fontSize: 13 },
  signInButton: {
    backgroundColor: Colors.brandTeal,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: { opacity: 0.7 },
  signInButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  dividerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  orText: {
    fontSize: 14,
  },
  facebookButton: {
    borderWidth: 1,
    borderColor: Colors.brandPale,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  socialContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  facebookIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1877f2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  facebookLogo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  socialButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "500",
  },
  googleButton: {
    borderWidth: 1,
    borderColor: Colors.brandPale,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  googleContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f1f3f4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  googleLogo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4285f4",
  },
  googleButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "500",
  },
  signUpButton: { alignItems: "center" },
  signUpText: { color: Colors.brandPale, fontSize: 14 },
  signUpLink: { color: Colors.brandCyan, fontWeight: "bold" },
});
