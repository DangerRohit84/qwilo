import { Platform } from "react-native";
import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

const webStorage = {
  getItem(key: string) { return localStorage.getItem(key); },
  removeItem(key: string) { localStorage.removeItem(key); },
};

async function storageGet(key: string) {
  if (Platform.OS === "web") return webStorage.getItem(key);
  const { getItemAsync } = await import("expo-secure-store");
  return getItemAsync(key);
}

const USER_KEY = "auth_user";

async function storageRemove(key: string) {
  if (Platform.OS === "web") webStorage.removeItem(key);
  else { const { deleteItemAsync } = await import("expo-secure-store"); await deleteItemAsync(key); }
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await storageGet("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storageRemove("auth_token");
      await storageRemove(USER_KEY);
    }
    return Promise.reject(error);
  }
);

export default api;
