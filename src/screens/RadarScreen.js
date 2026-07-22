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
  Modal,
  Switch,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Magnetometer } from "expo-sensors";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatPopup from "../components/ChatPopup";
import ProfileScreen from "./ProfileScreen";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import {
  setLocation as setBackendLocation,
  getNearbyUsers,
  getUser,
} from "../api/users";
import { sendMessage, getMessages } from "../api/messages";
import { WS_BASE_URL } from "../api/config";

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

const generateBackendDots = (users, currentUserId, userLat, userLon) => {
  const list = [];
  users.forEach((u) => {
    if (u.user_id === currentUserId) return;
    if (!u.coordinates) return;

    const dLat = u.coordinates.lat - userLat;
    const userLatRad = (userLat * Math.PI) / 180;
    const dLon = (u.coordinates.lon - userLon) * Math.cos(userLatRad);

    const MAX_RANGE_DEG = 0.0045; // 500m
    const scale = 215 / MAX_RANGE_DEG;

    let x = dLon * scale;
    let y = -dLat * scale; // Note: -y because y axis goes down in UI

    let r = Math.sqrt(x * x + y * y);

    const distanceMeters = Math.round((r / 215) * 500); // Calculate real distance before visual pushout

    // If users are perfectly overlapping (like on emulators) or too close to the center avatar, push them out randomly
    if (r < 40) {
      const angle = Math.random() * Math.PI * 2;
      const pushOut = 45 + Math.random() * 20; // push outside the center avatar
      x = Math.cos(angle) * pushOut;
      y = Math.sin(angle) * pushOut;
      r = Math.sqrt(x * x + y * y);
    }

    const isTopHalf = y < 0;

    // Only include if within radar range roughly (plus some padding)
    if (r <= 250) {
      list.push({
        user_id: u.user_id,
        username: u.username,
        profile_pic_url: u.profile_image || null, // the backend will mask this if not accepted
        coordinates: u.coordinates,
        x,
        y,
        size: 40,
        distanceMeters,
        isFriend: u.relationship === "accepted",
        relationship: u.relationship || "none",
        isTopHalf,
      });
    }
  });
  return list;
};

