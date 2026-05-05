import { authApi } from "@/src/services/api";
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
import StyLnkLogo from "../../components/StyLnkLogo";
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <StyLnkLogo size="md" />
        </View>

        <View style={styles.content}>
          <View style={styles.welcomeSection}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Create an account</Text>
            </View>
            <Text style={styles.subtitle}>
              Stay connected with your people in style.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.white, color: palette.text, borderColor: Colors.brandPale }]}
              placeholder="Enter first name"
              placeholderTextColor={palette.textMuted}
              value={firstName}
              onChangeText={setFirstName}
            />

            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.white, color: palette.text, borderColor: Colors.brandPale }]}
              placeholder="Enter last name"
              placeholderTextColor={palette.textMuted}
              value={lastName}
              onChangeText={setLastName}
            />

            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.white, color: palette.text, borderColor: Colors.brandPale }]}
              placeholder="Enter your email"
              placeholderTextColor={palette.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Mobile number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.white, color: palette.text, borderColor: Colors.brandPale }]}
              placeholder="Enter mobile number"
              placeholderTextColor={palette.textMuted}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.white, color: palette.text, borderColor: Colors.brandPale }]}
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
              <Text style={styles.orText}>Or Sign up with Google</Text>
            </View>

            <TouchableOpacity style={styles.googleButton}>
              <View style={styles.googleContent}>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleLogo}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Sign up with Google</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.push("/auth/login")}
            >
              <Text style={styles.signInText}>
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
  container: { flex: 1, backgroundColor: Colors.brandNavy },
  scroll: { flexGrow: 1 },
  scrollView: { backgroundColor: Colors.brandNavy },
  header: {
    alignItems: "center",
    paddingTop: 42,
    paddingBottom: 18,
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
    color: Colors.white,
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    color: Colors.brandPale,
    fontSize: 14,
    textAlign: "center",
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
  signUpButton: {
    backgroundColor: Colors.brandTeal,
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
    color: Colors.brandPale,
    fontSize: 14,
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
  signInButton: { alignItems: "center" },
  signInText: { color: Colors.brandPale, fontSize: 14 },
  signInLink: { color: Colors.brandCyan, fontWeight: "bold" },
});
