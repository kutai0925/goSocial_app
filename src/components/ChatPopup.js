import React, { useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Avatar from "./Avatar";

export default function ChatPopup({ visible, friend, onClose, onSend }) {
  const [messageText, setMessageText] = useState("");
  const scrollViewRef = useRef(null);
  const isAtBottom = useRef(true);

  if (!friend) return null;

  const handleSend = () => {
    if (!messageText.trim()) return;
    onSend(messageText.trim());
    setMessageText("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <Avatar
              url={friend.profile_pic_url}
              name={friend.username}
              size={38}
              style={styles.avatar}
            />
            <Text style={styles.headerName}>
              {friend.username || "Mystery User"}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messages}
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
            {friend.messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  m.fromMe ? styles.myBubble : styles.theirBubble,
                ]}
              >
                <Text style={styles.bubbleText}>{m.text}</Text>
                <Text style={styles.bubbleTime}>{m.time}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor="#B8A8CC"
              value={messageText}
              onChangeText={setMessageText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendText}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  sheet: {
    height: "85%",
    backgroundColor: "#1A0B2A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#2A1240",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },

  avatarFallback: {
    backgroundColor: "#8F4CC7",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  headerName: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  closeIcon: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  messages: {
    flex: 1,
  },

  messagesContent: {
    padding: 14,
    paddingBottom: 20,
  },

  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginBottom: 9,
  },

  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#8B4CC2",
    borderBottomRightRadius: 4,
  },

  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#2A2A2A",
    borderBottomLeftRadius: 4,
  },

  bubbleText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
  },

  bubbleTime: {
    color: "#E8D7FF",
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },

  inputBar: {
    minHeight: 64,
    backgroundColor: "#1A0B2A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  input: {
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
