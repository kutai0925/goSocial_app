import React from "react";
import { View, StyleSheet } from "react-native";
import BottomNavigation from "../components/BottomNavigation";

export default function AppLayout({ activeScreen, onNavigate, children }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      <BottomNavigation activeScreen={activeScreen} onNavigate={onNavigate} />
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
