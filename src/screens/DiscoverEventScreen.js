import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import eventsData from "../data/events.json";
import EventSummaryScreen from "./EventSummaryScreen";
import { getCategoryStyle } from "../utils/categoryStyles";
import { useAuth } from "../context/AuthContext";
import { getUser } from "../api/users";

const EVENT_IMAGES = {
  party1:
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop",
  party2:
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop",
  party3:
    "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&h=600&fit=crop",
  food1:
    "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800&h=600&fit=crop",
  food2:
    "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=600&fit=crop",
  food3:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop",
  blue1:
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&h=600&fit=crop",
  blue2:
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
  blue3:
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop",
  purple1:
    "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&h=600&fit=crop",
  purple2:
    "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&h=600&fit=crop",
  yellow1:
    "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&h=600&fit=crop",
  yellow2:
    "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&h=600&fit=crop",
  yellow3:
    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=600&fit=crop",
};

function EventImage({ event, style, fallbackTextStyle, failed, onError }) {
  const categoryStyle = getCategoryStyle(event.category);

  if (event.imageUrl && !failed) {
    return (
      <Image source={{ uri: event.imageUrl }} style={style} onError={onError} />
    );
  }

  return (
    <View
      style={[
        style,
        styles.imageFallback,
        { backgroundColor: categoryStyle.bg },
      ]}
    >
      <Text style={[fallbackTextStyle, { color: categoryStyle.text }]}>
        {event.category[0]}
      </Text>
    </View>
  );
}

export default function DiscoverEventScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [failedImages, setFailedImages] = useState({});
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const { userId } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function loadUser() {
      if (!userId) return;
      try {
        const user = await getUser(userId);
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to fetch user in discover", err);
      }
    }
    loadUser();
  }, [userId]);

  useEffect(() => {
    async function loadEvents() {
      try {
        const formatted = eventsData.map((e) => ({
          ...e,
          locationName: e.locationName || e.location_name,
          imageUrl: EVENT_IMAGES[e.id] || null,
        }));
        setEvents(formatted);
      } catch (err) {
        console.error("Failed to fetch events", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const featuredEvents = events.filter(
    (event) =>
      event.time.startsWith("Tonight") ||
      event.time.toLowerCase().includes("tonight"),
  );

  const query = searchQuery.trim().toLowerCase();
  const filteredEvents = events.filter((event) => {
    if (!query) return true;
    return (
      event.category.toLowerCase().includes(query) ||
      event.title.toLowerCase().includes(query) ||
      (event.locationName || "").toLowerCase().includes(query)
    );
  });

  const markImageFailed = (id) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Discover</Text>
            <View style={styles.headerDot} />
          </View>
          {currentUser && currentUser.profile_image ? (
            <Image
              source={{ uri: currentUser.profile_image }}
              style={styles.headerAvatar}
            />
          ) : (
            <View
              style={[
                styles.headerAvatar,
                {
                  backgroundColor: "#8F4CC7",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Text
                style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 18 }}
              >
                {currentUser && currentUser.first_name
                  ? currentUser.first_name.charAt(0).toUpperCase()
                  : currentUser && currentUser.username
                    ? currentUser.username.charAt(0).toUpperCase()
                    : ""}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, places, categories..."
            placeholderTextColor="rgba(42, 18, 64, 0.5)"
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {featuredEvents.map((event) => {
            const categoryStyle = getCategoryStyle(event.category);
            return (
              <TouchableOpacity
                key={event.id}
                style={styles.carouselCard}
                activeOpacity={0.85}
                onPress={() => setSelectedEvent(event)}
              >
                <EventImage
                  event={event}
                  style={styles.carouselImage}
                  fallbackTextStyle={styles.carouselFallbackText}
                  failed={failedImages[event.id]}
                  onError={() => markImageFailed(event.id)}
                />
                <View
                  style={[
                    styles.carouselBadge,
                    { backgroundColor: categoryStyle.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.carouselBadgeText,
                      { color: categoryStyle.text },
                    ]}
                  >
                    {event.category}
                  </Text>
                </View>
                <Text style={styles.carouselCaption} numberOfLines={1}>
                  {event.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.feed}>
          {filteredEvents.map((event) => {
            const categoryStyle = getCategoryStyle(event.category);
            return (
              <View key={event.id} style={styles.feedItem}>
                <View style={styles.feedHeaderRow}>
                  <View
                    style={[
                      styles.feedAvatar,
                      { backgroundColor: categoryStyle.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.feedAvatarText,
                        { color: categoryStyle.text },
                      ]}
                    >
                      {event.category[0]}
                    </Text>
                  </View>
                  <View style={styles.feedHeaderText}>
                    <Text style={styles.feedTitle}>{event.title}</Text>
                    <Text style={styles.feedSubtitle}>
                      {event.category} · {event.locationName}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setSelectedEvent(event)}
                >
                  <EventImage
                    event={event}
                    style={styles.feedImage}
                    fallbackTextStyle={styles.feedFallbackText}
                    failed={failedImages[event.id]}
                    onError={() => markImageFailed(event.id)}
                  />
                </TouchableOpacity>

                <Text style={styles.feedMeta}>{event.time}</Text>
              </View>
            );
          })}

          {filteredEvents.length === 0 && (
            <Text style={styles.emptyText}>
              No events match "{searchQuery}"
            </Text>
          )}
        </View>
      </ScrollView>

      {selectedEvent && (
        <EventSummaryScreen
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#C9A0E8",
  },

  scrollContent: {
    paddingBottom: 24,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1E1E1E",
    marginRight: 8,
  },

  headerDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#FF2E93",
  },

  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    marginHorizontal: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(42, 18, 64, 0.15)",
  },

  searchIcon: {
    color: "#2A1240",
    fontSize: 18,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: "#2A1240",
    fontSize: 15,
  },

  clearIcon: {
    color: "rgba(42, 18, 64, 0.6)",
    fontSize: 15,
    paddingLeft: 10,
  },

  carousel: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 14,
  },

  carouselCard: {
    width: 150,
  },

  carouselImage: {
    width: 150,
    height: 110,
    borderRadius: 16,
  },

  carouselBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  carouselBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  carouselCaption: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#2A1240",
  },

  carouselFallbackText: {
    fontSize: 32,
    fontWeight: "800",
  },

  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },

  feed: {
    paddingHorizontal: 20,
  },

  feedItem: {
    marginBottom: 26,
  },

  feedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  feedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  feedAvatarText: {
    fontSize: 16,
    fontWeight: "800",
  },

  feedHeaderText: {
    flex: 1,
  },

  feedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1E1E",
  },

  feedSubtitle: {
    fontSize: 12,
    color: "#3A2A4A",
    marginTop: 1,
  },

  feedImage: {
    width: "100%",
    height: 220,
    borderRadius: 20,
  },

  feedFallbackText: {
    fontSize: 48,
    fontWeight: "800",
  },

  feedMeta: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#5A2377",
  },

  emptyText: {
    textAlign: "center",
    color: "#3A2A4A",
    fontSize: 14,
    marginTop: 20,
  },
});
