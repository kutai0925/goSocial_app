import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function EditProfileScreen({ profile, onCancel, onSave }) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [location, setLocation] = useState(profile.location);
  const [bio, setBio] = useState(profile.bio);

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      location: location.trim(),
      bio: bio.trim(),
    });
  };

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onCancel}>
      <LinearGradient colors={["#3A005F", "#6B159E", "#B83CFF"]} style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.heading}>Edit Profile</Text>
              <TouchableOpacity onPress={handleSave} disabled={!canSave}>
                <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            <Image
              source={require("../../assets/images/radar_avatar.png")}
              style={styles.avatar}
            />
            <TouchableOpacity>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>

            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor="#F0E4FA"
              value={firstName}
              onChangeText={setFirstName}
            />

            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor="#F0E4FA"
              value={lastName}
              onChangeText={setLastName}
            />

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor="#F0E4FA"
              value={location}
              onChangeText={setLocation}
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholderTextColor="#F0E4FA"
              value={bio}
              onChangeText={setBio}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
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
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 40,
  },

  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  cancelText: {
    color: "#F0E4FA",
    fontSize: 15,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  saveTextDisabled: {
    color: "rgba(255,255,255,0.4)",
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    marginBottom: 10,
  },

  changePhotoText: {
    color: "#F0E4FA",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginBottom: 24,
  },

  label: {
    width: "100%",
    color: "#F0E4FA",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
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

  bioInput: {
    minHeight: 100,
    borderRadius: 20,
  },
});
