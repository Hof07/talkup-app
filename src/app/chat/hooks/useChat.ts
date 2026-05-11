import { useState, useRef } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import {
  encryptMessage,
  decryptMessage,
  generateChatKey,
} from "../../../lib/crypto";
import * as ImagePicker from "expo-image-picker";
import { Message, Reaction, ReplyTo } from "../utils/types";

export type { Message, Reaction, ReplyTo };

const PAGE_SIZE = 20;

// ── In-memory cache per chat room ─────────────────────────────────────────────
const messageCache = new Map<string, Message[]>();

// ── AsyncStorage-backed persistent cache ──────────────────────────────────────
const CHAT_CACHE_PREFIX = "chat_msgs_";
const MAX_CACHED_MESSAGES = 50; // Keep last 50 messages per chat in storage

const persistMessagesToStorage = async (
  cacheKey: string,
  msgs: Message[]
): Promise<void> => {
  try {
    // Only persist the last N messages, skip temp messages
    const toPersist = msgs
      .filter((m) => !m.is_temp)
      .slice(-MAX_CACHED_MESSAGES);
    await AsyncStorage.setItem(
      CHAT_CACHE_PREFIX + cacheKey,
      JSON.stringify(toPersist)
    );
  } catch (e) {
    console.warn("[useChat] persist cache failed:", e);
  }
};

