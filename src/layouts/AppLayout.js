import React from "react";
import { View, StyleSheet } from "react-native";
import BottomNavigation from "../components/BottomNavigation";

export default function AppLayout({
  activeScreen,
  hidePlusButton,
  onNavigate,
  children,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      <BottomNavigation
        activeScreen={activeScreen}
        hidePlusButton={hidePlusButton}
        onNavigate={onNavigate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
  },
});
