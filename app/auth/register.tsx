import { useSession } from "@/src/providers/session-provider";
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

export default function RegisterScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { register } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, password });
      router.replace("/(tabs)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again";
      Alert.alert("Registration Failed", message);
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: palette.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            Join STYLNK today
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: palette.text }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.elevated, color: palette.text, borderColor: palette.border }]}
            placeholder="Enter your full name"
            placeholderTextColor={palette.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, { color: palette.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.elevated, color: palette.text, borderColor: palette.border }]}
            placeholder="Enter your email"
            placeholderTextColor={palette.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: palette.text }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.elevated, color: palette.text, borderColor: palette.border }]}
            placeholder="Create a password"
            placeholderTextColor={palette.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={[styles.label, { color: palette.text }]}>Confirm Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.elevated, color: palette.text, borderColor: palette.border }]}
            placeholder="Confirm your password"
            placeholderTextColor={palette.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={[styles.loginText, { color: palette.textSecondary }]}>
              Already have an account?{" "}
              <Text style={styles.loginHighlight}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  header: { marginBottom: 32, marginTop: 20 },
  backButton: { marginBottom: 16 },
  backText: { color: Colors.primary, fontSize: 16 },
  title: { fontSize: 28, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginTop: 4 },
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
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 17,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loginLink: { alignItems: "center", marginTop: 24 },
  loginText: { fontSize: 14 },
  loginHighlight: { color: Colors.primary, fontWeight: "bold" },
});
