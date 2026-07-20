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
  TextInput,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import eventsData from "../data/events.json";
import { useAuth } from "../context/AuthContext";
import { setLocation as setBackendLocation, getNearbyUsers } from "../api/users";

const CACHE_KEY = "user_cached_location";

// Place the dummy events around the user location using each event's stored offset
const generateNearbyMarkers = (lat, lon) => {
  return eventsData.map((event) => ({
    ...event,
    latitude: lat + event.latOffset,
    longitude: lon + event.lonOffset,
  }));
};

export default function MapScreen() {
  const { userId } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [nearbyMarkers, setNearbyMarkers] = useState([]);
  const [realUsers, setRealUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMarkers = nearbyMarkers.filter((marker) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      marker.title?.toLowerCase().includes(query) ||
      marker.location_name?.toLowerCase().includes(query) ||
      marker.locationName?.toLowerCase().includes(query) ||
      marker.category?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    let locationSubscription = null;
    let nearbyInterval = null;

    const fetchNearbyUsers = async () => {
      if (!userId) return;
      try {
        const users = await getNearbyUsers();
        setRealUsers(users.filter(u => u.user_id !== userId));
      } catch (e) {
        console.log("Error fetching nearby users", e);
      }
    };

    const setupLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          setLoading(false);
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
          },
          async (freshLocation) => {
            const { latitude, longitude, accuracy } = freshLocation.coords;

            setLocation({ latitude, longitude });
            setRegion((prev) => prev || {
              latitude,
              longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            });
            setNearbyMarkers(generateNearbyMarkers(latitude, longitude));
            setLoading(false);

            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ latitude, longitude }));

            if (userId) {
              try {
                await setBackendLocation(userId, { lat: latitude, lon: longitude, accuracy });
              } catch (e) {
                console.log("Failed to sync location:", e);
              }
            }
          }
        );
      } catch (err) {
        console.log("Error getting location:", err);
        if (!location) setErrorMsg("Could not fetch location details");
        setLoading(false);
      }
    };

    loadCachedLocation();
    setupLocationTracking();
    fetchNearbyUsers();
    nearbyInterval = setInterval(fetchNearbyUsers, 10000);

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (nearbyInterval) clearInterval(nearbyInterval);
    };
  }, [userId]);

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
        setLoading(false);
      }
    } catch (err) {
      console.log("Error reading cached location:", err);
    }
  };


  const openEventPopup = (event) => {
    setSelectedEvent(event);
  };

  const closePopup = () => {
    setSelectedEvent(null);
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

      {/* Top status bar scrim / protection gradient */}
      <LinearGradient
        colors={["#17061f", "transparent"]}
        style={styles.statusBarScrim}
      />

      <View style={styles.searchContainer}>
        <Image
          source={require("../../assets/images/gosocial_logo_512x512.png")}
          style={styles.searchLogo}
          resizeMode="contain"
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events, places, categories..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            style={styles.map}
            initialRegion={region}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {filteredMarkers.map((marker) => (
              <Marker
                key={marker.id}
                coordinate={{
                  latitude: marker.latitude,
                  longitude: marker.longitude,
                }}
                image={getMarkerImage(marker.type)} // Render image natively to bypass React Native child layout bugs
                onPress={() => openEventPopup(marker)}
              />
            ))}
            {realUsers.map((user) => (
              <Marker
                key={user.user_id}
                coordinate={{
                  latitude: user.coordinates?.lat || 0,
                  longitude: user.coordinates?.lon || 0,
                }}
              >
                <View style={styles.userMarker}>
                  <Text style={styles.userMarkerText}>{user.username?.charAt(0)}</Text>
                </View>
              </Marker>
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
        visible={selectedEvent !== null}
        transparent={true}
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={closePopup}>
          <Pressable style={styles.popupCard}>
            {selectedEvent?.category && (
              <Text style={styles.popupCategory}>{selectedEvent.category}</Text>
            )}
            <Text style={styles.popupTitle}>{selectedEvent?.title}</Text>
            <Text style={styles.popupLocation}>{selectedEvent?.locationName}</Text>
            <Text style={styles.popupTime}>{selectedEvent?.time}</Text>

            <Text style={styles.popupDescription}>
              {selectedEvent?.description}
            </Text>

            <TouchableOpacity style={styles.showButton} onPress={closePopup}>
              <Text style={styles.showButtonText}>Show Event</Text>
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

  statusBarScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 115 : 95,
    zIndex: 10,
  },


  searchContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 36,
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(23, 6, 31, 0.85)",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(184, 60, 255, 0.4)",
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  searchLogo: {
    width: 26,
    height: 26,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },

  clearIcon: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    paddingLeft: 10,
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

  popupCategory: {
    color: "#8F4CC7",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
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

  userMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1DB954",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  
  userMarkerText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});