const loadMessagesFromStorage = async (
  cacheKey: string
): Promise<Message[]> => {
  try {
    const raw = await AsyncStorage.getItem(CHAT_CACHE_PREFIX + cacheKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("[useChat] load cache failed:", e);
  }
  return [];
};

const dedupe = (msgs: Message[]) => {
  const seen = new Set<string>();
  return msgs.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
};

export const useChat = (friendId: string) => {
  const currentUserIdRef = useRef("");
  const channelRef = useRef<any>(null);
  const chatKeyRef = useRef("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oldestCreatedAt = useRef<string | null>(null);
  const isFetchingMore = useRef(false);
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReadIds = useRef<Set<string>>(new Set());

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [friendLastSeen, setFriendLastSeen] = useState<string | null>(null);
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const shouldSkipEncryption = (msg: Message): boolean => {
    if (msg.deleted_for_everyone) return true;
    if (
      msg.message_type === "image" ||
      msg.message_type === "image_group" ||
      msg.message_type === "gift"
    )
      return true;
    if (
      typeof msg.content === "string" &&
      (msg.content.startsWith("http") || msg.content.startsWith("file://"))
    )
      return true;
    if (
      typeof msg.content === "string" &&
      /^[\p{Emoji}\p{Emoji_Presentation}\s]+$/u.test(msg.content.trim())
    )
      return true;
    return false;
  };

  const decryptMsg = (msg: Message): Message => {
    if (msg.deleted_for_everyone) return { ...msg, content: "__deleted__" };
    if (shouldSkipEncryption(msg)) return msg;
    try {
      return {
        ...msg,
        content: decryptMessage(msg.content, chatKeyRef.current),
      };
    } catch {
      return msg;
    }
  };

  const init = async () => {
    try {
      const sessionStr = await AsyncStorage.getItem("userSession");
      if (!sessionStr) {
        router.replace("/signin");
        return;
      }
      const session = JSON.parse(sessionStr);
      const uid = session.user?.id;
      currentUserIdRef.current = uid;
      setCurrentUserId(uid);
      chatKeyRef.current = generateChatKey(uid, friendId);

      // ── Load from cache instantly (in-memory first, then AsyncStorage) ────
      const cacheKey = `${uid}_${friendId}`;
      const memCached = messageCache.get(cacheKey);
      if (memCached && memCached.length > 0) {
        setMessages(memCached);
        setLoading(false);
      } else {
        // Load from persistent storage (AsyncStorage) — instant, no network
        const storageCached = await loadMessagesFromStorage(cacheKey);
        if (storageCached.length > 0) {
          messageCache.set(cacheKey, storageCached);
          setMessages(storageCached);
          setLoading(false);
        }
      }

      // ── Try to set session (may fail if offline) ──────────────────────────
      try {
        const { error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (error) throw error;
      } catch (sessionError) {
        // If offline, still show cached messages — don't crash
        console.warn("[useChat] session set failed (offline?):", sessionError);
        setLoading(false);
        // Still try to setup realtime (will connect when online)
        setupRealtime(uid);
        return uid;
      }

      // ── All fetches in parallel ───────────────────────────────────────────
      try {
        await Promise.all([
          supabase
            .from("users")
            .update({ last_seen: new Date().toISOString() })
            .eq("id", uid),

          supabase
            .from("users")
            .select("last_seen")
            .eq("id", friendId)
            .single()
            .then(({ data }) => setFriendLastSeen(data?.last_seen || null)),

          loadMessages(uid, true),
        ]);
      } catch (fetchError) {
        console.warn("[useChat] data fetch failed (offline?):", fetchError);
      }

      setupRealtime(uid);
      setLoading(false);
      return uid;
    } catch (e: any) {
      console.error(e.message);
      setLoading(false);
    }
  };

  // ── Batched mark-as-read: collects IDs and flushes in one update ──────────
  const flushMarkAsRead = async () => {
    const ids = Array.from(pendingReadIds.current);
    if (ids.length === 0) return;
    pendingReadIds.current.clear();

    try {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", ids);
    } catch (e) {
      console.warn("[useChat] mark-as-read failed:", e);
    }
  };

  const scheduleMarkAsRead = (msgId: string) => {
    pendingReadIds.current.add(msgId);
    if (markReadTimer.current) clearTimeout(markReadTimer.current);
    // Debounce 150ms so rapid incoming messages get batched into one update
    markReadTimer.current = setTimeout(() => flushMarkAsRead(), 150);
  };

  const loadMessages = async (uid: string, isInit = false) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${uid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${uid})`
      )
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) return;

    const filtered = (data || []).filter(
      (m) => !(m.deleted_for || []).includes(uid)
    );
    const decrypted = filtered.map(decryptMsg).reverse();

    if (decrypted.length > 0) {
      oldestCreatedAt.current = decrypted[0].created_at;
    }

    setHasMore(filtered.length === PAGE_SIZE);

    const deduped = dedupe(decrypted);

    const cacheKey = `${uid}_${friendId}`;
    messageCache.set(cacheKey, deduped);

    setMessages(deduped);

    // Persist to AsyncStorage for offline access
    persistMessagesToStorage(cacheKey, deduped);

    // Collect all unread message IDs from friend and mark them as read in one batch
    const unreadFromFriend = filtered.filter(
      (m) => m.sender_id === friendId && m.receiver_id === uid && !m.is_read
    );
    if (unreadFromFriend.length > 0) {
      const unreadIds = unreadFromFriend.map((m) => m.id);
      // Update them all at once for consistency — no race condition
      try {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", unreadIds);
      } catch (e) {
        console.warn("[useChat] bulk mark-as-read failed:", e);
      }
    }
  };

  const loadMoreMessages = async () => {
    const uid = currentUserIdRef.current;
    if (!hasMore || isFetchingMore.current || !oldestCreatedAt.current) return;

    isFetchingMore.current = true;
    setLoadingMore(true);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${uid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${uid})`
      )
      .lt("created_at", oldestCreatedAt.current)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    isFetchingMore.current = false;
    setLoadingMore(false);

    if (error) return;

    const filtered = (data || []).filter(
      (m) => !(m.deleted_for || []).includes(uid)
    );
    const decrypted = filtered.map(decryptMsg).reverse();

    if (decrypted.length > 0) {
      oldestCreatedAt.current = decrypted[0].created_at;
    }

    setHasMore(filtered.length === PAGE_SIZE);
    setMessages((prev) => {
      const merged = dedupe([...decrypted, ...prev]);
      const cacheKey = `${uid}_${friendId}`;
      messageCache.set(cacheKey, merged);
      return merged;
    });
  };

  const setupRealtime = (uid: string) => {
    const channelName = `room_${[uid, friendId].sort().join("_")}`;
    channelRef.current = supabase
      .channel(channelName)
      // ── Typing broadcasts (unchanged) ─────────────────────────────────────
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id === friendId) {
          setFriendIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(
            () => setFriendIsTyping(false),
            3000
          );
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        if (payload.payload?.user_id === friendId) {
          setFriendIsTyping(false);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
      })
      // ── FIX: filter INSERT to only messages sent TO current user ──────────
      // This prevents receiving every INSERT across all 4700+ messages
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${uid}`,
        },
        async (payload) => {
          const msg = payload.new as Message;
          // Still verify it's from the right friend (filter only covers receiver)
          const relevant = msg.sender_id === friendId;
          if (!relevant) return;
          if ((msg.deleted_for || []).includes(uid)) return;
          const dec = decryptMsg(msg);
          setMessages((prev) => {
            // Remove matching temp message
            const withoutTemp = prev.filter(
              (m) =>
                !(
                  m.is_temp &&
                  m.content === dec.content &&
                  m.sender_id === dec.sender_id
                )
            );
            // Skip if already exists
            if (withoutTemp.find((m) => m.id === dec.id)) return withoutTemp;
            // Add the message with is_read already set to true locally
            // (we are viewing this chat, so it's seen immediately)
            return [...withoutTemp, { ...dec, is_read: true }];
          });
          // Mark as read via batched update — prevents race when multiple
          // messages arrive quickly (fixes: 2 msgs sent, 1 unseen / 2nd seen)
          scheduleMarkAsRead(msg.id);
        }
      )
      // ── FIX: filter UPDATE to only messages involving current user ────────
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${uid}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          const relevant = updated.sender_id === friendId;
          if (!relevant) return;
          if ((updated.deleted_for || []).includes(uid)) {
            setMessages((prev) => prev.filter((m) => m.id !== updated.id));
            return;
          }
          // FIX: no dedupe needed for a simple map update
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? {
                    ...m,
                    is_read: updated.is_read,
                    reactions: updated.reactions,
                    deleted_for_everyone: updated.deleted_for_everyone,
                    content: updated.deleted_for_everyone
                      ? "🚫 This message was deleted"
                      : m.content,
                  }
                : m
            )
          );
        }
      )
      // ── Also listen for updates on messages YOU sent (read receipts) ──────
      // Separate subscription filtered by sender so you see "read" ticks update
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${uid}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          const relevant = updated.receiver_id === friendId;
          if (!relevant) return;
          // If YOU deleted this message "for me", keep it hidden
          if ((updated.deleted_for || []).includes(uid)) {
            setMessages((prev) => prev.filter((m) => m.id !== updated.id));
            return;
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? {
                    ...m,
                    is_read: updated.is_read,
                    reactions: updated.reactions,
                    deleted_for_everyone: updated.deleted_for_everyone,
                    content: updated.deleted_for_everyone
                      ? "🚫 This message was deleted"
                      : m.content,
                  }
                : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();
  };

  const broadcastTyping = () => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserIdRef.current },
    });
  };

  const broadcastStopTyping = () => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { user_id: currentUserIdRef.current },
    });
  };

  const sendMessage = async (
    plainText: string,
    replyTo?: ReplyTo | null,
    messageType = "text"
  ) => {
    const uid = currentUserIdRef.current;
    broadcastStopTyping();
    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender_id: uid,
        receiver_id: friendId,
        content: plainText,
        created_at: now,
        is_read: false,
        is_temp: true,
        message_type: messageType as Message["message_type"],
        reply_to: replyTo || null,
      },
    ]);

    const isPlainUrl =
      plainText.startsWith("http") || plainText.startsWith("file://");
    const isPureEmoji =
      /^[\p{Emoji}\p{Emoji_Presentation}\s]+$/u.test(plainText.trim());
    const skipEncrypt = messageType === "gift" || isPlainUrl || isPureEmoji;

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            sender_id: uid,
            receiver_id: friendId,
            content: skipEncrypt
              ? plainText
              : encryptMessage(plainText, chatKeyRef.current),
            is_read: false,
            message_type: messageType,
            reply_to: replyTo || null,
          },
        ])
        .select()
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        Alert.alert("Failed to send", error.message);
        setSending(false);
        return { tempId, error };
      }

      if (data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...data,
                  content: plainText,
                  is_read: false,
                  is_temp: false,
                  message_type: messageType as Message["message_type"],
                  reply_to: replyTo || null,
                }
              : m
          )
        );
      }
      setSending(false);
      return { tempId, error: null };
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert("Failed to send", e.message || "Something went wrong");
      setSending(false);
      return { tempId, error: e };
    }
  };

  const uploadImageFile = async (
    uri: string,
    uid: string,
    token: string
  ): Promise<string> => {
    const fileName = `${uid}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.jpg`;
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: fileName,
      type: "image/jpeg",
    } as any);
    const headers = {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    };
    const baseUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/chat-images/${fileName}`;
    let res = await fetch(baseUrl, { method: "POST", headers, body: formData });
    if (!res.ok)
      await fetch(baseUrl, { method: "PUT", headers, body: formData });
    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-images/${fileName}`;
  };

  const sendImage = async (receiverId: string, replyTo?: ReplyTo | null) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your gallery");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsMultipleSelection: true,
      selectionLimit: 9,
      quality: 0.7,
    });
    if (result.canceled || !result.assets.length) return;

    const uris = result.assets.map((a) => a.uri);
    const uid = currentUserIdRef.current;
    const tempId = `temp_${Date.now()}`;
    const isMultiple = uris.length > 1;

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender_id: uid,
        receiver_id: receiverId,
        content: uris[0],
        images: isMultiple ? uris : undefined,
        created_at: new Date().toISOString(),
        is_read: false,
        is_temp: true,
        message_type: (isMultiple ? "image_group" : "image") as
          | "image"
          | "image_group",
        reply_to: replyTo || null,
      },
    ]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || "";
      const uploadedUrls = await Promise.all(
        uris.map((uri) => uploadImageFile(uri, uid, token))
      );

      const messagePayload = isMultiple
        ? {
            sender_id: uid,
            receiver_id: receiverId,
            content: uploadedUrls[0],
            images: uploadedUrls,
            message_type: "image_group",
            is_read: false,
            reply_to: replyTo || null,
          }
        : {
            sender_id: uid,
            receiver_id: receiverId,
            content: uploadedUrls[0],
            message_type: "image",
            is_read: false,
            reply_to: replyTo || null,
          };

      const { data, error } = await supabase
        .from("messages")
        .insert([messagePayload])
        .select()
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        Alert.alert("Failed to send image", error.message);
      } else if (data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...data,
                  content: uploadedUrls[0],
                  images: isMultiple ? uploadedUrls : undefined,
                  is_temp: false,
                  message_type: (isMultiple
                    ? "image_group"
                    : "image") as "image" | "image_group",
                  reply_to: replyTo || null,
                }
              : m
          )
        );
      }
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert("Upload failed", e.message || "Something went wrong");
    }
  };

  const reactToMessage = async (msg: Message, emoji: string) => {
    const uid = currentUserIdRef.current;
    const current: Reaction[] = msg.reactions || [];
    const existing = current.find(
      (r) => r.user_id === uid && r.emoji === emoji
    );
    const newReactions = existing
      ? current.filter((r) => !(r.user_id === uid && r.emoji === emoji))
      : [...current.filter((r) => r.user_id !== uid), { emoji, user_id: uid }];

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, reactions: newReactions } : m
      )
    );
    supabase
      .from("messages")
      .update({ reactions: newReactions })
      .eq("id", msg.id)
      .then(() => {});
  };

  const deleteMessage = async (msg: Message, forEveryone: boolean) => {
    const uid = currentUserIdRef.current;
    if (forEveryone) {
      // Instantly update UI to show deleted state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                deleted_for_everyone: true,
                content: "🚫 This message was deleted",
              }
            : m
        )
      );
      // Also update the cache
      const cacheKey = `${uid}_${friendId}`;
      const cached = messageCache.get(cacheKey);
      if (cached) {
        messageCache.set(
          cacheKey,
          cached.map((m) =>
            m.id === msg.id
              ? { ...m, deleted_for_everyone: true, content: "🚫 This message was deleted" }
              : m
          )
        );
      }
      const { error } = await supabase
        .from("messages")
        .update({ deleted_for_everyone: true })
        .eq("id", msg.id);
      if (error) {
        console.warn("[useChat] delete for everyone failed:", error);
        // Revert on failure
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? { ...m, deleted_for_everyone: false, content: msg.content }
              : m
          )
        );
        Alert.alert("Delete failed", "Could not delete for everyone. Try again.");
      }
    } else {
      // "Delete for me" — only hides from YOUR side, friend still sees it
      const deletedFor = [...(msg.deleted_for || []), uid];
      // Instantly remove from local state
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      // Update cache so it stays hidden even without a refresh
      const cacheKey = `${uid}_${friendId}`;
      const cached = messageCache.get(cacheKey);
      if (cached) {
        messageCache.set(
          cacheKey,
          cached.filter((m) => m.id !== msg.id)
        );
      }
      // Persist to DB — only adds YOUR user ID to deleted_for array
      // Friend's side is NOT affected at all
      const { error } = await supabase
        .from("messages")
        .update({ deleted_for: deletedFor })
        .eq("id", msg.id);
      if (error) {
        console.warn("[useChat] delete for me failed:", error);
        // Revert — add message back
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === msg.id);
          if (exists) return prev;
          // Re-insert at correct position by timestamp
          const restored = [...prev, msg].sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return restored;
        });
        Alert.alert("Delete failed", "Could not delete. Try again.");
      }
    }
  };

  const clearChat = async () => {
    const uid = currentUserIdRef.current;
    setMessages([]);
    oldestCreatedAt.current = null;
    setHasMore(true);
    const cacheKey = `${uid}_${friendId}`;
    messageCache.delete(cacheKey);
    supabase
      .from("messages")
      .delete()
      .or(
        `and(sender_id.eq.${uid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${uid})`
      )
      .then(() => {});
  };

  const cleanup = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (markReadTimer.current) clearTimeout(markReadTimer.current);
    // Flush any pending read receipts before leaving the chat
    flushMarkAsRead();
    // Persist current messages to AsyncStorage for next offline load
    const uid = currentUserIdRef.current;
    if (uid) {
      const cacheKey = `${uid}_${friendId}`;
      const currentMsgs = messageCache.get(cacheKey);
      if (currentMsgs) {
        persistMessagesToStorage(cacheKey, currentMsgs);
      }
    }
    if (channelRef.current) supabase.removeChannel(channelRef.current);
  };

  return {
    messages,
    setMessages,
    loading,
    sending,
    friendLastSeen,
    friendIsTyping,
    currentUserId,
    currentUserIdRef,
    hasMore,
    loadingMore,
    init,
    sendMessage,
    sendImage,
    broadcastTyping,
    broadcastStopTyping,
    reactToMessage,
    deleteMessage,
    loadMoreMessages,
    clearChat,
    cleanup,
  };
};