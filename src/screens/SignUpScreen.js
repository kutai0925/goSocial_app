import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { isValidUsername, isValidEmail, isValidPassword } from "../utils/validation";

import { useAuth } from "../context/AuthContext";

export default function SignUpScreen({ onBackToLogin }) {
  const { signupUser } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canSubmit =
    username.trim() && email.trim() && password && confirmPassword;

  const handleNext = async () => {
    if (!canSubmit) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }
    if (!isValidUsername(username)) {
      Alert.alert(
        "Invalid username",
        "Username must be 3-20 characters and contain only letters, numbers, or underscores."
      );
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      Alert.alert(
        "Weak password",
        "Password must be at least 8 characters and include at least one letter and one number."
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please confirm the same password.");
      return;
    }
    try {
      await signupUser({ username: username.trim(), email: email.trim(), password });
    } catch (err) {
      Alert.alert("Signup Failed", "That username or email may already be in use.");
    }
  };

  return (
    <LinearGradient
      colors={["#3A005F", "#6B159E", "#B83CFF"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
            <Text style={styles.backButtonLabel}>{"‹ Back"}</Text>
          </TouchableOpacity>

          <Image
            source={require("../../assets/images/gosocial_logo_512x512.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Go.Social</Text>

          <Text style={styles.heading}>Sign Up here!</Text>

          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#F0E4FA"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#F0E4FA"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#F0E4FA"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="#F0E4FA"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            style={[styles.nextButton, !canSubmit && styles.nextButtonDisabled]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonLabel}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },

  backButtonLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  logo: {
    width: 110,
    height: 110,
    marginBottom: 8,
  },

  appName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "600",
    marginBottom: 20,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 20,
  },

  input: {
    width: "100%",
    backgroundColor: "#B172DB",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 15,
    marginBottom: 16,
  },

  nextButton: {
    width: "100%",
    backgroundColor: "#D9D9D9",
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },

  nextButtonDisabled: {
    opacity: 0.6,
  },

  nextButtonLabel: {
    color: "#5A5A5A",
    fontSize: 16,
    fontWeight: "600",
  },
});
