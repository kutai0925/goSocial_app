import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";
import { getCategoryStyle } from "../utils/categoryStyles";

export default function EventSummaryScreen({ event, onClose }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!event) return null;

  const categoryStyle = getCategoryStyle(event.category);

  return (
    <Modal
      visible
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <ScrollView bounces={false}>
          <View style={styles.imageWrapper}>
            {event.imageUrl && !imageFailed ? (
              <Image
                source={{ uri: event.imageUrl }}
                style={styles.image}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <View
                style={[
                  styles.image,
                  styles.imageFallback,
                  { backgroundColor: categoryStyle.bg },
                ]}
              >
                <Text style={styles.imageFallbackText}>
                  {event.category[0]}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.8}
              onPress={onClose}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>

            <View
              style={[
                styles.categoryTag,
                { backgroundColor: categoryStyle.bg },
              ]}
            >
              <Text
                style={[styles.categoryTagText, { color: categoryStyle.text }]}
              >
                {event.category}
              </Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.metaLine}>📍 {event.locationName}</Text>
            <Text style={styles.metaLine}>🕒 {event.time}</Text>

            <Text style={styles.description}>{event.description}</Text>

            <TouchableOpacity style={styles.goingButton} activeOpacity={0.85}>
              <Text style={styles.goingButtonText}>I'm Going</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#17061f",
  },

  imageWrapper: {
    width: "100%",
    height: 320,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },

  imageFallbackText: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "800",
  },

  closeButton: {
    position: "absolute",
    top: 54,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
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

  categoryTag: {
    position: "absolute",
    left: 20,
    bottom: -16,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  categoryTagText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  content: {
    padding: 24,
    paddingTop: 32,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 14,
  },

  metaLine: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 15,
    marginBottom: 6,
  },

  description: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 30,
  },

  goingButton: {
    backgroundColor: "#8F4CC7",
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: "center",
  },

  goingButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
