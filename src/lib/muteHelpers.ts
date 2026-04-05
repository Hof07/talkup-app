import { supabase } from "./supabase";

export const muteChatFor = async (
  userId: string,
  friendId: string,
  hours: number | null
) => {
  const muteUntil = hours
    ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    : null;

  await supabase
    .from("muted_chats")
    .upsert(
      { user_id: userId, friend_id: friendId, muted_until: muteUntil },
      { onConflict: "user_id,friend_id" }
    );

  return muteUntil;
};

export const unmuteChatFor = async (userId: string, friendId: string) => {
  await supabase
    .from("muted_chats")
    .delete()
    .eq("user_id", userId)
    .eq("friend_id", friendId);
};

export const getMuteStatus = async (userId: string, friendId: string) => {
  const { data } = await supabase
    .from("muted_chats")
    .select("muted_until")
    .eq("user_id", userId)
    .eq("friend_id", friendId)
    .single();

  if (!data) return null;

  if (data.muted_until && new Date(data.muted_until) < new Date()) {
    await unmuteChatFor(userId, friendId);
    return null;
  }

  return data.muted_until as string | null;
};