import React, { useEffect, useState } from "react";
import { View, Image, StatusBar, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import AppLayout from "./src/layouts/AppLayout";
import MapScreen from "./src/screens/MapScreen";
import ChatScreen from "./src/screens/ChatScreen";
import RadarScreen from "./src/screens/RadarScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import DiscoverEventScreen from "./src/screens/DiscoverEventScreen";

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [authScreen, setAuthScreen] = useState("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("map");
  const [showRadar, setShowRadar] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLanding(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showLanding) {
    return <LandingScreen />;
  }

  if (!isAuthenticated) {
    if (authScreen === "signup") {
      return (
        <SignUpScreen
          onSignUpComplete={() => setIsAuthenticated(true)}
          onBackToLogin={() => setAuthScreen("login")}
        />
      );
    }

    return (
      <LoginScreen
        onLogin={() => setIsAuthenticated(true)}
        onNavigateToSignUp={() => setAuthScreen("signup")}
      />
    );
  }

  return (
    <View style={styles.container}>
      <AppLayout
        activeScreen={currentScreen}
        hidePlusButton={showRadar}
        onNavigate={(screen) => {
          if (screen === "radar") {
            setShowRadar(true);
          } else {
            setCurrentScreen(screen);
          }
        }}
      >
        {currentScreen === "chat" ? (
          <ChatScreen />
        ) : currentScreen === "profile" ? (
          <ProfileScreen />
        ) : currentScreen === "discover" ? (
          <DiscoverEventScreen />
        ) : (
          <MapScreen />
        )}
      </AppLayout>

      {showRadar && (
        <RadarScreen onClose={() => setShowRadar(false)} />
      )}
    </View>
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