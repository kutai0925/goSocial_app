import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import EditProfileScreen from "./EditProfileScreen";
import { getUser, updateProfile } from "../api/users";
import { useAuth } from "../context/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 2;
const GRID_COLUMNS = 3;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const GRID_PHOTOS = [
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&sat=-30",
  "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
];

const DEFAULT_PROFILE = {
  firstName: "",
  lastName: "",
  location: "Unknown",
  bio: "No bio yet.",
  profileImage: null,
};

export default function ProfileScreen({ route, navigation, onClose }) {
  const { userId: currentUserId } = useAuth();
  const userId = route?.params?.userId || currentUserId;
  const isOwnProfile = userId === currentUserId;
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getUser(userId, currentUserId);
        setProfile({
          firstName: data.first_name || data.username,
          lastName: data.last_name || "",
          location: data.location || "Unknown",
          bio: data.bio || "No bio yet.",
          profileImage: data.profile_image || null,
        });
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [userId]);

  const handleSaveProfile = async (updated) => {
    try {
      await updateProfile(userId, updated);
      setProfile(updated);
      setShowEditProfile(false);
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={() => {
            if (onClose) onClose();
            else if (navigation && navigation.canGoBack()) navigation.goBack();
          }}>
            <Text style={styles.menuIcon}>{onClose || (navigation && navigation.canGoBack()) ? "↓" : "☰"}</Text>
          </TouchableOpacity>

          <View style={styles.profileRow}>
            {profile.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: "#8F4CC7", alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 40 }}>
                  {profile.firstName ? profile.firstName.charAt(0).toUpperCase() : ""}
                </Text>
              </View>
            )}

            <View style={styles.profileInfo}>
              <Text style={styles.name}>
                {profile.firstName} <Text style={styles.nameBold}>{profile.lastName}</Text>
              </Text>
              <Text style={styles.location}>{profile.location}</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          </View>

          {isOwnProfile && (
            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.8}
              onPress={() => setShowEditProfile(true)}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          <View style={styles.statsBox}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>109</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1.5M</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>71</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          {GRID_PHOTOS.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.gridItem} />
          ))}
        </View>
      </ScrollView>

      {showEditProfile && (
        <EditProfileScreen
          profile={profile}
          onCancel={() => setShowEditProfile(false)}
          onSave={handleSaveProfile}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#B685E0",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  menuButton: {
    position: "absolute",
    top: 54,
    right: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },

  menuIcon: {
    color: "#2A1240",
    fontSize: 22,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    marginRight: 16,
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    fontSize: 20,
    fontWeight: "500",
    color: "#1E1E1E",
  },

  nameBold: {
    fontWeight: "800",
  },

  location: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2A1240",
    marginTop: 2,
    marginBottom: 6,
  },

  bio: {
    fontSize: 12,
    color: "#3A2A4A",
    lineHeight: 16,
  },

  editButton: {
    alignSelf: "flex-start",
    backgroundColor: "#5A2377",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 18,
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  statsBox: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#5A2377",
    borderRadius: 16,
    paddingVertical: 14,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statDivider: {
    width: 1,
    backgroundColor: "rgba(42, 18, 64, 0.25)",
  },

  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E1E1E",
  },

  statLabel: {
    fontSize: 12,
    color: "#3A2A4A",
    marginTop: 2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },

  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
  },
});
