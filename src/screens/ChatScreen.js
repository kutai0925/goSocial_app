import React, { useState, useEffect } from "react";
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
} from "react-native";



import { useAuth } from "../context/AuthContext";
import { getMessages, sendMessage as sendBackendMessage } from "../api/messages";
import { getNearbyUsers } from "../api/users";

export default function ChatScreen() {
  const { userId } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [chatData, setChatData] = useState([]);

  useEffect(() => {
    if (!userId) return;
    let interval;
    const fetchData = async () => {
      try {
        const users = await getNearbyUsers();
        const msgList = await getMessages(userId);

        const uMap = {};
        users.forEach(u => uMap[u.user_id] = u.username);

        const groups = {};

        // Ensure every nearby user is in the list, even if no messages yet
        users.forEach(u => {
          if (u.user_id !== userId) {
            groups[u.user_id] = {
              id: u.user_id,
              name: u.username || "Unknown",
              avatar: null,
              lastMessage: "Start a conversation",
              time: "",
              unread: 0,
              online: true,
              messages: [],
            };
          }
        });

        // Add actual messages
        msgList.forEach(m => {
          const otherId = m.to_user_id;
          if (!groups[otherId]) {
            groups[otherId] = {
              id: otherId,
              name: uMap[otherId] || "Unknown",
              avatar: null,
              lastMessage: m.message,
              time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              unread: 0,
              online: true,
              messages: [],
            };
          }
          groups[otherId].messages.push({
            id: m.timestamp + Math.random().toString(),
            text: m.message,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fromMe: !m.received,
            timestamp: new Date(m.timestamp).getTime()
          });

          groups[otherId].lastMessage = m.message;
          groups[otherId].time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });

        Object.values(groups).forEach(g => {
          g.messages.sort((a, b) => a.timestamp - b.timestamp);
        });

        // Only update local state if we aren't actively typing a message to prevent flicker, 
        // or we could be smarter, but for MVP simple setChatData is fine.
        setChatData(Object.values(groups));

        // Also update selectedChat if it's open
        setSelectedChat(prev => {
          if (prev) return groups[prev.id] || prev;
          return prev;
        });

      } catch (e) {
        console.log("Error fetching chats", e);
      }
    };

    fetchData();
    interval = setInterval(fetchData, 3000); // refresh every 3 seconds for mvp real-time feel
    return () => clearInterval(interval);
  }, [userId]);

  const filteredChats = chatData.filter((chat) =>
    chat.name.toLowerCase().includes(searchText.toLowerCase())
  );

  function openChat(chat) {
    setSelectedChat(chat);
  }

  function closeChat() {
    setSelectedChat(null);
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    try {
      await sendBackendMessage(userId, { message: messageText, toUserId: selectedChat.id });

      const newMessage = {
        id: Date.now().toString(),
        text: messageText,
        time: "Now",
        fromMe: true,
        timestamp: Date.now()
      };

      const updatedChats = chatData.map((chat) => {
        if (chat.id === selectedChat.id) {
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, newMessage],
            lastMessage: messageText,
            time: "Now",
          };
          setSelectedChat(updatedChat);
          return updatedChat;
        }
        return chat;
      });

      setChatData(updatedChats);
      setMessageText("");
    } catch (e) {
      console.log("Error sending msg", e);
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
          <TouchableOpacity style={styles.chatItem} onPress={() => openChat(item)}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>

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

function ChatDetailScreen({
  chat,
  onBack,
  messageText,
  setMessageText,
  onSend,
}) {
  return (
    <SafeAreaView style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.detailAvatar}>
          <Text style={styles.avatarText}>{chat.name.charAt(0)}</Text>
        </View>

        <View style={styles.detailHeaderText}>
          <Text style={styles.detailName}>{chat.name}</Text>
          <Text style={styles.detailStatus}>
            {chat.online ? "online" : "last seen recently"}
          </Text>
        </View>

        <TouchableOpacity style={styles.detailIconButton}>
          <Text style={styles.detailIcon}>☎</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.detailIconButton}>
          <Text style={styles.detailIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatDetailBody}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
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

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.emojiButton}>
            <Text style={styles.emojiText}>☺</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.messageInput}
            placeholder="Message"
            placeholderTextColor="#8C8C8C"
            value={messageText}
            onChangeText={setMessageText}
          />

          <TouchableOpacity style={styles.sendButton} onPress={onSend}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101010",
  },

  header: {
    height: 88,
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 18,
    paddingTop: 18,
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
    height: 84,
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 8,
    paddingTop: 16,
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
});