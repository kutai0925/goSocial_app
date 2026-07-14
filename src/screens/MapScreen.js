import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "user_cached_location";

// Helper to generate coordinates offset from user location to display mock markers nearby
const generateNearbyMarkers = (lat, lon) => {
  return [
    {
      id: "party1",
      type: "party",
      latitude: lat + 0.0035,
      longitude: lon - 0.0045,
      title: "80s Party",
      locationName: "Retro Club Munich",
      time: "Tonight · 22:00",
      description: "Classic 80s music, retro lights and old-school vibes.",
    },
    {
      id: "party2",
      type: "party",
      latitude: lat - 0.0025,
      longitude: lon + 0.0055,
      title: "Techno Party",
      locationName: "Underground Hall",
      time: "Tonight · 23:30",
      description: "Dark room, heavy bass, electronic sound and techno crowd.",
    },
    {
      id: "food1",
      type: "food",
      latitude: lat + 0.0052,
      longitude: lon - 0.0015,
    },
    {
      id: "food2",
      type: "food",
      latitude: lat - 0.0048,
      longitude: lon - 0.0052,
    },
    {
      id: "blue1",
      type: "blue",
      latitude: lat + 0.0065,
      longitude: lon + 0.0038,
    },
    {
      id: "blue2",
      type: "blue",
      latitude: lat - 0.0018,
      longitude: lon - 0.0078,
    },
    {
      id: "purple1",
      type: "purple",
      latitude: lat - 0.0055,
      longitude: lon + 0.0028,
    },
    {
      id: "yellow1",
      type: "yellow",
      latitude: lat + 0.0018,
      longitude: lon + 0.0062,
    },
  ];
};

export default function MapScreen() {
  const [selectedParty, setSelectedParty] = useState(null);
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [nearbyMarkers, setNearbyMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // 1. Initial Load: Read cached location from AsyncStorage
    loadCachedLocation();

    // 2. Fetch fresh location and request permission
    requestAndFetchLocation();
  }, []);

  const loadCachedLocation = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { latitude, longitude } = JSON.parse(cached);
        const cachedRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        };
        setLocation({ latitude, longitude });
        setRegion(cachedRegion);
        setNearbyMarkers(generateNearbyMarkers(latitude, longitude));
        setLoading(false); // Enable map rendering immediately using cached location
      }
    } catch (err) {
      console.log("Error reading cached location:", err);
    }
  };

  const requestAndFetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        setLoading(false);
        return;
      }

      // Fetch fresh device GPS coordinates
      const freshLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = freshLocation.coords;

      setLocation({ latitude, longitude });

      const freshRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      setRegion(freshRegion);
      setNearbyMarkers(generateNearbyMarkers(latitude, longitude));
      setLoading(false);

      // Cache location for next startup & backend syncing
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ latitude, longitude })
      );
    } catch (err) {
      console.log("Error getting location:", err);
      // Keep displaying cached location if fetching fresh fails
      if (!location) {
        setErrorMsg("Could not fetch location details");
      }
      setLoading(false);
    }
  };

  const openPartyPopup = (party) => {
    setSelectedParty(party);
  };

  const closePopup = () => {
    setSelectedParty(null);
  };

  const getMarkerImage = (type) => {
    switch (type) {
      case "party":
        return require("../../assets/images/pin_party.png");
      case "food":
        return require("../../assets/images/pin_food.png");
      case "blue":
        return require("../../assets/images/pin_sports.png");
      case "purple":
        return require("../../assets/images/pin_art.png");
      case "yellow":
        return require("../../assets/images/pin_meetup.png");
      default:
        return require("../../assets/images/pin_party.png");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#17061f", "transparent"]}
        style={styles.header}
      >
        <Image
          source={require("../../assets/images/gosocial_logo_512x512.png")}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        <Text style={styles.headerTitle}>Maps</Text>
      </LinearGradient>

      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            style={styles.map}
            initialRegion={region}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {nearbyMarkers.map((marker) => (
              <Marker
                key={marker.id}
                coordinate={{
                  latitude: marker.latitude,
                  longitude: marker.longitude,
                }}
                image={getMarkerImage(marker.type)} // Render image natively to bypass React Native child layout bugs
                onPress={() => {
                  if (marker.type === "party") {
                    openPartyPopup(marker);
                  }
                }}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#B83CFF" />
                <Text style={styles.loadingText}>Locating your screen-free social zone...</Text>
              </>
            ) : (
              <Text style={styles.errorText}>
                {errorMsg || "Location coordinates are currently unavailable."}
              </Text>
            )}
          </View>
        )}
      </View>

      <Modal
        visible={selectedParty !== null}
        transparent={true}
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={closePopup}>
          <Pressable style={styles.popupCard}>
            <Text style={styles.popupTitle}>{selectedParty?.title}</Text>
            <Text style={styles.popupLocation}>{selectedParty?.locationName}</Text>
            <Text style={styles.popupTime}>{selectedParty?.time}</Text>

            <Text style={styles.popupDescription}>
              {selectedParty?.description}
            </Text>

            <TouchableOpacity style={styles.showButton} onPress={closePopup}>
              <Text style={styles.showButtonText}>Show Party</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={closePopup}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4B155F",
  },

  header: {
    height: 110,
    paddingTop: 28,
    alignItems: "center",
    justifyContent: "flex-start",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  headerLogo: {
    position: "absolute",
    top: 28,
    left: 17,
    width: 88,
    height: 88,
  },

  headerTitle: {
    color: "rgba(219, 195, 239, 0.85)",
    fontSize: 40,
    fontWeight: "700",
    marginTop: 12,
    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: {
      width: 3,
      height: 4,
    },
    textShadowRadius: 6,
  },

  mapContainer: {
    flex: 1,
    backgroundColor: "#4B155F",
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17061f",
    paddingHorizontal: 32,
  },

  loadingText: {
    color: "#FFFFFF",
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },

  errorText: {
    color: "#FF4458",
    fontSize: 16,
    textAlign: "center",
  },

  mapPinImage: {
    width: 44,
    height: 55,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 999,
  },

  popupCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
  },

  popupIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FF4458",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  popupIconText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },

  popupTitle: {
    color: "#171717",
    fontSize: 27,
    fontWeight: "800",
    marginBottom: 6,
  },

  popupLocation: {
    color: "#6E6E6E",
    fontSize: 16,
    marginBottom: 4,
  },

  popupTime: {
    color: "#8F4CC7",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
  },

  popupDescription: {
    color: "#444444",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 22,
  },

  showButton: {
    backgroundColor: "#8F4CC7",
    paddingVertical: 13,
    paddingHorizontal: 38,
    borderRadius: 24,
    marginBottom: 14,
  },

  showButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  closeText: {
    color: "#777777",
    fontSize: 15,
  },
});