import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function MapScreen() {
  const [selectedParty, setSelectedParty] = useState(null);

  const openPartyPopup = (party) => {
    setSelectedParty(party);
  };

  const closePopup = () => {
    setSelectedParty(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#7B1FB4", "#C05CFF"]}
        style={styles.header}
      >
<Image
    source={require("../../assets/images/gosocial_logo_512x512.png")}
    style={styles.headerLogo}
    resizeMode="contain"
  />

        <Text style={styles.headerTitle}>Maps</Text>

        <Text style={styles.arrow}>⌄</Text>
      </LinearGradient>

      {/* Fake Map Area */}
      <View style={styles.mapArea}>
        {/* Map background lines */}
        <View style={styles.roadOne} />
        <View style={styles.roadTwo} />
        <View style={styles.roadThree} />
        <View style={styles.roadFour} />

        <View style={styles.greenAreaOne} />
        <View style={styles.greenAreaTwo} />

        {/* User Location */}
        <View style={styles.userLocation}>
          <View style={styles.userDot} />
        </View>

        {/* Party Marker P1 */}
        <TouchableOpacity
          style={[styles.marker, styles.partyOne]}
          onPress={() =>
            openPartyPopup({
              title: "80s Party",
              location: "Retro Club Munich",
              time: "Tonight · 22:00",
              description:
                "Dance to classic 80s hits, retro lights and old-school vibes.",
              color: "#FF4D5A",
            })
          }
        >
          <Text style={styles.markerText}>P</Text>
        </TouchableOpacity>

        {/* Party Marker P2 */}
        <TouchableOpacity
          style={[styles.marker, styles.partyTwo]}
          onPress={() =>
            openPartyPopup({
              title: "Techno Party",
              location: "Underground Hall",
              time: "Tonight · 23:30",
              description:
                "Dark room, heavy bass, electronic sound and techno crowd.",
              color: "#FF4D5A",
            })
          }
        >
          <Text style={styles.markerText}>P</Text>
        </TouchableOpacity>

        {/* Other demo markers */}
        <View style={[styles.smallMarker, styles.foodOne]}>
          <Text style={styles.smallMarkerText}>🍴</Text>
        </View>

        <View style={[styles.smallMarker, styles.shopOne]}>
          <Text style={styles.smallMarkerText}>🛍</Text>
        </View>

        <View style={[styles.smallMarker, styles.blueOne]}>
          <Text style={styles.smallMarkerText}>B</Text>
        </View>

        <View style={[styles.smallMarker, styles.blueTwo]}>
          <Text style={styles.smallMarkerText}>B</Text>
        </View>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Text style={styles.navIcon}>⌂</Text>
        <Text style={styles.navIcon}>☏</Text>

        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>

        <Text style={styles.navIcon}>♧</Text>
        <Text style={styles.navIcon}>♙</Text>
      </View>

      {/* Popup Modal */}
      <Modal
        transparent={true}
        visible={selectedParty !== null}
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={closePopup}>
          <Pressable style={styles.popupCard}>
            <View
              style={[
                styles.popupIcon,
                { backgroundColor: selectedParty?.color || "#FF4D5A" },
              ]}
            >
              <Text style={styles.popupIconText}>P</Text>
            </View>

            <Text style={styles.popupTitle}>{selectedParty?.title}</Text>
            <Text style={styles.popupLocation}>{selectedParty?.location}</Text>
            <Text style={styles.popupTime}>{selectedParty?.time}</Text>

            <Text style={styles.popupDescription}>
              {selectedParty?.description}
            </Text>

            <TouchableOpacity style={styles.joinButton} onPress={closePopup}>
              <Text style={styles.joinButtonText}>Show Party</Text>
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
    backgroundColor: "#111111",
  },

  header: {
    height: 105,
    paddingTop: 35,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },

logoCircle: {
  position: "absolute",
  top: 14,
  left: 12,
  width: 54,
  height: 54,
  alignItems: "center",
  justifyContent: "center",
},

headerLogo: {
  width: 52,
  height: 52,
},

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "500",
    textAlign: "center",
  },

  arrow: {
    color: "#2B003D",
    fontSize: 32,
    marginTop: 12,
  },

  mapArea: {
    flex: 1,
    backgroundColor: "#F1F3F4",
    overflow: "hidden",
  },

  roadOne: {
    position: "absolute",
    width: 520,
    height: 42,
    backgroundColor: "#FFFFFF",
    top: 70,
    left: -100,
    transform: [{ rotate: "-25deg" }],
  },

  roadTwo: {
    position: "absolute",
    width: 520,
    height: 38,
    backgroundColor: "#FFFFFF",
    top: 220,
    left: -90,
    transform: [{ rotate: "25deg" }],
  },

  roadThree: {
    position: "absolute",
    width: 430,
    height: 32,
    backgroundColor: "#FFFFFF",
    top: 360,
    left: -40,
    transform: [{ rotate: "-20deg" }],
  },

  roadFour: {
    position: "absolute",
    width: 35,
    height: 700,
    backgroundColor: "#FFFFFF",
    top: -40,
    left: 185,
    transform: [{ rotate: "15deg" }],
  },

  greenAreaOne: {
    position: "absolute",
    width: 180,
    height: 210,
    backgroundColor: "#BFEFC7",
    bottom: -40,
    left: -35,
    borderRadius: 30,
    transform: [{ rotate: "-15deg" }],
  },

  greenAreaTwo: {
    position: "absolute",
    width: 90,
    height: 90,
    backgroundColor: "#BFEFC7",
    top: 20,
    right: -25,
    borderRadius: 20,
  },

  userLocation: {
    position: "absolute",
    top: 150,
    left: 70,
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "rgba(48, 130, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  userDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2F80ED",
    borderWidth: 3,
    borderColor: "#8FC0FF",
  },

  marker: {
    position: "absolute",
    width: 34,
    height: 43,
    borderRadius: 17,
    backgroundColor: "#FF4D5A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  markerText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  partyOne: {
    top: 48,
    left: 148,
  },

  partyTwo: {
    top: 215,
    left: 38,
  },

  smallMarker: {
    position: "absolute",
    width: 31,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  smallMarkerText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  foodOne: {
    top: 72,
    left: 48,
    backgroundColor: "#FF8C5A",
  },

  shopOne: {
    bottom: 72,
    right: 62,
    backgroundColor: "#F5A742",
  },

  blueOne: {
    top: 145,
    right: 58,
    backgroundColor: "#48A4FF",
  },

  blueTwo: {
    top: 235,
    right: 128,
    backgroundColor: "#2F80ED",
  },

  bottomNav: {
    height: 78,
    backgroundColor: "#070707",
    borderTopWidth: 16,
    borderTopColor: "#4B155F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 12,
  },

  navIcon: {
    color: "#9D5AC4",
    fontSize: 22,
  },

  addButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#8E44C4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -30,
    borderWidth: 5,
    borderColor: "#070707",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "500",
    marginTop: -3,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  popupCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
  },

  popupIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  popupIconText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },

  popupTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#191919",
    marginBottom: 6,
  },

  popupLocation: {
    fontSize: 16,
    color: "#6B6B6B",
    marginBottom: 4,
  },

  popupTime: {
    fontSize: 15,
    color: "#8E44C4",
    fontWeight: "700",
    marginBottom: 14,
  },

  popupDescription: {
    fontSize: 15,
    color: "#444444",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  joinButton: {
    backgroundColor: "#8E44C4",
    paddingVertical: 13,
    paddingHorizontal: 36,
    borderRadius: 24,
    marginBottom: 14,
  },

  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  closeText: {
    color: "#777777",
    fontSize: 15,
  },
});