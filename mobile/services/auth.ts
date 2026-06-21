import { Platform } from "react-native";
import api from "./api";
import { AuthResponse, User } from "../types";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

const storage = Platform.OS === "web" ? {
  async getItem(key: string) { return localStorage.getItem(key); },
  async setItem(key: string, value: string) { localStorage.setItem(key, value); },
  async removeItem(key: string) { localStorage.removeItem(key); },
} : {
  async getItem(key: string) { const { getItemAsync } = await import("expo-secure-store"); return getItemAsync(key); },
  async setItem(key: string, value: string) { const { setItemAsync } = await import("expo-secure-store"); return setItemAsync(key, value); },
  async removeItem(key: string) { const { deleteItemAsync } = await import("expo-secure-store"); return deleteItemAsync(key); },
};

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  await storage.setItem(TOKEN_KEY, data.token);
  await storage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export async function register(
  email: string,
  password: string,
  name: string,
  role: "STUDENT" | "PARENT" | "TEACHER",
  parentEmail?: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", {
    email,
    password,
    name,
    role,
    parentEmail,
  });
  await storage.setItem(TOKEN_KEY, data.token);
  await storage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export async function logout() {
  await storage.removeItem(TOKEN_KEY);
  await storage.removeItem(USER_KEY);
}

export async function getStoredUser(): Promise<User | null> {
  try {
    const json = await storage.getItem(USER_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await storage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getStoredData(key: string): Promise<string | null> {
  try {
    return await storage.getItem(key);
  } catch {
    return null;
  }
}

export async function storeData(key: string, value: string) {
  try {
    await storage.setItem(key, value);
  } catch {}
}

export async function removeData(key: string) {
  try {
    await storage.removeItem(key);
  } catch {}
}
