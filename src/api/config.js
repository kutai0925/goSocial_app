import { Platform } from "react-native";

// Use injected IP from environment, falling back to localhost/10.0.2.2
const LAN_IP = process.env.EXPO_PUBLIC_API_IP;

const HOST = LAN_IP || (Platform.OS === "android" ? "10.0.2.2" : "localhost");

export const API_BASE_URL = `http://${HOST}:8888`;
export const WS_BASE_URL = `ws://${HOST}:8888`;
