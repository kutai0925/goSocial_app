import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";

export default function BottomNavigation({ onOpenFriendar }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.curveCutout} />

      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => Alert.alert("Home")}>
          <Image
            source={require("../../assets/icons/home.png")}
            style={styles.icon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => Alert.alert("Chat")}>
          <Image
            source={require("../../assets/icons/chat.png")}
            style={styles.icon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.centerButton} onPress={onOpenFriendar}>
          <Text style={styles.plusText}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => Alert.alert("Notifications")}
        >
          <Image
            source={require("../../assets/icons/notification.png")}
            style={styles.icon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => Alert.alert("Profile")}
        >
          <Image
            source={require("../../assets/icons/profile.png")}
            style={styles.icon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 105,
    backgroundColor: "transparent",
  },

  navBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 78,
    backgroundColor: "#080808",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 18,
    paddingBottom: 10,
  },

  curveCutout: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 145,
    height: 72,
    backgroundColor: "#080808",
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    zIndex: 2,
  },

  navItem: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },

  icon: {
    width: 25,
    height: 25,
    tintColor: "#9BB3CC",
  },

  centerButton: {
    position: "relative",
    top: -30,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#8B4CC2",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,

    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 12,
  },

  plusText: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "300",
    marginTop: -4,
  },
});