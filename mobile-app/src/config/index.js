import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = Constants.expoConfig?.extra ?? {};

const resolveFallbackHost = () => {
  if (!Constants.expoConfig?.hostUri) return null;
  const host = Constants.expoConfig.hostUri.split(":")[0];
  return host ? `http://${host}:3000` : null;
};

const normalizeLocalhostForPlatform = (url) => {
  if (!url) return url;
  if (Platform.OS === "android") {
    return url
      .replace("localhost", "10.0.2.2")
      .replace("127.0.0.1", "10.0.2.2");
  }
  if (Platform.OS === "ios" && url.includes("localhost")) {
    return url;
  }
  return url;
};

const preferredUrl =
  extra.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || resolveFallbackHost();

export const API_BASE_URL = normalizeLocalhostForPlatform(
  preferredUrl || "http://localhost:3000"
);

export const REFRESH_INTERVAL = Number(extra.refreshInterval ?? 5000);
