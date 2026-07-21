import React, { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import Avatar from "../components/Avatar";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const EmojiParticle = ({ id, onComplete }) => {
  const animY = useRef(new Animated.Value(0)).current;
  const animX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const endY = -150 - Math.random() * 150;
    const endX = -100 + Math.random() * 200;

    Animated.parallel([
      Animated.timing(animY, {
        toValue: endY,
        duration: 800 + Math.random() * 400,
        useNativeDriver: true,
      }),
      Animated.timing(animX, {
        toValue: endX,
        duration: 800 + Math.random() * 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 800 + Math.random() * 400,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.5 + Math.random(),
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete(id));
  }, []);

  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: SCREEN_WIDTH / 2 - 14, // Center horizontally
        bottom: 60,
        opacity,
        transform: [{ translateX: animX }, { translateY: animY }, { scale }],
        fontSize: 28,
        zIndex: 1000,
      }}
    >
      ☺
    </Animated.Text>
  );
};

import { useAuth } from "../context/AuthContext";
import {
  getMessages,
  sendMessage as sendBackendMessage,
} from "../api/messages";
import { getNearbyUsers, acceptWave, declineWave } from "../api/users";
import { WS_BASE_URL } from "../api/config";

export default function ChatScreen({ route }) {
  const navigation = useNavigation();
  const { userId } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState(null);
  const selectedChatIdRef = React.useRef(selectedChatId);
  const [searchText, setSearchText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [chatData, setChatData] = useState([]);
  const [ws, setWs] = useState(null);

  const selectedChat = chatData.find((c) => c.id === selectedChatId) || null;

  useFocusEffect(
    useCallback(() => {
      selectedChatIdRef.current = selectedChatId;

      const onBackPress = () => {
        if (selectedChatIdRef.current) {
          setSelectedChatId(null);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [selectedChatId]),
  );

  // Auto-open chat if navigated with openChatWithUserId param
  useFocusEffect(
    useCallback(() => {
      const openChatWithUserId = route?.params?.openChatWithUserId;
      if (openChatWithUserId && chatData.length > 0) {
        const chat = chatData.find((c) => c.id === openChatWithUserId);
        if (chat) {
          setSelectedChatId(chat.id);
          navigation.setParams({ openChatWithUserId: null });
        }
      }
    }, [route?.params?.openChatWithUserId, chatData, navigation])
  );

  useEffect(() => {
    if (!userId) return;

    const newWs = new WebSocket(`${WS_BASE_URL}/v1/ws/chat/${userId}`);
    newWs.onopen = () => {
      console.log("WebSocket connected");
    };
    newWs.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const m = payload.message;
        if (!m) {
          if (payload.event === "WAVE_UPDATE") {
            fetchData();
          }
          return;
        }

        setChatData((prevData) => {
          const newData = [...prevData];
          // Determine the other user in the chat
          const otherId =
            m.to_user_id === userId ? m.from_user_id : m.to_user_id;

          let chatIndex = newData.findIndex((c) => c.id === otherId);
          if (chatIndex === -1) {
            newData.push({
              id: otherId,
              name: "Unknown",
              avatar: null,
              lastMessage: m.message,
              time: new Date(m.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              unread: m.to_user_id === userId ? 1 : 0,
              online: true,
              messages: [],
            });
            chatIndex = newData.length - 1;
          }

          const chat = { ...newData[chatIndex] };

          // Check if message already exists
          const isFromMe = m.from_user_id === userId;
          const exists = chat.messages.some(
            (existing) =>
              (existing.text === m.message &&
                existing.timestamp === new Date(m.timestamp).getTime()) ||
              (existing.text === m.message && existing.fromMe && isFromMe),
          );

          if (!exists) {
            chat.messages = [
              ...chat.messages,
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
            ].sort((a, b) => a.timestamp - b.timestamp);
            chat.lastMessage = m.message;
            chat.time = new Date(m.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            if (
              m.to_user_id === userId &&
              selectedChatIdRef.current !== otherId
            ) {
              chat.unread += 1;
            }
          }
          newData[chatIndex] = chat;
          return newData;
        });
      } catch (err) {
        console.log("Error parsing websocket message", err);
      }
    };

    newWs.onerror = (e) => {
      console.log("WebSocket error", e.message);
    };

    setWs(newWs);

    return () => {
      newWs.close();
    };
  }, [userId]);

  const fetchData = async () => {
    if (!userId) return;
    try {
      const users = await getNearbyUsers(userId);
      const msgList = await getMessages(userId);

      const uMap = {};
      users.forEach((u) => (uMap[u.user_id] = u.username));

      const groups = {};

      // Only add users who have a mutual or pending relationship
      users.forEach((u) => {
        if (
          u.user_id !== userId &&
          (u.relationship === "accepted" ||
            u.relationship === "received" ||
            u.relationship === "sent")
        ) {
          groups[u.user_id] = {
            id: u.user_id,
            name:
              u.relationship === "accepted"
                ? u.username || "Unknown"
                : "Anonymous User",
            avatar: u.profile_image || null,
            lastMessage:
              u.relationship === "received"
                ? "Waved at you!"
                : u.relationship === "sent"
                  ? "Wave sent"
                  : "Start a conversation",
            time: "",
            unread: u.relationship === "received" ? 1 : 0,
            online: true,
            messages: [],
            relationship: u.relationship,
          };
        }
      });

      // Add actual messages
      msgList.forEach((m) => {
        const otherId =
          m.from_user_id === userId ? m.to_user_id : m.from_user_id;
        if (!groups[otherId]) {
          groups[otherId] = {
            id: otherId,
            name: uMap[otherId] || "Unknown",
            avatar: null,
            lastMessage: m.message,
            time: new Date(m.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            unread: 0,
            online: true,
            messages: [],
          };
        }
        groups[otherId].messages.push({
          id: m.id || m.timestamp + Math.random().toString(),
          text: m.message,
          time: new Date(m.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          fromMe: !m.received,
          timestamp: new Date(m.timestamp).getTime(),
        });

        groups[otherId].lastMessage = m.message;
        groups[otherId].time = new Date(m.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      });

      Object.values(groups).forEach((g) => {
        g.messages.sort((a, b) => a.timestamp - b.timestamp);
      });

      setChatData(Object.values(groups));
    } catch (e) {
      console.log("Error fetching chats", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [userId]),
  );

  const filteredChats = chatData.filter((chat) =>
    chat.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  function openChat(chat) {
    setSelectedChatId(chat.id);

    // Clear unread
    setChatData((prev) => {
      const newData = [...prev];
      const chatIndex = newData.findIndex((c) => c.id === chat.id);
      if (chatIndex !== -1) {
        newData[chatIndex] = { ...newData[chatIndex], unread: 0 };
      }
      return newData;
    });
  }

  function closeChat() {
    setSelectedChatId(null);
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    const currentMessage = messageText;
    setMessageText("");

    const newMessage = {
      id: Date.now().toString(),
      text: currentMessage,
      time: "Now",
      fromMe: true,
      timestamp: Date.now(),
    };

    // Optimistic update BEFORE await
    setChatData((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === selectedChatId) {
          return {
            ...chat,
            messages: [...chat.messages, newMessage],
            lastMessage: currentMessage,
            time: "Now",
          };
        }
        return chat;
      }),
    );

    try {
      await sendBackendMessage(userId, {
        message: currentMessage,
        toUserId: selectedChatId,
      });
    } catch (e) {
      console.log("Error sending msg", e);
    }
  };

  const handleAcceptWave = async (chatId) => {
    try {
      await acceptWave(userId, chatId);
      setChatData((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                relationship: "accepted",
                lastMessage: "Wave accepted! Say hi.",
              }
            : c,
        ),
      );
      await fetchData(); // Refresh data to get the real username
    } catch (e) {
      console.log(e);
    }
  };

  const handleDeclineWave = async (chatId) => {
    try {
      await declineWave(userId, chatId);
      setChatData((prev) => prev.filter((c) => c.id !== chatId));
      setSelectedChatId(null);
    } catch (e) {
      console.log(e);
    }
  };

  if (selectedChat) {
    return (
      <ChatDetailScreen
        chat={selectedChat}
        onBack={closeChat}
        messageText={messageText}
        setMessageText={setMessageText}
        onSend={sendMessage}
        onAcceptWave={() => handleAcceptWave(selectedChat.id)}
        onDeclineWave={() => handleDeclineWave(selectedChat.id)}
        onAvatarPress={() =>
          navigation.navigate("UserProfile", { userId: selectedChat.id })
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Text style={styles.headerIcon}>＋</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIconButton}>
            <Text style={styles.headerIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          placeholder="Search or start new chat"
          placeholderTextColor="#8C8C8C"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chatList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => openChat(item)}
          >
            <View style={styles.avatarWrapper}>
              <Avatar
                url={item.avatar}
                name={item.name}
                size={56}
                style={styles.avatar}
              />

              {item.online && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.chatContent}>
              <View style={styles.chatTopRow}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text
                  style={[
                    styles.chatTime,
                    item.unread > 0 && styles.chatTimeUnread,
                  ]}
                >
                  {item.time}
                </Text>
              </View>

              <View style={styles.chatBottomRow}>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage}
                </Text>

                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const ChatDetailScreen = ({
  chat,
  onBack,
  messageText,
  setMessageText,
  onSend,
  onAcceptWave,
  onDeclineWave,
  onAvatarPress,
}) => {
  const [particles, setParticles] = useState([]);

  const triggerExplosion = (count = 12) => {
    const newParticles = Array.from({ length: count }).map((_, i) => ({
      id: Date.now().toString() + i + Math.random().toString(),
    }));
    setParticles((prev) => [...prev, ...newParticles]);
  };

  const removeParticle = (id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  };

  const scrollViewRef = useRef(null);
  const isAtBottom = useRef(true);
  const prevMessagesLengthRef = useRef(chat.messages.length);

  useEffect(() => {
    if (chat.messages.length > prevMessagesLengthRef.current) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage) {
        const emojiCount = (lastMessage.text.match(/☺/g) || []).length;
        if (emojiCount > 0) {
          triggerExplosion(Math.min(emojiCount * 12, 60)); // Cap at 60 particles
        }
      }
    }
    prevMessagesLengthRef.current = chat.messages.length;
  }, [chat.messages]);

  const handleEmojiPress = () => {
    setMessageText((prev) => prev + "☺");
  };

  return (
    <SafeAreaView style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
          onPress={onAvatarPress}
        >
          <Avatar
            url={chat.avatar}
            name={chat.name}
            size={42}
            style={styles.detailAvatar}
          />

          <View style={styles.detailHeaderText}>
            <Text style={styles.detailName}>{chat.name}</Text>
            <Text style={styles.detailStatus}>
              {chat.online ? "online" : "last seen recently"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.detailIconButton}>
          <Text style={styles.detailIcon}>☎</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.detailIconButton}>
          <Text style={styles.detailIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatDetailBody}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onScroll={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              e.nativeEvent;
            isAtBottom.current =
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 40;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (isAtBottom.current) {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }
          }}
          onLayout={() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }}
        >
          <View style={styles.dateChip}>
            <Text style={styles.dateChipText}>Today</Text>
          </View>

          {chat.messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.fromMe ? styles.myMessage : styles.theirMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.fromMe
                    ? styles.myMessageText
                    : styles.theirMessageText,
                ]}
              >
                {message.text}
              </Text>

              <Text
                style={[
                  styles.messageTime,
                  message.fromMe
                    ? styles.myMessageTime
                    : styles.theirMessageTime,
                ]}
              >
                {message.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        {chat.relationship === "received" ? (
          <View style={styles.waveActions}>
            <TouchableOpacity
              style={[styles.waveBtn, styles.declineBtn]}
              onPress={onDeclineWave}
            >
              <Text style={styles.waveBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.waveBtn, styles.acceptBtn]}
              onPress={onAcceptWave}
            >
              <Text style={styles.waveBtnText}>Wave Back</Text>
            </TouchableOpacity>
          </View>
        ) : chat.relationship === "sent" ? (
          <View style={styles.wavePending}>
            <Text style={styles.wavePendingText}>
              Waiting for them to wave back...
            </Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={styles.emojiButton}
              onPress={handleEmojiPress}
            >
              <Text style={styles.emojiText}>☺</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.messageInput}
              placeholder="Message..."
              placeholderTextColor="#8B8B8B"
              value={messageText}
              onChangeText={setMessageText}
              onSubmitEditing={onSend}
            />
            <TouchableOpacity style={styles.sendButton} onPress={onSend}>
              <Text style={styles.sendText}>➤</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Render Emoji Particles */}
        {particles.map((p) => (
          <EmojiParticle key={p.id} id={p.id} onComplete={removeParticle} />
        ))}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101010",
  },

  header: {
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 12 : 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerIconButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  headerIcon: {
    color: "#FFFFFF",
    fontSize: 24,
  },

  searchBox: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2A2A2A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchIcon: {
    color: "#9A9A9A",
    fontSize: 20,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },

  chatList: {
    paddingBottom: 20,
  },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  avatarWrapper: {
    position: "relative",
    marginRight: 14,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8B4CC2",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },

  onlineDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#26D366",
    borderWidth: 2,
    borderColor: "#101010",
  },

  chatContent: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    paddingBottom: 12,
  },

  chatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  chatName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  chatTime: {
    color: "#8B8B8B",
    fontSize: 12,
  },

  chatTimeUnread: {
    color: "#26D366",
    fontWeight: "700",
  },

  chatBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  lastMessage: {
    color: "#A8A8A8",
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },

  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#26D366",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  unreadText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "800",
  },

  detailContainer: {
    flex: 1,
    backgroundColor: "#111111",
  },

  detailHeader: {
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 8,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "300",
    marginTop: -4,
  },

  detailAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#8B4CC2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  detailHeaderText: {
    flex: 1,
  },

  detailName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  detailStatus: {
    color: "#BDBDBD",
    fontSize: 12,
    marginTop: 2,
  },

  detailIconButton: {
    width: 38,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  detailIcon: {
    color: "#FFFFFF",
    fontSize: 22,
  },

  chatDetailBody: {
    flex: 1,
  },

  messagesContainer: {
    flex: 1,
    backgroundColor: "#181818",
  },

  messagesContent: {
    padding: 14,
    paddingBottom: 20,
  },

  dateChip: {
    alignSelf: "center",
    backgroundColor: "#2B2B2B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 14,
  },

  dateChipText: {
    color: "#BDBDBD",
    fontSize: 12,
  },

  messageBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginBottom: 9,
  },

  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#8B4CC2",
    borderBottomRightRadius: 4,
  },

  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#2A2A2A",
    borderBottomLeftRadius: 4,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },

  myMessageText: {
    color: "#FFFFFF",
  },

  theirMessageText: {
    color: "#FFFFFF",
  },

  messageTime: {
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },

  myMessageTime: {
    color: "#E8D7FF",
  },

  theirMessageTime: {
    color: "#BDBDBD",
  },

  inputBar: {
    minHeight: 66,
    backgroundColor: "#101010",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  emojiButton: {
    width: 38,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  emojiText: {
    color: "#BDBDBD",
    fontSize: 24,
  },

  messageInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 22,
    backgroundColor: "#2A2A2A",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 15,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#8B4CC2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  sendText: {
    color: "#FFFFFF",
    fontSize: 20,
    marginLeft: 2,
  },

  waveActions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#1F1F1F",
  },

  waveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
  },

  acceptBtn: {
    backgroundColor: "#FF2E93",
  },

  declineBtn: {
    backgroundColor: "#2A2A2A",
  },

  waveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },

  wavePending: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#1F1F1F",
  },

  wavePendingText: {
    color: "#8C8C8C",
    fontSize: 15,
  },
});
