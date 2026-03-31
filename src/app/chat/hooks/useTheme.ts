import { useState, useCallback } from "react";
import { ChatTheme, DEFAULT_THEME } from "../../../lib/themes";
import { loadChatTheme, saveChatTheme } from "../../../lib/themeStorage";
import { useFocusEffect } from "expo-router";

export const useTheme = (myId: string, friendId: string) => {
  const [theme, setTheme] = useState<ChatTheme>(DEFAULT_THEME);

  useFocusEffect(
    useCallback(() => {
      if (myId && friendId) {
        loadChatTheme(myId, friendId).then(setTheme);
      }
    }, [myId, friendId])
  );

  const selectTheme = async (t: ChatTheme) => {
    setTheme(t);
    await saveChatTheme(myId, friendId, t.id);
  };

  return { theme, setTheme, selectTheme };
};