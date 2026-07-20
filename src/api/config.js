import { Platform } from "react-native";

/***Set this to your machine's LAN IP (e.g. "192.168.1.42") to test from a
physical device — "localhost"/"10.0.2.2" only reach the backend from
simulators/emulators running on the same machine as the backend.***/
const LAN_IP = "192.168.178.125";

const HOST = LAN_IP ?? (Platform.OS === "android" ? "10.0.2.2" : "localhost");

export const API_BASE_URL = `http://${HOST}:8888`;
export const WS_BASE_URL = `ws://${HOST}:8888`;
