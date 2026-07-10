import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  StatusBar,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import BottomNavigation from "../components/BottomNavigation";

export default function MapScreen({ onNavigate }) {
  const [selectedParty, setSelectedParty] = useState(null);

  function openPartyPopup(party) {
    setSelectedParty(party);
  }

  function closePopup() {
    setSelectedParty(null);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#A63FDC", "#B95BE9"]}
        style={styles.header}
      >
        <Image
          source={require("../../assets/images/gosocial_logo_512x512.png")}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        <Text style={styles.headerTitle}>Maps</Text>

        <Text style={styles.downArrow}>⌄</Text>
      </LinearGradient>

      <View style={styles.mapContainer}>
        <View style={styles.fakeMap}>
          <View style={styles.roadOne} />
          <View style={styles.roadTwo} />
          <View style={styles.roadThree} />
          <View style={styles.roadFour} />
          <View style={styles.roadFive} />

          <View style={styles.greenAreaOne} />
          <View style={styles.greenAreaTwo} />
          <View style={styles.greenAreaThree} />

          <View style={styles.userLocation}>
            <View style={styles.userDot} />
          </View>

          <TouchableOpacity
            style={[styles.partyPin, styles.partyPinOne]}
            onPress={() =>
              openPartyPopup({
                title: "80s Party",
                location: "Retro Club Munich",
                time: "Tonight · 22:00",
                description:
                  "Classic 80s music, retro lights and old-school vibes.",
              })
            }
          >
            <Text style={styles.partyPinText}>P</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.partyPin, styles.partyPinTwo]}
            onPress={() =>
              openPartyPopup({
                title: "Techno Party",
                location: "Underground Hall",
                time: "Tonight · 23:30",
                description:
                  "Dark room, heavy bass, electronic sound and techno crowd.",
              })
            }
          >
            <Text style={styles.partyPinText}>P</Text>
          </TouchableOpacity>

          <View style={[styles.orangePin, styles.foodPinOne]}>
            <Text style={styles.smallPinText}>🍴</Text>
          </View>

          <View style={[styles.orangePin, styles.foodPinTwo]}>
            <Text style={styles.smallPinText}>🍴</Text>
          </View>

          <View style={[styles.bluePin, styles.bluePinOne]}>
            <Text style={styles.smallPinText}>▣</Text>
          </View>

          <View style={[styles.bluePin, styles.bluePinTwo]}>
            <Text style={styles.smallPinText}>▣</Text>
          </View>

          <View style={[styles.purplePin, styles.purplePinOne]}>
            <Text style={styles.smallPinText}>▬</Text>
          </View>

          <View style={[styles.yellowPin, styles.yellowPinOne]}>
            <Text style={styles.smallPinText}>▤</Text>
          </View>
        </View>
      </View>

      <BottomNavigation activeScreen="map" onNavigate={onNavigate} />

      <Modal
        visible={selectedParty !== null}
        transparent={true}
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={closePopup}>
          <Pressable style={styles.popupCard}>
            <View style={styles.popupIcon}>
              <Text style={styles.popupIconText}>P</Text>
            </View>

            <Text style={styles.popupTitle}>{selectedParty?.title}</Text>
            <Text style={styles.popupLocation}>{selectedParty?.location}</Text>
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
    height: 185,
    paddingTop: 28,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  headerLogo: {
    position: "absolute",
    top: 16,
    left: 17,
    width: 88,
    height: 88,
  },

  headerTitle: {
    color: "#FFFFFF",
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

  downArrow: {
    position: "absolute",
    left: 52,
    bottom: 22,
    color: "#111111",
    fontSize: 52,
    fontWeight: "200",
  },

  mapContainer: {
    flex: 1,
    backgroundColor: "#4B155F",
    paddingHorizontal: 6,
  },

  fakeMap: {
    flex: 1,
    backgroundColor: "#EEF2F3",
    borderWidth: 2,
    borderColor: "#5DADE2",
    overflow: "hidden",
    position: "relative",
  },

  roadOne: {
    position: "absolute",
    width: 720,
    height: 42,
    backgroundColor: "#FFFFFF",
    top: 50,
    left: -130,
    transform: [{ rotate: "-17deg" }],
  },

  roadTwo: {
    position: "absolute",
    width: 730,
    height: 36,
    backgroundColor: "#FFFFFF",
    top: 180,
    left: -180,
    transform: [{ rotate: "32deg" }],
  },

  roadThree: {
    position: "absolute",
    width: 680,
    height: 36,
    backgroundColor: "#FFFFFF",
    top: 360,
    left: -130,
    transform: [{ rotate: "-24deg" }],
  },

  roadFour: {
    position: "absolute",
    width: 44,
    height: 720,
    backgroundColor: "#FFFFFF",
    top: -60,
    left: 200,
    transform: [{ rotate: "12deg" }],
  },

  roadFive: {
    position: "absolute",
    width: 36,
    height: 700,
    backgroundColor: "#FFFFFF",
    top: -80,
    right: 82,
    transform: [{ rotate: "-9deg" }],
  },

  greenAreaOne: {
    position: "absolute",
    width: 170,
    height: 360,
    backgroundColor: "#BDEFC7",
    left: 70,
    bottom: -70,
    borderRadius: 30,
    transform: [{ rotate: "-8deg" }],
  },

  greenAreaTwo: {
    position: "absolute",
    width: 90,
    height: 150,
    backgroundColor: "#BDEFC7",
    top: 180,
    left: 5,
    borderRadius: 18,
    transform: [{ rotate: "-25deg" }],
  },

  greenAreaThree: {
    position: "absolute",
    width: 110,
    height: 90,
    backgroundColor: "#BDEFC7",
    top: 0,
    right: 16,
    borderRadius: 18,
  },

  userLocation: {
    position: "absolute",
    left: 82,
    top: 250,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(50, 130, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  userDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2E86FF",
    borderWidth: 5,
    borderColor: "rgba(80, 155, 255, 0.45)",
  },

  partyPin: {
    position: "absolute",
    width: 42,
    height: 56,
    borderRadius: 21,
    backgroundColor: "#FF4458",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },

  partyPinText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    marginTop: -5,
  },

  partyPinOne: {
    top: 115,
    left: 220,
  },

  partyPinTwo: {
    top: 345,
    left: 42,
  },

  orangePin: {
    position: "absolute",
    width: 40,
    height: 54,
    borderRadius: 20,
    backgroundColor: "#FF8E5E",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  foodPinOne: {
    top: 155,
    left: 65,
  },

  foodPinTwo: {
    bottom: 72,
    left: 48,
  },

  bluePin: {
    position: "absolute",
    width: 40,
    height: 54,
    borderRadius: 20,
    backgroundColor: "#2E86FF",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  bluePinOne: {
    top: 210,
    right: 67,
  },

  bluePinTwo: {
    top: 345,
    left: 210,
  },

  purplePin: {
    position: "absolute",
    width: 40,
    height: 54,
    borderRadius: 20,
    backgroundColor: "#805BFF",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  purplePinOne: {
    top: 380,
    right: 42,
  },

  yellowPin: {
    position: "absolute",
    width: 40,
    height: 54,
    borderRadius: 20,
    backgroundColor: "#F2A93B",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  yellowPinOne: {
    bottom: 95,
    right: 122,
  },

  smallPinText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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