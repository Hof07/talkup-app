import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import { X, Reply, ImageIcon } from "lucide-react-native";
import { ReplyTo } from "../utils/types";
import { ChatTheme } from "../../../lib/themes";

const { width } = Dimensions.get("window");

interface Props {
  replyTo: ReplyTo;
  currentUserId: string;
  username: string;
  onCancel: () => void;
  theme: ChatTheme;
}

export default function ReplyPreview({
  replyTo,
  currentUserId,
  username,
  onCancel,
  theme,
}: Props) {
  const isMyMsg = replyTo.sender_id === currentUserId;
  const senderName = isMyMsg ? "You" : username;
  const isImage =
    replyTo.message_type === "image" ||
    replyTo.message_type === "image_group";

  return (
    <View style={[s.wrapper, { backgroundColor: theme.inputBarBg }]}>
      {/* Left accent bar */}
      <View style={[s.accentBar, { backgroundColor: theme.sendBtnBg }]} />

      {/* Content */}
      <View style={s.content}>
        <View style={[s.replyIcon, { backgroundColor: `${theme.sendBtnBg}22` }]}>
          <Reply size={14} color={theme.sendBtnBg} />
        </View>
        <View style={s.textCol}>
          <Text style={[s.senderName, { color: theme.sendBtnBg }]}>
            {senderName}
          </Text>
          {isImage ? (
            <View style={s.imageRow}>
              <ImageIcon size={12} color={theme.theirMetaColor} />
              <Text style={[s.previewText, { color: theme.theirMetaColor }]}>
                {replyTo.message_type === "image_group" ? "Images" : "Photo"}
              </Text>
            </View>
          ) : (
            <Text
              style={[s.previewText, { color: theme.theirMetaColor }]}
              numberOfLines={1}
            >
              {replyTo.content}
            </Text>
          )}
        </View>

        {/* Image thumbnail */}
        {isImage && (
          <Image
            source={{ uri: replyTo.content }}
            style={s.thumb}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Cancel */}
      <TouchableOpacity onPress={onCancel} style={s.cancelBtn} activeOpacity={0.7}>
        <X size={18} color={theme.theirMetaColor} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.07)",
    gap: 10,
  },
  accentBar: {
    width: 3,
    height: 44,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  replyIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1 },
  senderName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    marginBottom: 2,
  },
  previewText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  cancelBtn: {
    padding: 6,
  },
});