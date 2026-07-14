import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";

export default function BottomNavigation({ activeScreen, hidePlusButton, onNavigate }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate("map")}
        >
          <Image
            source={require("../../assets/icons/home.png")}
            style={[
              styles.icon,
              activeScreen === "map" && styles.activeIcon,
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate("chat")}
        >
          <Image
            source={require("../../assets/icons/chat.png")}
            style={[
              styles.icon,
              activeScreen === "chat" && styles.activeIcon,
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.centerButton, hidePlusButton && { opacity: 0 }]}
          disabled={hidePlusButton}
          onPress={() => onNavigate("radar")}
        >
          <Text style={styles.plusText}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => Alert.alert("Notifications", "Notifications Screen kommt später.")}
        >
          <Image
            source={require("../../assets/icons/notification.png")}
            style={[
              styles.icon,
              activeScreen === "notifications" && styles.activeIcon,
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => Alert.alert("Profile", "Profile Screen kommt später.")}
        >
          <Image
            source={require("../../assets/icons/profile.png")}
            style={[
              styles.icon,
              activeScreen === "profile" && styles.activeIcon,
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 92,
    backgroundColor: "#4B155F",
  },

  navBar: {
    flex: 1,
    backgroundColor: "#050505",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 14,
    paddingBottom: 16,
  },

  navItem: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    width: 25,
    height: 25,
    tintColor: "#8EA6C1",
    opacity: 0.95,
  },

  activeIcon: {
    tintColor: "#B84EFF",
    opacity: 1,
  },

  centerButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#8F4CC7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -54,

    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 14,
  },

  plusText: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "300",
    marginTop: -6,
  },
});