import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Accelerometer } from "expo-sensors";
import { Audio } from "expo-av";

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

// Dots distribution based on the screenshot
const DOTS_DATA = [
  // Circle 1 (r=55)
  { circleIndex: 0, angle: 75, size: 14 },
  { circleIndex: 0, angle: 105, size: 14 },
  { circleIndex: 0, angle: 220, size: 14 },
  { circleIndex: 0, angle: 320, size: 14 },

  // Circle 2 (r=95)
  { circleIndex: 1, angle: 30, size: 14 },
  { circleIndex: 1, angle: 140, size: 14 },
  { circleIndex: 1, angle: 250, size: 14 },
  { circleIndex: 1, angle: 280, size: 14 },

  // Circle 3 (r=135)
  { circleIndex: 2, angle: 0, size: 14 },
  { circleIndex: 2, angle: 90, size: 14 },
  { circleIndex: 2, angle: 190, size: 14 },
  { circleIndex: 2, angle: 290, size: 14 },

  // Circle 4 (r=175)
  { circleIndex: 3, angle: 60, size: 16 },
  { circleIndex: 3, angle: 120, size: 16 },
  { circleIndex: 3, angle: 200, size: 14 },
  { circleIndex: 3, angle: 340, size: 14 },

  // Circle 5 (r=215)
  { circleIndex: 4, angle: 15, size: 16 },
  { circleIndex: 4, angle: 100, size: 16 },
  { circleIndex: 4, angle: 165, size: 16 },
  { circleIndex: 4, angle: 245, size: 14 },
  { circleIndex: 4, angle: 305, size: 14 },
];

export default function RadarScreen({ onClose }) {
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
    // 1. Configure and play the radar audio
    loadAndPlaySound();

    // 2. Configure and subscribe to accelerometer sensor updates
    subscribeSensors();

    // 3. Trigger the circular reveal scale animation from the plus button
    Animated.timing(revealAnim, {
      toValue: 35,
      duration: 450,
      useNativeDriver: true,
    }).start(() => {
      // 4. Once the reveal circle covers the screen, fade in the Radar content container
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        // 5. Pop in the central avatar with a spring physics animation
        Animated.spring(avatarScale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }).start();

        // 6. Stagger the fade-in of the concentric circles progressively outwards
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

    // 7. Start the breathing loop for the active radar dots
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

  // Trigonometry helper to position dots along the circle paths
  const getDotStyle = (radius, angle, size) => {
    const angleRad = (angle * Math.PI) / 180;
    const x = radius * Math.cos(angleRad);
    const y = radius * Math.sin(angleRad);

    // If y is negative (above the center coordinate), it's in the top half.
    // We style it dark purple. If y is positive, it's bottom half, style it black.
    const isTopHalf = y < 0;
    const backgroundColor = isTopHalf ? "#230538" : "#000000";

    return {
      position: "absolute",
      left: CENTER + x - size / 2,
      top: CENTER + y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
      shadowColor: "#000000",
      shadowOpacity: 0.2,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
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
        <LinearGradient
          colors={["#8F4CC7", "#130022"]}
          style={StyleSheet.absoluteFillObject}
        />

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
                <React.Fragment key={`circle-${index}`}>
                  {/* Concentric Circle Line */}
                  <Animated.View
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

                  {/* Dots on this circle */}
                  {DOTS_DATA.filter((dot) => dot.circleIndex === index).map(
                    (dot, dotIdx) => (
                      <Animated.View
                        key={`dot-${index}-${dotIdx}`}
                        style={[
                          getDotStyle(radius, dot.angle, dot.size),
                          {
                            opacity: circleOpacity,
                            transform: [{ scale: pulseAnim }],
                          },
                        ]}
                      />
                    )
                  )}
                </React.Fragment>
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
});
