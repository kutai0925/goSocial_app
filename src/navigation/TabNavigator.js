import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

import MapScreen from "../screens/MapScreen";
import ChatScreen from "../screens/ChatScreen";
import DiscoverEventScreen from "../screens/DiscoverEventScreen";
import ProfileScreen from "../screens/ProfileScreen";
import BottomNavigation from "../components/BottomNavigation";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Tab.Navigator
        tabBar={(props) => {
          const currentRoute = props.state.routes[props.state.index];
          const activeName = currentRoute.name.toLowerCase();

          return (
            <BottomNavigation
              activeScreen={activeName}
              hidePlusButton={false}
              onNavigate={(screenName) => {
                if (screenName === "radar") {
                  // Navigate to Radar using parent's navigation since it's in RootNavigator
                  navigation.navigate("Radar");
                } else {
                  const routeMap = {
                    map: "Map",
                    chat: "Chat",
                    discover: "Discover",
                    profile: "Profile",
                  };
                  // Navigate to tabs using the tab's navigation prop
                  props.navigation.navigate(routeMap[screenName]);
                }
              }}
            />
          );
        }}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Discover" component={DiscoverEventScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
});
