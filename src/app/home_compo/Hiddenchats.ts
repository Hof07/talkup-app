// ─── hiddenChats.ts ───────────────────────────────────────────────────────────
//
// All hidden-chat logic lives here.
// Hidden friend IDs + the secret key are stored locally in AsyncStorage only —
// nothing is sent to the server.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_HIDDEN  = "hiddenChatIds";   // JSON array of friend IDs
const KEY_SECRET  = "hiddenChatKey";   // the user's chosen secret key string

// ── Secret key ────────────────────────────────────────────────────────────────

export const getSecretKey = async (): Promise<string | null> => {
  return AsyncStorage.getItem(KEY_SECRET);
};

export const setSecretKey = async (key: string): Promise<void> => {
  await AsyncStorage.setItem(KEY_SECRET, key.trim());
};

export const hasSecretKey = async (): Promise<boolean> => {
  const k = await getSecretKey();
  return !!k && k.length > 0;
};

// ── Hidden IDs ────────────────────────────────────────────────────────────────

export const getHiddenIds = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(KEY_HIDDEN);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};

export const hideChat = async (friendId: string): Promise<void> => {
  const ids = await getHiddenIds();
  if (!ids.includes(friendId)) {
    await AsyncStorage.setItem(KEY_HIDDEN, JSON.stringify([...ids, friendId]));
  }
};

export const unhideChat = async (friendId: string): Promise<void> => {
  const ids = await getHiddenIds();
  await AsyncStorage.setItem(
    KEY_HIDDEN,
    JSON.stringify(ids.filter((id) => id !== friendId))
  );
};

export const isHidden = async (friendId: string): Promise<boolean> => {
  const ids = await getHiddenIds();
  return ids.includes(friendId);
};