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

export const useChat = (friendId: string) => {
  const currentUserIdRef = useRef("");
  const channelRef = useRef<any>(null);
  const chatKeyRef = useRef("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [friendLastSeen, setFriendLastSeen] = useState<string | null>(null);
  const [friendIsTyping, setFriendIsTyping] = useState(false);

  const decryptMsg = (msg: Message): Message => {
    if (msg.deleted_for_everyone)
      return { ...msg, content: "🚫 This message was deleted" };
    if (msg.message_type === "image" || msg.message_type === "image_group")
      return msg;
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
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) throw error;
      await supabase
        .from("users")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", uid);
      const { data: fd } = await supabase
        .from("users")
        .select("last_seen")
        .eq("id", friendId)
        .single();
      setFriendLastSeen(fd?.last_seen || null);
      await loadMessages(uid);
      setupRealtime(uid);
      setLoading(false);
      return uid;
    } catch (e: any) {
      console.error(e.message);
      setLoading(false);
    }
  };

  const loadMessages = async (uid: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${uid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${uid})`,
      )
      .order("created_at", { ascending: true });
    if (error) return;
    const filtered = (data || []).filter(
      (m) => !(m.deleted_for || []).includes(uid),
    );
    setMessages(filtered.map(decryptMsg));
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", friendId)
      .eq("receiver_id", uid)
      .eq("is_read", false);
  };

  const setupRealtime = (uid: string) => {
    const channelName = `room_${[uid, friendId].sort().join("_")}`;
    channelRef.current = supabase
      .channel(channelName)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id === friendId) {
          setFriendIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(
            () => setFriendIsTyping(false),
            3000,
          );
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        if (payload.payload?.user_id === friendId) {
          setFriendIsTyping(false);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as Message;
          const relevant =
            (msg.sender_id === uid && msg.receiver_id === friendId) ||
            (msg.sender_id === friendId && msg.receiver_id === uid);
          if (!relevant) return;
          if ((msg.deleted_for || []).includes(uid)) return;
          const dec = decryptMsg(msg);
          setMessages((prev) => {
            const filtered = prev.filter(
              (m) => !m.is_temp || m.content !== dec.content,
            );
            if (filtered.find((m) => m.id === dec.id)) return filtered;
            return [...filtered, dec];
          });
          if (msg.receiver_id === uid)
            await supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", msg.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new as Message;
          const relevant =
            (updated.sender_id === uid && updated.receiver_id === friendId) ||
            (updated.sender_id === friendId && updated.receiver_id === uid);
          if (!relevant) return;
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
                : m,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        },
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

  // ── Send message with optional reply ──────────────────────────────────────
  const sendMessage = async (plainText: string, replyTo?: ReplyTo | null) => {
    const uid = currentUserIdRef.current;
    broadcastStopTyping();
    setSending(true);
    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender_id: uid,
        receiver_id: friendId,
        content: plainText,
        created_at: new Date().toISOString(),
        is_read: false,
        is_temp: true,
        message_type: "text" as const,
        reply_to: replyTo || null,
      },
    ]);
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          sender_id: uid,
          receiver_id: friendId,
          content: encryptMessage(plainText, chatKeyRef.current),
          is_read: false,
          message_type: "text",
          reply_to: replyTo || null,
        },
      ])
      .select()
      .single();
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert("Failed to send", error.message);
    } else if (data) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...data,
                content: plainText,
                is_temp: false,
                reply_to: replyTo || null,
              }
            : m,
        ),
      );
    }
    setSending(false);
    return { tempId, error };
  };

  const uploadImageFile = async (
    uri: string,
    uid: string,
    token: string,
  ): Promise<string> => {
    const fileName = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const formData = new FormData();
    formData.append("file", { uri, name: fileName, type: "image/jpeg" } as any);
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
        uris.map((uri) => uploadImageFile(uri, uid, token)),
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
                  message_type: (isMultiple ? "image_group" : "image") as
                    | "image"
                    | "image_group",
                  reply_to: replyTo || null,
                }
              : m,
          ),
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
      (r) => r.user_id === uid && r.emoji === emoji,
    );
    const newReactions = existing
      ? current.filter((r) => !(r.user_id === uid && r.emoji === emoji))
      : [...current.filter((r) => r.user_id !== uid), { emoji, user_id: uid }];
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, reactions: newReactions } : m,
      ),
    );
    await supabase
      .from("messages")
      .update({ reactions: newReactions })
      .eq("id", msg.id);
  };

  const deleteMessage = async (msg: Message, forEveryone: boolean) => {
    const uid = currentUserIdRef.current;
    if (forEveryone) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                deleted_for_everyone: true,
                content: "🚫 This message was deleted",
              }
            : m,
        ),
      );
      await supabase
        .from("messages")
        .update({ deleted_for_everyone: true })
        .eq("id", msg.id);
    } else {
      const deletedFor = [...(msg.deleted_for || []), uid];
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      await supabase
        .from("messages")
        .update({ deleted_for: deletedFor })
        .eq("id", msg.id);
    }
  };

  const clearChat = async () => {
    const uid = currentUserIdRef.current;
    setMessages([]);
    await supabase
      .from("messages")
      .delete()
      .or(
        `and(sender_id.eq.${uid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${uid})`,
      );
  };

  const cleanup = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
    init,
    sendMessage,
    sendImage,
    broadcastTyping,
    broadcastStopTyping,
    reactToMessage,
    deleteMessage,
    clearChat,
    cleanup,
  };
};
