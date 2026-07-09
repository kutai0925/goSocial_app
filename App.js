import React, { useEffect, useState } from "react";
import { Image, StatusBar, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MapScreen from "./src/screens/MapScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <LandingScreen />;
  }

  return <MapScreen />;
}

function LandingScreen() {
  return (
    <LinearGradient
      colors={["#3A005F", "#6B159E", "#B83CFF"]}
      style={styles.landingContainer}
    >
      <StatusBar barStyle="light-content" />

      <Image
        source={require("./assets/images/gosocial_logo_512x512.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.appName}>Go.Social</Text>
      <Text style={styles.tagline}>turn screen time into real time!</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  landingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  logo: {
    width: 230,
    height: 230,
    marginBottom: 36,
  },

  appName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 14,
  },

  tagline: {
    color: "#FFFFFF",
    fontSize: 17,
    textAlign: "center",
  },
});