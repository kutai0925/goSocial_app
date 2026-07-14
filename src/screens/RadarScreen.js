import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  Text,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Accelerometer } from "expo-sensors";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CENTER = 225; // Center of the 450x450 radar container

// Radius of the 5 concentric circles
const CIRCLE_RADII = [55, 95, 135, 175, 215];

// Circle colors (from inner/darker to outer/lighter for a progressive fade)
const CIRCLE_COLORS = [
  "rgba(143, 76, 199, 0.25)",
  "rgba(160, 95, 215, 0.35)",
  "rgba(180, 115, 235, 0.45)",
  "rgba(200, 135, 255, 0.55)",
  "rgba(219, 165, 255, 0.65)",
];

const generateMockDots = (userLat, userLon) => {
  const list = [];

  // 3 Friends with actual profile pic URLs from loremflickr
  const friends = [
    { id: "friend1", username: "Sarah", img: "https://loremflickr.com/120/120/girl,portrait,face/all?lock=10", r: 85, angle: 45 },
    { id: "friend2", username: "Alex", img: "https://loremflickr.com/120/120/boy,portrait,face/all?lock=20", r: 155, angle: 210 },
    { id: "friend3", username: "Sophia", img: "https://loremflickr.com/120/120/woman,portrait,face/all?lock=30", r: 195, angle: 315 },
  ];

  friends.forEach(f => {
    const angleRad = (f.angle * Math.PI) / 180;
    const x = f.r * Math.cos(angleRad);
    const y = f.r * Math.sin(angleRad);

    // Back-calculate lat/lon offsets
    const MAX_RANGE_DEG = 0.0045; // 500m
    const scale = 215 / MAX_RANGE_DEG;
    const dLon = x / scale;
    const dLat = -y / scale;

    const userLatRad = (userLat * Math.PI) / 180;
    const lon = userLon + dLon / Math.cos(userLatRad);
    const lat = userLat + dLat;

    list.push({
      user_id: f.id,
      username: f.username,
      profile_pic_url: f.img,
      coordinates: { lat, lon, accuracy: 10 },
      x,
      y,
      size: 40, // Increased from 36 for better readability
      distanceMeters: Math.round((f.r / 215) * 500),
      isFriend: true
    });
  });

  // 15 Anonymous/Black dots
  const anonConfig = [
    { r: 40, angle: 120 }, { r: 50, angle: 280 }, { r: 70, angle: 10 }, { r: 90, angle: 160 },
    { r: 100, angle: 300 }, { r: 120, angle: 75 }, { r: 130, angle: 220 }, { r: 140, angle: 340 },
    { r: 160, angle: 105 }, { r: 170, angle: 190 }, { r: 180, angle: 270 }, { r: 200, angle: 15 },
    { r: 205, angle: 140 }, { r: 210, angle: 245 }, { r: 215, angle: 90 }
  ];

  anonConfig.forEach((cfg, idx) => {
    const angleRad = (cfg.angle * Math.PI) / 180;
    const x = cfg.r * Math.cos(angleRad);
    const y = cfg.r * Math.sin(angleRad);

    const MAX_RANGE_DEG = 0.0045;
    const scale = 215 / MAX_RANGE_DEG;
    const dLon = x / scale;
    const dLat = -y / scale;

    const userLatRad = (userLat * Math.PI) / 180;
    const lon = userLon + dLon / Math.cos(userLatRad);
    const lat = userLat + dLat;

    const isTopHalf = y < 0;

    list.push({
      user_id: `anon_${idx}`,
      username: null,
      profile_pic_url: null,
      coordinates: { lat, lon, accuracy: 25 },
      x,
      y,
      size: 18, // Increased from 14 for easier visual tracking and interaction
      distanceMeters: Math.round((cfg.r / 215) * 500),
      isFriend: false,
      isTopHalf
    });
  });

  return list;
};

