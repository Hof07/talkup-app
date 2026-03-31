import { getThemeById, ChatTheme, DEFAULT_THEME } from "./themes";
import { supabase } from "./supabase";

const getSortedIds = (myId: string, friendId: string) => {
  const sorted = [myId, friendId].sort();
  return { user1_id: sorted[0], user2_id: sorted[1] };
};

export const saveChatTheme = async (
  myId: string,
  friendId: string,
  themeId: string
): Promise<void> => {
  try {
    const { user1_id, user2_id } = getSortedIds(myId, friendId);
    await supabase
      .from("chat_themes")
      .upsert(
        {
          user1_id,
          user2_id,
          theme_id: themeId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user1_id,user2_id" }
      );
  } catch (e) {
    console.error("Failed to save theme:", e);
  }
};

export const loadChatTheme = async (
  myId: string,
  friendId: string
): Promise<ChatTheme> => {
  try {
    const { user1_id, user2_id } = getSortedIds(myId, friendId);
    const { data, error } = await supabase
      .from("chat_themes")
      .select("theme_id")
      .eq("user1_id", user1_id)
      .eq("user2_id", user2_id)
      .single();

    if (error || !data) return DEFAULT_THEME;
    return getThemeById(data.theme_id);
  } catch (e) {
    return DEFAULT_THEME;
  }
};