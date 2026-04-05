import AsyncStorage from "@react-native-async-storage/async-storage";

const PINNED_KEY = "pinned_chats";

export async function getPinnedChats(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PINNED_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function togglePinChat(friendId: string): Promise<boolean> {
  const pinned = await getPinnedChats();
  const isPinned = pinned.includes(friendId);
  const updated = isPinned
    ? pinned.filter((id) => id !== friendId)
    : [friendId, ...pinned];
  await AsyncStorage.setItem(PINNED_KEY, JSON.stringify(updated));
  return !isPinned;
}

export async function isPinnedChat(friendId: string): Promise<boolean> {
  const pinned = await getPinnedChats();
  return pinned.includes(friendId);
}
