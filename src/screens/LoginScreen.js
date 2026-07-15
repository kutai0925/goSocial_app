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
import { isValidUsernameOrEmail } from "../utils/validation";

export default function LoginScreen({ onLogin, onNavigateToSignUp }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!usernameOrEmail.trim() || !password) {
      Alert.alert("Missing info", "Please enter your username/email and password.");
      return;
    }
    if (!isValidUsernameOrEmail(usernameOrEmail)) {
      Alert.alert(
        "Invalid username or email",
        "Enter a valid email address, or a username with 3-20 letters, numbers, or underscores."
      );
      return;
    }
    onLogin({ usernameOrEmail: usernameOrEmail.trim(), password });
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
          <Image
            source={require("../../assets/images/gosocial_logo_512x512.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Go.Social</Text>

          <Text style={styles.heading}>Login</Text>

          <TextInput
            style={styles.input}
            placeholder="Login w/ Username or Email"
            placeholderTextColor="#F0E4FA"
            autoCapitalize="none"
            value={usernameOrEmail}
            onChangeText={setUsernameOrEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#F0E4FA"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.goButton} onPress={handleLogin}>
            <View style={styles.goButtonInner}>
              <View style={styles.playTriangle} />
            </View>
            <Text style={styles.goButtonLabel}>Lets{"\n"}GO!</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.memberText}>not a member yet?</Text>

          <TouchableOpacity onPress={onNavigateToSignUp}>
            <Text style={styles.emailSignUpLink}>sign up with email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.spotifyButton]}
            onPress={onNavigateToSignUp}
          >
            <View style={[styles.socialIcon, styles.spotifyIcon]}>
              <Text style={styles.socialIconGlyph}>♫</Text>
            </View>
            <Text style={styles.socialButtonLabel}>sign up w/ Spotify</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>OR</Text>

          <TouchableOpacity
            style={[styles.socialButton, styles.youtubeButton]}
            onPress={onNavigateToSignUp}
          >
            <View style={[styles.socialIcon, styles.youtubeIcon]}>
              <Text style={styles.socialIconGlyph}>▶</Text>
            </View>
            <Text style={styles.socialButtonLabel}>sign up w/ Youtube</Text>
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

  logo: {
    width: 130,
    height: 130,
    marginBottom: 8,
  },

  appName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 24,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
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

  goButton: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },

  goButtonInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#C9A6E6",
    alignItems: "center",
    justifyContent: "center",
  },

  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 6,
    borderTopWidth: 16,
    borderBottomWidth: 16,
    borderLeftWidth: 26,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#8F4CC7",
  },

  goButtonLabel: {
    position: "absolute",
    top: 24,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginBottom: 16,
  },

  memberText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },

  emailSignUpLink: {
    color: "#F0E4FA",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginBottom: 16,
  },

  socialButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  spotifyButton: {
    backgroundColor: "#D9D9D9",
  },

  youtubeButton: {
    backgroundColor: "#D9D9D9",
  },

  socialIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  spotifyIcon: {
    backgroundColor: "#1DB954",
  },

  youtubeIcon: {
    backgroundColor: "#FF0000",
  },

  socialIconGlyph: {
    color: "#FFFFFF",
    fontSize: 14,
  },

  socialButtonLabel: {
    flex: 1,
    textAlign: "center",
    color: "#555555",
    fontSize: 14,
    marginRight: 40,
  },

  orText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginVertical: 6,
  },
});
