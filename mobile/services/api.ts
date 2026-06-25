import { Platform } from "react-native";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: () => void) {
  onUnauthorized = handler;
}

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

const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 15_000;

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

function invalidateCache(pattern?: string) {
  if (!pattern) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
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
  } catch (err) {
    console.warn("Failed to read auth token:", err);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.config.method === "get") {
      setCache(response.config.url || "", response.data);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await storageRemove("auth_token");
      await storageRemove(USER_KEY);
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(error);
  }
);

async function cachedGet<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const cached = getCached(url);
  if (cached) {
    return { data: cached, status: 200, statusText: "OK", headers: {}, config: {} as any } as AxiosResponse<T>;
  }
  const response = await api.get<T>(url, config);
  return response;
}

export { invalidateCache, cachedGet };
export default api;