export default function RadarScreen({ onClose }) {
  const [selectedDot, setSelectedDot] = useState(null);
  const [dots, setDots] = useState([]);
  const [userCoords, setUserCoords] = useState(null);

  // Animation values
  const revealAnim = useRef(new Animated.Value(0.1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Concentric circles opacities
  const circleOpacities = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Active ping breathing animation for dots
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Refs for sensor and audio subscriptions/instances
  const sensorSubRef = useRef(null);
  const soundRef = useRef(null);
  const fadeIntervalRef = useRef(null);

  // High-performance refs for Accelerometer smoothing and shortest-path calculation
  const accelX = useRef(0);
  const accelY = useRef(0);
  const currentAngleRef = useRef(0);

  useEffect(() => {
    // 1. Load user location and populate dynamic dots relative to it
    const loadLocationAndDots = async () => {
      let lat = 48.1351; // Munich default
      let lon = 11.5820;
      try {
        const cached = await AsyncStorage.getItem("user_cached_location");
        if (cached) {
          const coords = JSON.parse(cached);
          lat = coords.latitude;
          lon = coords.longitude;
        }
      } catch (err) {
        console.log("Error loading cached location in radar:", err);
      }
      setUserCoords({ latitude: lat, longitude: lon });
      setDots(generateMockDots(lat, lon));
    };

    loadLocationAndDots();

    // 2. Configure and play the radar audio
    loadAndPlaySound();

    // 3. Configure and subscribe to accelerometer sensor updates
    subscribeSensors();

    // 4. Trigger the circular reveal scale animation from the plus button
    Animated.timing(revealAnim, {
      toValue: 35,
      duration: 450,
      useNativeDriver: true,
    }).start(() => {
      // 5. Once the reveal circle covers the screen, fade in the Radar content container
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        // 6. Pop in the central avatar with a spring physics animation
        Animated.spring(avatarScale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }).start();

        // 7. Stagger the fade-in of the concentric circles progressively outwards
        Animated.stagger(
          120,
          circleOpacities.map((anim) =>
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            })
          )
        ).start();
      });
    });

    // 8. Start the breathing loop for the active radar dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Cleanup resources on unmount
    return () => {
      unsubscribeSensors();
      cleanupAudio();
    };
  }, []);

  // Sensor Subscription
  const subscribeSensors = () => {
    // Reset smoothing and rotation state on mount/activation
    accelX.current = 0;
    accelY.current = 0;
    currentAngleRef.current = 0;
    rotationAnim.setValue(0);

    Accelerometer.setUpdateInterval(40); // 40ms updates for buttery-smooth responsiveness
    const sub = Accelerometer.addListener((data) => {
      const { x, y } = data;

      // 1. Low-Pass Filter (LPF) to filter out jitter/hand tremors (alpha = 0.15)
      const alpha = 0.15;
      accelX.current = alpha * x + (1 - alpha) * accelX.current;
      accelY.current = alpha * y + (1 - alpha) * accelY.current;

      // 2. Compute absolute angle based on filtered values
      const rawAngle = Math.atan2(-accelX.current, -accelY.current) * (180 / Math.PI);

      // 3. Shortest-path angular interpolation to avoid wrap-around jumps (mod 360 transition)
      let diff = rawAngle - (currentAngleRef.current % 360);
      diff = Math.atan2(Math.sin((diff * Math.PI) / 180), Math.cos((diff * Math.PI) / 180)) * (180 / Math.PI);

      const targetAngle = currentAngleRef.current + diff;
      currentAngleRef.current = targetAngle;

      // 4. Spring animation to target angle with damping
      Animated.spring(rotationAnim, {
        toValue: targetAngle,
        tension: 20,  // Lower tension for inertia feel
        friction: 12, // High friction to prevent spring overshoot oscillations
        useNativeDriver: true,
      }).start();
    });
    sensorSubRef.current = sub;
  };

  const unsubscribeSensors = () => {
    if (sensorSubRef.current) {
      sensorSubRef.current.remove();
      sensorSubRef.current = null;
    }
  };

  // Audio Playback
  const loadAndPlaySound = async () => {
    try {
      // Ensure audio plays correctly on iOS even when the physical silent switch is flipped
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldRouteThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/radar.wav"),
        {
          shouldPlay: true,
          isLooping: true,
          volume: 0, // Start at 0 volume for smooth fade-in
        }
      );
      soundRef.current = sound;

      // Fade in the volume
      fadeInSound(sound);
    } catch (error) {
      console.log("Error loading audio:", error);
    }
  };

  const fadeInSound = (sound) => {
    let vol = 0;
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    fadeIntervalRef.current = setInterval(async () => {
      vol += 0.05;
      if (vol >= 1.0) {
        vol = 1.0;
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      if (sound) {
        try {
          await sound.setVolumeAsync(vol);
        } catch (err) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      }
    }, 20); // 400ms fade-in duration total
  };

  const fadeOutAndUnloadSound = () => {
    const sound = soundRef.current;
    if (!sound) return Promise.resolve();

    let vol = 1.0;
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    return new Promise((resolve) => {
      fadeIntervalRef.current = setInterval(async () => {
        vol -= 0.05;
        if (vol <= 0) {
          vol = 0;
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          try {
            await sound.stopAsync();
            await sound.unloadAsync();
            soundRef.current = null;
          } catch (err) {
            // silent catch
          }
          resolve();
        } else {
          if (sound) {
            try {
              await sound.setVolumeAsync(vol);
            } catch (err) {
              clearInterval(fadeIntervalRef.current);
              fadeIntervalRef.current = null;
              resolve();
            }
          }
        }
      }, 20); // 400ms fade-out duration total
    });
  };

  const cleanupAudio = () => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => { });
      soundRef.current = null;
    }
  };

  const handleClose = async () => {
    // 1. Fade out the sound first/in parallel with exit animations
    fadeOutAndUnloadSound();

    // 2. Reverse transition for a symmetric close animation
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(avatarScale, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      ...circleOpacities.map((anim) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ),
    ]).start(() => {
      // 3. Shrink the reveal circle back down to the center button location
      Animated.timing(revealAnim, {
        toValue: 0.1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onClose();
      });
    });
  };

  const handleDotPress = (dot) => {
    if (selectedDot?.user_id === dot.user_id) {
      setSelectedDot(null); // Deselect if pressed again
    } else {
      setSelectedDot(dot);
    }
  };

  const handleBackgroundPress = () => {
    if (selectedDot) {
      setSelectedDot(null);
    }
  };

  const getDotStyle = (x, y, size) => {
    return {
      position: "absolute",
      left: CENTER + x - size / 2,
      top: CENTER + y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      shadowColor: "#000000",
      shadowOpacity: 0.25,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 3,
    };
  };

  // Interpolate the rotation animation value into degree units
  const rotationInterpolate = rotationAnim.interpolate({
    inputRange: [-180, 180],
    outputRange: ["-180deg", "180deg"],
  });

  return (
    <View style={styles.fullscreenContainer}>
      <StatusBar barStyle="light-content" />

      {/* Expanding reveal circle (starts at plus button, scales up to cover screen) */}
      <Animated.View
        style={[
          styles.revealCircle,
          {
            transform: [{ scale: revealAnim }],
          },
        ]}
      />

      {/* Main content layer, containing gradient background and radar elements */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: contentOpacity,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleBackgroundPress}>
          <LinearGradient
            colors={["#8F4CC7", "#130022"]}
            style={StyleSheet.absoluteFillObject}
          />
        </Pressable>

        {/* Radar concentric layout container */}
        <View style={styles.radarContainer}>
          {/* Animated sub-wrapper to rotate circles & dots based on accelerometer tilt */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                transform: [{ rotate: rotationInterpolate }],
              },
            ]}
          >
            {CIRCLE_RADII.map((radius, index) => {
              const circleOpacity = circleOpacities[index];

              return (
                <Animated.View
                  key={`circle-${index}`}
                  style={[
                    styles.radarCircle,
                    {
                      width: radius * 2,
                      height: radius * 2,
                      borderRadius: radius,
                      left: CENTER - radius,
                      top: CENTER - radius,
                      borderColor: CIRCLE_COLORS[index],
                      opacity: circleOpacity,
                    },
                  ]}
                />
              );
            })}

            {/* Dynamic radar dots */}
            {dots.map((dot) => {
              const isSelected = selectedDot?.user_id === dot.user_id;
              const hasSelection = selectedDot !== null;

              const dotScale = isSelected ? 1.5 : (hasSelection ? 0.7 : pulseAnim);
              const dotOpacity = isSelected ? 1.0 : (hasSelection ? 0.45 : 1.0);

              return (
                <Animated.View
                  key={dot.user_id}
                  style={[
                    getDotStyle(dot.x, dot.y, dot.size),
                    {
                      opacity: dotOpacity,
                      transform: [{ scale: dotScale }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleDotPress(dot)}
                    style={styles.touchableDot}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // Expand touch bounds to 44x44+ for touch target compliance
                  >
                    {dot.profile_pic_url ? (
                      <Image
                        source={{ uri: dot.profile_pic_url }}
                        style={[
                          styles.friendAvatar,
                          { borderColor: isSelected ? "#FF2E93" : "#FFFFFF" }
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.innerDot,
                          { backgroundColor: dot.isTopHalf ? "#8F4CC7" : "#000000" }
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.View>

          {/* Central Avatar (Rendered outside the rotating sub-wrapper so it stays upright) */}
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{ scale: avatarScale }],
              },
            ]}
          >
            <Image
              source={require("../../assets/images/radar_avatar.png")}
              style={styles.avatarImage}
            />
          </Animated.View>
        </View>

        {/* Selected Dot Glassmorphic Details Card */}
        {selectedDot && (
          <View style={styles.detailsCard}>
            {selectedDot.profile_pic_url ? (
              <Image
                source={{ uri: selectedDot.profile_pic_url }}
                style={styles.cardAvatar}
              />
            ) : (
              <View style={styles.cardAnonAvatar}>
                <Text style={styles.cardAnonIcon}>👤</Text>
              </View>
            )}

            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>
                {selectedDot.username || "Mystery User"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {selectedDot.distanceMeters}m away • {selectedDot.isFriend ? "98% Screen-Free" : "Nearby Social Zone"}
              </Text>
            </View>

            {selectedDot.isFriend ? (
              <TouchableOpacity style={styles.cardButton} activeOpacity={0.8}>
                <Text style={styles.cardButtonText}>Say Hello</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cardAnonButton} activeOpacity={0.8}>
                <Text style={styles.cardAnonButtonText}>Send Wave</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Close Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.closeButton}
          onPress={handleClose}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 9999,
  },

  revealCircle: {
    position: "absolute",
    left: SCREEN_WIDTH / 2 - 36,
    bottom: 38,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#8F4CC7",
  },

  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  radarContainer: {
    width: 450,
    height: 450,
    position: "absolute",
    top: SCREEN_HEIGHT / 2 - 225,
    left: SCREEN_WIDTH / 2 - 225,
  },

  radarCircle: {
    position: "absolute",
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },

  avatarContainer: {
    position: "absolute",
    left: CENTER - 40,
    top: CENTER - 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  closeButton: {
    position: "absolute",
    top: 54,
    right: 24,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },

  closeIcon: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  touchableDot: {
    width: "100%",
    height: "100%",
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },

  friendAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 99,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    resizeMode: "cover",
  },

  innerDot: {
    width: "100%",
    height: "100%",
    borderRadius: 99,
  },

  detailsCard: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: "rgba(25, 10, 42, 0.85)", // rich translucent purple glassmorphism
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  cardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.1,
    borderColor: "#FF2E93",
    resizeMode: "cover",
  },

  cardAnonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },

  cardAnonIcon: {
    fontSize: 22,
    color: "rgba(255, 255, 255, 0.6)",
  },

  cardTextContainer: {
    flex: 1,
    marginLeft: 14,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  cardSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
    marginTop: 2,
  },

  cardButton: {
    backgroundColor: "#FF2E93",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#FF2E93",
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  cardButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },

  cardAnonButton: {
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },

  cardAnonButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
