import { authApi } from "@/src/services/api";
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
import { Colors } from "../../constants/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !mobile || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const fullName = `${firstName} ${lastName}`;
      await authApi.register({ fullName, email, password });
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
          <View style={styles.topBar}>
            <Text style={[styles.goText, { color: palette.text }]}>GO!</Text>
            <View style={styles.trainIcon}>
              <Ionicons name="train" size={24} color={Colors.primary} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.welcomeSection}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: palette.text }]}>Create an account</Text>
              <Ionicons name="train-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              Stay connected with your loved ones, join the train.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.label, { color: palette.text }]}>First Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
              placeholder="Enter first name"
              placeholderTextColor={palette.textMuted}
              value={firstName}
              onChangeText={setFirstName}
            />

            <Text style={[styles.label, { color: palette.text }]}>Last Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
              placeholder="Enter last name"
              placeholderTextColor={palette.textMuted}
              value={lastName}
              onChangeText={setLastName}
            />

            <Text style={[styles.label, { color: palette.text }]}>Email address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
              placeholder="Enter your email"
              placeholderTextColor={palette.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: palette.text }]}>Mobile number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
              placeholder="Enter mobile number"
              placeholderTextColor={palette.textMuted}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
            />

            <Text style={[styles.label, { color: palette.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
              placeholder="Enter password"
              placeholderTextColor={palette.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.signUpButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signUpButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerSection}>
              <Text style={[styles.orText, { color: palette.textSecondary }]}>Or Sign up with Google</Text>
            </View>

            <TouchableOpacity style={styles.googleButton}>
              <View style={styles.googleContent}>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleLogo}>G</Text>
                </View>
                <Text style={[styles.googleButtonText, { color: palette.text }]}>Sign up with Google</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.push("/auth/login")}
            >
              <Text style={[styles.signInText, { color: palette.textSecondary }]}>
                Already have an account? <Text style={styles.signInLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 10,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  goText: {
    fontSize: 24,
    fontWeight: "bold",
    marginRight: 8,
  },
  trainIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginRight: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  form: { width: "100%" },
  label: {
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
  signUpButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: { opacity: 0.7 },
  signUpButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  dividerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  orText: {
    fontSize: 14,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
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
    fontSize: 15,
    fontWeight: "500",
  },
  signInButton: { alignItems: "center" },
  signInText: { fontSize: 14 },
  signInLink: { color: Colors.primary, fontWeight: "bold" },
});
