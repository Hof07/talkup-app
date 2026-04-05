import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { X, Send } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../../lib/supabase";
import { encryptMessage, generateChatKey } from "../../../lib/crypto";

interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface Props {
  visible: boolean;
  messageContent: string;
  messageType: string;
  onClose: () => void;
  onForwarded: () => void;
}

export default function ForwardModal({
  visible,
  messageContent,
  messageType,
  onClose,
  onForwarded,
}: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    if (visible) loadFriends();
  }, [visible]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem("userSession");
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr);
      const uid = session.user?.id;
      setCurrentUserId(uid);

      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      // Get accepted friend requests
      const { data: requests } = await supabase
        .from("friend_requests")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .eq("status", "accepted");

      if (!requests || requests.length === 0) {
        setFriends([]);
        return;
      }

      const friendIds = requests.map((r) =>
        r.sender_id === uid ? r.receiver_id : r.sender_id
      );

      const { data: users } = await supabase
        .from("users")
        .select("id, username, avatar_url")
        .in("id", friendIds);

      setFriends(users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const forwardTo = async (friend: Friend) => {
    setSendingTo(friend.id);
    try {
      const chatKey = generateChatKey(currentUserId, friend.id);
      const isText = messageType === "text";

      await supabase.from("messages").insert([
        {
          sender_id: currentUserId,
          receiver_id: friend.id,
          content: isText
            ? encryptMessage(messageContent, chatKey)
            : messageContent,
          message_type: messageType || "text",
          is_read: false,
        },
      ]);

      onForwarded();
    } catch (e) {
      console.error(e);
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.sheet}>
              <View style={s.header}>
                <Text style={s.title}>Forward to</Text>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                  <X size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Preview */}
              <View style={s.preview}>
                <Text style={s.previewLabel}>Message:</Text>
                <Text style={s.previewText} numberOfLines={2}>
                  {messageType === "image" || messageType === "image_group"
                    ? "📷 Photo"
                    : messageType === "sticker"
                    ? "🎨 Sticker"
                    : messageContent}
                </Text>
              </View>

              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="#eab308"
                  style={{ marginTop: 30 }}
                />
              ) : friends.length === 0 ? (
                <Text style={s.emptyText}>No friends to forward to</Text>
              ) : (
                <FlatList
                  data={friends}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={s.friendRow}
                      onPress={() => forwardTo(item)}
                      disabled={sendingTo === item.id}
                      activeOpacity={0.7}
                    >
                      {item.avatar_url ? (
                        <Image
                          source={{ uri: item.avatar_url }}
                          style={s.avatar}
                        />
                      ) : (
                        <View style={s.avatarFallback}>
                          <Text style={s.avatarInitial}>
                            {item.username.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={s.friendName}>{item.username}</Text>
                      {sendingTo === item.id ? (
                        <ActivityIndicator size="small" color="#eab308" />
                      ) : (
                        <View style={s.sendBtn}>
                          <Send size={16} color="#000" />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={s.sep} />}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: "#111",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f4",
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f5f5f4",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#eab308",
  },
  previewLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
  },
  previewText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: "#333",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e7e5e4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: "#57534e",
  },
  friendName: {
    flex: 1,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: "#111",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eab308",
    alignItems: "center",
    justifyContent: "center",
  },
  sep: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 20,
  },
  emptyText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 40,
  },
});
