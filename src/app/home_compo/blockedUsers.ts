import AsyncStorage from "@react-native-async-storage/async-storage";

const BLOCKED_KEY = "blocked_users";

export async function getBlockedUsers(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(BLOCKED_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function toggleBlockUser(userId: string): Promise<boolean> {
  const blocked = await getBlockedUsers();
  const isBlocked = blocked.includes(userId);
  const updated = isBlocked
    ? blocked.filter((id) => id !== userId)
    : [...blocked, userId];
  await AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(updated));
  return !isBlocked;
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  const blocked = await getBlockedUsers();
  return blocked.includes(userId);
}
