import React, { useRef, useEffect, useState } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import ViewShot from "react-native-view-shot";

export default function MarkerGenerator({ users, onImagesReady }) {
  const [uris, setUris] = useState({});

  const handleCapture = (userId, uri) => {
    setUris((prev) => ({ ...prev, [userId]: uri }));
  };

  useEffect(() => {
    if (Object.keys(uris).length === users.length && users.length > 0) {
      onImagesReady(uris);
    }
  }, [uris, users, onImagesReady]);

  return (
    <View style={styles.hiddenContainer}>
      {users.map((user) => (
        <UserOffscreenMarker
          key={user.user_id}
          user={user}
          onCapture={(uri) => handleCapture(user.user_id, uri)}
        />
      ))}
    </View>
  );
}

const UserOffscreenMarker = ({ user, onCapture }) => {
  const ref = useRef();
  const size = 60; // Match iOS size
  const cleanUrl = user.profile_image
    ? user.profile_image.replace(/\s+/g, "")
    : null;
  const initial = user.username ? user.username.charAt(0).toUpperCase() : "?";

  // Capture once mounted and image loaded
  useEffect(() => {
    if (!cleanUrl) {
      setTimeout(() => takeSnapshot(), 100);
    }
  }, []);

  const takeSnapshot = () => {
    if (ref.current) {
      ref.current
        .capture()
        .then((uri) => {
          onCapture(uri);
        })
        .catch((e) => console.log("Snapshot failed", e));
    }
  };

  return (
    <ViewShot
      ref={ref}
      options={{ format: "png", quality: 1, result: "data-uri" }}
      style={{ width: size, height: size, backgroundColor: "transparent" }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: "#FFFFFF",
          backgroundColor: cleanUrl ? "#FFFFFF" : "#8B4CC2",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cleanUrl ? (
          <Image
            source={{ uri: cleanUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
            fadeDuration={0}
            onLoad={() => setTimeout(takeSnapshot, 100)}
          />
        ) : (
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "bold",
              fontSize: size * 0.45,
            }}
          >
            {initial}
          </Text>
        )}
      </View>
    </ViewShot>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    position: "absolute",
    top: -10000,
    left: -10000,
    opacity: 0,
  },
});
