import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
} from "react-native";
import { Copy, Trash2, Reply, Forward, Star } from "lucide-react-native";
import { Message } from "../utils/types";

const { width } = Dimensions.get("window");

const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

interface Props {
  visible: boolean;
  selectedMsg: Message | null;
  menuAnim: Animated.Value;
  currentUserId: string;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onCopy: () => void;
  onReply: () => void;
  onForward?: () => void;
  onStar?: () => void;
  isStarred?: boolean;
}

export default function ContextMenu({
  visible,
  selectedMsg,
  menuAnim,
  currentUserId,
  onClose,
  onReact,
  onDelete,
  onCopy,
  onReply,
  onForward,
  onStar,
  isStarred,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                s.container,
                {
                  opacity: menuAnim,
                  transform: [
                    {
                      scale: menuAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.85, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Emoji reactions */}
              <View style={s.emojiRow}>
                {EMOJIS.map((emoji) => {
                  const isActive = (selectedMsg?.reactions || []).some(
                    (r) => r.emoji === emoji && r.user_id === currentUserId,
                  );
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[s.emojiBtn, isActive && s.emojiBtnActive]}
                      onPress={() => onReact(emoji)}
                    >
                      <Text style={s.emojiBtnText}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.divider} />

              {/* Reply */}
              <TouchableOpacity style={s.menuItem} onPress={onReply}>
                <Reply size={18} color="#333" />
                <Text style={s.menuItemText}>Reply</Text>
              </TouchableOpacity>

              <View style={s.divider} />

              {/* Forward */}
              {onForward && (
                <>
                  <TouchableOpacity style={s.menuItem} onPress={onForward}>
                    <Forward size={18} color="#333" />
                    <Text style={s.menuItemText}>Forward</Text>
                  </TouchableOpacity>
                  <View style={s.divider} />
                </>
              )}

              {/* Star */}
              {onStar && (
                <>
                  <TouchableOpacity style={s.menuItem} onPress={onStar}>
                    <Star
                      size={18}
                      color={isStarred ? "#eab308" : "#333"}
                      fill={isStarred ? "#eab308" : "none"}
                    />
                    <Text style={s.menuItemText}>
                      {isStarred ? "Unstar" : "Star"}
                    </Text>
                  </TouchableOpacity>
                  <View style={s.divider} />
                </>
              )}

              {/* Copy */}
              <TouchableOpacity style={s.menuItem} onPress={onCopy}>
                <Copy size={18} color="#333" />
                <Text style={s.menuItemText}>Copy</Text>
              </TouchableOpacity>

              <View style={s.divider} />

              {/* Delete */}
              <TouchableOpacity style={s.menuItem} onPress={onDelete}>
                <Trash2 size={18} color="#ef4444" />
                <Text style={[s.menuItemText, { color: "#ef4444" }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    width: width * 0.78,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: "#fafafa",
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  emojiBtnActive: {
    backgroundColor: "#FFF3CD",
    borderWidth: 2,
    borderColor: "#eab308",
  },
  emojiBtnText: { fontSize: 24 },
  divider: { height: 1, backgroundColor: "#f0f0f0" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  menuItemText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: "#333",
  },
});
