import React, { useEffect, useState } from "react";
import { View, Image, StatusBar, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NavigationContainer } from "@react-navigation/native";

import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

function MainApp() {
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLanding(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showLanding) {
    return <LandingScreen />;
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
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
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
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

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