export default function RadarScreen({ navigation }) {
  const { userId, username } = useAuth();
  const [selectedDot, setSelectedDot] = useState(null);
  const [dots, setDots] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [currentUserImage, setCurrentUserImage] = useState(null);
  const hasSyncedLocation = useRef(false);

  // Lifecycle ref to prevent async loading race conditions
  const isMounted = useRef(true);

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

  // Concentric circles scales for audio-pulsing animation
  const circleScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const lastTriggeredBeepRef = useRef(-1);

  // Active ping breathing animation for dots
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Refs for sensor and audio subscriptions/instances
  const sensorSubRef = useRef(null);
  const soundRef = useRef(null);
  const fadeIntervalRef = useRef(null);

  // High-performance refs for Magnetometer smoothing and shortest-path calculation
  const magX = useRef(0);
  const magY = useRef(0);
  const currentAngleRef = useRef(0);

  useEffect(() => {
    isMounted.current = true;

    // 1. Load user location and populate dynamic dots relative to it
    const loadLocationAndDots = async () => {
      let lat = 48.1351; // Munich default
      let lon = 11.582;
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
      if (isMounted.current) {
        setUserCoords({ latitude: lat, longitude: lon });

        // Fetch real users and combine with mock dots
        let backendDots = [];
        try {
          if (userId) {
            // Ensure backend knows our location even if we haven't visited the map
            if (!hasSyncedLocation.current) {
              try {
                await setBackendLocation(userId, { lat, lon, accuracy: 10 });
                hasSyncedLocation.current = true;
              } catch (e) {
                console.log("Failed to sync radar location:", e);
              }
            }

            const users = await getNearbyUsers(userId);
            backendDots = generateBackendDots(users, userId, lat, lon);

            const currentUser = await getUser(userId);
            if (currentUser && currentUser.profile_image) {
              setCurrentUserImage(currentUser.profile_image);
            }
          }
        } catch (e) {
          console.log("Error fetching radar nearby users/profile", e);
        }

        setDots(backendDots);
      }
    };

    loadLocationAndDots();

    let ws = null;
    if (userId) {
      ws = new WebSocket(`${WS_BASE_URL}/v1/ws/chat/${userId}`);
      ws.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (
            payload.event === "WAVE_UPDATE" ||
            payload.event === "LOCATION_UPDATE"
          ) {
            loadLocationAndDots();
          } else if (payload.message) {
            const m = payload.message;
            setActiveChat((prev) => {
              if (
                prev &&
                (prev.user_id === m.from_user_id ||
                  prev.user_id === m.to_user_id)
              ) {
                // The backend sends `id: 0` for all broadcasted messages, so we cannot use it for deduplication.
                // We use timestamp + message content to deduplicate, and assign a unique ID if it's 0.
                const isFromMe = m.from_user_id === userId;
                const exists = prev.messages.some(
                  (existing) =>
                    (existing.text === m.message &&
                      existing.timestamp === new Date(m.timestamp).getTime()) ||
                    (existing.text === m.message &&
                      existing.fromMe &&
                      isFromMe),
                );

                if (exists) return prev;

                return {
                  ...prev,
                  messages: [
                    ...prev.messages,
                    {
                      id:
                        m.id && m.id !== 0 && m.id !== "0"
                          ? m.id.toString()
                          : m.timestamp + Math.random().toString(),
                      text: m.message,
                      time: new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                      fromMe: m.from_user_id === userId,
                      timestamp: new Date(m.timestamp).getTime(),
                    },
                  ].sort((a, b) => a.timestamp - b.timestamp),
                };
              }
              return prev;
            });
          }
        } catch (err) {
          console.log("Radar ws error:", err);
        }
      };
    }

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
      if (!isMounted.current) return;
      // 5. Once the reveal circle covers the screen, fade in the Radar content container
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        if (!isMounted.current) return;
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
            }),
          ),
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
      ]),
    ).start();

    // Cleanup resources on unmount
    return () => {
      isMounted.current = false;
      if (ws) ws.close();
      unsubscribeSensors();
      cleanupAudio();
    };
  }, []);

  // Sensor Subscription
  const subscribeSensors = () => {
    // Reset smoothing and rotation state on mount/activation
    magX.current = 0;
    magY.current = 0;
    currentAngleRef.current = 0;
    rotationAnim.setValue(0);

    Magnetometer.setUpdateInterval(40); // 40ms updates for buttery-smooth responsiveness
    const sub = Magnetometer.addListener((data) => {
      if (!isMounted.current) return;
      const { x, y } = data;

      // 1. Low-Pass Filter (LPF) to filter out jitter/magnetic noise (alpha = 0.15)
      const alpha = 0.15;
      magX.current = alpha * x + (1 - alpha) * magX.current;
      magY.current = alpha * y + (1 - alpha) * magY.current;

      // 2. Compute angle for compass orientation (targetAngle = -heading)
      // Math.atan2(x, y) gives the correct -heading angle in radians directly.
      const rawAngle = Math.atan2(magX.current, magY.current) * (180 / Math.PI);

      // 3. Shortest-path angular interpolation to avoid wrap-around jumps (mod 360 transition)
      let diff = rawAngle - (currentAngleRef.current % 360);
      diff =
        Math.atan2(
          Math.sin((diff * Math.PI) / 180),
          Math.cos((diff * Math.PI) / 180),
        ) *
        (180 / Math.PI);

      const targetAngle = currentAngleRef.current + diff;
      currentAngleRef.current = targetAngle;

      // 4. Spring animation to target angle with damping
      Animated.spring(rotationAnim, {
        toValue: targetAngle,
        tension: 20, // Lower tension for inertia feel
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

  const triggerPulseWave = () => {
    // Reset scales to 1 first
    circleScales.forEach((scale) => scale.setValue(1));

    // Staggered timing/spring animation to propagate waves outward
    Animated.stagger(
      60, // 60ms delay between each circle's expansion
      circleScales.map((scale) =>
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.12,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1.0,
            tension: 40,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
      ),
    ).start();
  };

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded || !status.isPlaying) return;

    const pos = status.positionMillis;

    // Define the windows for our 4 beeps (each beep window is ~400ms wide):
    // Beep 0: 0 - 400 ms
    // Beep 1: 2500 - 2900 ms
    // Beep 2: 5200 - 5600 ms
    // Beep 3: 7950 - 8350 ms
    let currentBeepIndex = -1;
    if (pos >= 0 && pos < 400) {
      currentBeepIndex = 0;
    } else if (pos >= 2500 && pos < 2900) {
      currentBeepIndex = 1;
    } else if (pos >= 5200 && pos < 5600) {
      currentBeepIndex = 2;
    } else if (pos >= 7950 && pos < 8350) {
      currentBeepIndex = 3;
    }

    if (currentBeepIndex !== -1) {
      if (lastTriggeredBeepRef.current !== currentBeepIndex) {
        lastTriggeredBeepRef.current = currentBeepIndex;
        triggerPulseWave();
      }
    } else {
      // Reset the last triggered ref when we are in the silence between beeps
      lastTriggeredBeepRef.current = -1;
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
        require("../../assets/sounds/radar.mp3"),
        {
          shouldPlay: false, // Load paused
          isLooping: true,
          volume: 0, // Start at 0 volume for smooth fade-in
        },
      );

      // Abort if unmounted during network/disk loading time
      if (!isMounted.current) {
        await sound.unloadAsync();
        return;
      }

      soundRef.current = sound;

      // Sync concentric circles with sound pings
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      await sound.setProgressUpdateIntervalAsync(40); // 40ms updates for precise beep synchronization!

      await sound.playAsync();

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
            sound.setOnPlaybackStatusUpdate(null);
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
      soundRef.current.setOnPlaybackStatusUpdate(null);
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  };

  const handleClose = async () => {
    isMounted.current = false; // Mark unmounted immediately to abort any async loading callbacks!

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
        }),
      ),
    ]).start(() => {
      // 3. Shrink the reveal circle back down to the center button location
      Animated.timing(revealAnim, {
        toValue: 0.1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (navigation && navigation.goBack) {
          navigation.goBack();
        }
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

  const handleSayHello = async (dot) => {
    try {
      const msgList = await getMessages(userId);
      // Filter messages between currentUser and this dot
      const chatHistory = msgList
        .filter(
          (m) => m.from_user_id === dot.user_id || m.to_user_id === dot.user_id,
        )
        .map((m) => ({
          id: m.id.toString(),
          text: m.message,
          time: new Date(m.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          fromMe: m.from_user_id === userId,
          timestamp: new Date(m.timestamp).getTime(),
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      setActiveChat({
        user_id: dot.user_id,
        username: dot.username,
        profile_pic_url: dot.profile_pic_url,
        messages: chatHistory,
      });
    } catch (e) {
      console.log("Error loading chat history for popup:", e);
      setActiveChat({
        user_id: dot.user_id,
        username: dot.username,
        profile_pic_url: dot.profile_pic_url,
        messages: [],
      });
    }
  };

  const handleSendWave = async (dot) => {
    if (
      !userId ||
      !dot.user_id ||
      dot.user_id.startsWith("anon_") ||
      dot.user_id.startsWith("friend")
    )
      return;
    try {
      // Optimistically update UI
      setDots((prev) =>
        prev.map((d) =>
          d.user_id === dot.user_id ? { ...d, relationship: "sent" } : d,
        ),
      );
      setSelectedDot((prev) =>
        prev && prev.user_id === dot.user_id
          ? { ...prev, relationship: "sent" }
          : prev,
      );

      const { sendWave } = require("../api/users");
      await sendWave(userId, dot.user_id);
    } catch (err) {
      console.log("Error sending wave:", err);
    }
  };

  const handleAcceptWave = async (dot) => {
    if (!userId || !dot.user_id) return;
    try {
      setDots((prev) =>
        prev.map((d) =>
          d.user_id === dot.user_id
            ? { ...d, isFriend: true, relationship: "accepted" }
            : d,
        ),
      );
      setSelectedDot((prev) =>
        prev && prev.user_id === dot.user_id
          ? { ...prev, isFriend: true, relationship: "accepted" }
          : prev,
      );

      const { acceptWave } = require("../api/users");
      await acceptWave(userId, dot.user_id);
    } catch (err) {
      console.log("Error accepting wave:", err);
    }
  };

  const closeChatPopup = () => {
    setActiveChat(null);
  };

  const sendChatPopupMessage = async (text) => {
    if (!activeChat || !userId) return;

    try {
      // Optimistically add to UI BEFORE await
      setActiveChat((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: Date.now().toString(),
                  text,
                  time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  fromMe: true,
                  timestamp: Date.now(),
                },
              ],
            }
          : prev,
      );

      await sendMessage(userId, {
        message: text,
        toUserId: activeChat.user_id,
      });
    } catch (e) {
      console.log("Failed to send popup message:", e);
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

  const rotationInterpolate = rotationAnim.interpolate({
    inputRange: [-180, 180],
    outputRange: ["-180deg", "180deg"],
  });

  const inverseRotationInterpolate = rotationAnim.interpolate({
    inputRange: [-180, 180],
    outputRange: ["180deg", "-180deg"],
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
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleBackgroundPress}
        >
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
              const circleScale = circleScales[index];

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
                      transform: [{ scale: circleScale }],
                    },
                  ]}
                />
              );
            })}

            {/* Dynamic radar dots */}
            {dots.map((dot) => {
              const isSelected = selectedDot?.user_id === dot.user_id;
              const hasSelection = selectedDot !== null;

              const dotScale = isSelected
                ? 1.5
                : hasSelection
                  ? 0.7
                  : pulseAnim;
              const dotOpacity = isSelected ? 1.0 : hasSelection ? 0.45 : 1.0;

              return (
                <Animated.View
                  key={dot.user_id}
                  style={[
                    getDotStyle(dot.x, dot.y, dot.size),
                    {
                      opacity: dotOpacity,
                      transform: [
                        { scale: dotScale },
                        { rotate: inverseRotationInterpolate },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleDotPress(dot)}
                    style={styles.touchableDot}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // Expand touch bounds to 44x44+ for touch target compliance
                  >
                    {dot.isFriend ? (
                      <Avatar
                        url={dot.profile_pic_url}
                        name={dot.username}
                        size={44}
                        style={[
                          styles.friendAvatar,
                          { borderColor: isSelected ? "#FF2E93" : "#FFFFFF" },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.innerDot,
                          {
                            backgroundColor: dot.isTopHalf
                              ? "#8F4CC7"
                              : "#000000",
                          },
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
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowProfile(true)}
            >
              {currentUserImage ? (
                <Image
                  source={{ uri: currentUserImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <View
                  style={[
                    styles.avatarImage,
                    {
                      backgroundColor: "#8F4CC7",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: 24,
                    }}
                  >
                    {username ? username.charAt(0).toUpperCase() : ""}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Selected Dot Glassmorphic Details Card */}
        {selectedDot && (
          <View style={styles.detailsCard}>
            <TouchableOpacity
              activeOpacity={selectedDot.isFriend ? 0.8 : 1}
              onPress={() => {
                if (selectedDot.isFriend) {
                  setSelectedProfileUserId(selectedDot.user_id);
                }
              }}
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              disabled={!selectedDot.isFriend}
            >
              {selectedDot.profile_pic_url ? (
                <Image
                  source={{ uri: selectedDot.profile_pic_url }}
                  style={styles.cardAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.cardAvatar,
                    {
                      backgroundColor: "#8F4CC7",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: 20,
                    }}
                  >
                    {selectedDot.username
                      ? selectedDot.username.charAt(0).toUpperCase()
                      : ""}
                  </Text>
                </View>
              )}

              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {selectedDot.username || "Mystery User"}
                </Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {selectedDot.distanceMeters}m •{" "}
                  {selectedDot.isFriend ? "Friend" : "Nearby"}
                </Text>
              </View>
            </TouchableOpacity>

            {selectedDot.isFriend ? (
              <TouchableOpacity
                style={styles.cardButton}
                activeOpacity={0.8}
                onPress={() => handleSayHello(selectedDot)}
              >
                <Text style={styles.cardButtonText}>Say Hello</Text>
              </TouchableOpacity>
            ) : selectedDot.relationship === "sent" ? (
              <TouchableOpacity
                style={[styles.cardAnonButton, { opacity: 0.5 }]}
                disabled
              >
                <Text style={styles.cardAnonButtonText}>Wave Sent</Text>
              </TouchableOpacity>
            ) : selectedDot.relationship === "received" ? (
              <TouchableOpacity
                style={[styles.cardAnonButton, { backgroundColor: "#FF2E93" }]}
                activeOpacity={0.8}
                onPress={() => handleAcceptWave(selectedDot)}
              >
                <Text style={styles.cardAnonButtonText}>Accept Wave</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.cardAnonButton}
                activeOpacity={0.8}
                onPress={() => handleSendWave(selectedDot)}
              >
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

      <ChatPopup
        visible={activeChat !== null}
        friend={activeChat}
        onClose={closeChatPopup}
        onSend={sendChatPopupMessage}
      />

      <Modal
        visible={showProfile || !!selectedProfileUserId}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowProfile(false);
          setSelectedProfileUserId(null);
        }}
      >
        <ProfileScreen
          route={{ params: { userId: selectedProfileUserId || userId } }}
          onClose={() => {
            setShowProfile(false);
            setSelectedProfileUserId(null);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 9999,
    elevation: 9999,
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
