// ─── components/ActionModal.tsx ──────────────────────────────────────────────
//
// Bottom sheet that appears on long-press of a friend row.
// Options: Hide chat / Unhide chat / Delete / Cancel
// Styled like WhatsApp/Instagram bottom action sheets.

import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { EyeOff, Eye, Trash2, Pin, PinOff, Ban } from "lucide-react-native";
import Colors from "../constants/colors";
import { Friend } from "../home_compo/types";
import { isPinnedChat, togglePinChat } from "../home_compo/pinnedChats";

interface Props {
  friend:     Friend | null;
  visible:    boolean;
  onHide:     (id: string) => void;
  onUnhide:   (id: string) => void;
  onDelete:   (friend: Friend) => void;
  onCancel:   () => void;
  onPinToggle?: () => void | Promise<void>;
}

export const ActionModal = ({
  friend,
  visible,
  onHide,
  onUnhide,
  onDelete,
  onCancel,
  onPinToggle,
}: Props) => {
  const slideAnim   = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [pinned, setPinned] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim,   { toValue: 0,   useNativeDriver: true, tension: 100, friction: 12 }),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 200,         useNativeDriver: true }),
      ]).start();
      if (friend) {
        isPinnedChat(friend.id).then(setPinned);
        import("../home_compo/blockedUsers").then((m) => m.isUserBlocked(friend.id).then(setBlocked));
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 300, duration: 220, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!friend) return null;

  const handlePin = async () => {
    const newPinned = await togglePinChat(friend.id);
    setPinned(newPinned);
    onPinToggle?.();
    onCancel();
  };

  const handleBlock = async () => {
    const m = await import("../home_compo/blockedUsers");
    const newBlocked = await m.toggleBlockUser(friend.id);
    setBlocked(newBlocked);
    // User needs to be alerted or UI updated, but simple toggle for now
    onCancel();
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Friend name label */}
        <Text style={styles.sheetTitle}>{friend.username}</Text>

        {/* Pin / Unpin */}
        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.7}
          onPress={handlePin}
        >
          <View style={[styles.optionIcon, { backgroundColor: "#FFF8E1" }]}>
            {pinned ? <PinOff size={20} color="#F57F17" /> : <Pin size={20} color="#F57F17" />}
          </View>
          <View>
            <Text style={styles.optionLabel}>{pinned ? "Unpin chat" : "Pin chat"}</Text>
            <Text style={styles.optionSub}>{pinned ? "Remove from top" : "Keep at the top of your chats"}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Hide / Unhide */}
        {friend.isHidden ? (
          <TouchableOpacity
            style={styles.option}
            activeOpacity={0.7}
            onPress={() => { onUnhide(friend.id); onCancel(); }}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#E8F5E9" }]}>
              <Eye size={20} color="#2E7D32" />
            </View>
            <View>
              <Text style={styles.optionLabel}>Unhide chat</Text>
              <Text style={styles.optionSub}>Show this chat normally</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.option}
            activeOpacity={0.7}
            onPress={() => { onHide(friend.id); onCancel(); }}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#F3E5F5" }]}>
              <EyeOff size={20} color="#6A1B9A" />
            </View>
            <View>
              <Text style={styles.optionLabel}>Hide chat</Text>
              <Text style={styles.optionSub}>Only visible with your secret key</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        {/* Block / Unblock */}
        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.7}
          onPress={handleBlock}
        >
          <View style={[styles.optionIcon, { backgroundColor: "#FFEBEE" }]}>
            <Ban size={20} color="#D32F2F" />
          </View>
          <View>
            <Text style={[styles.optionLabel, { color: "#D32F2F" }]}>{blocked ? "Unblock" : "Block"} user</Text>
            <Text style={styles.optionSub}>{blocked ? "Allow messages again" : "Stop receiving messages"}</Text>
          </View>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.7}
          onPress={() => { onDelete(friend); onCancel(); }}
        >
          <View style={[styles.optionIcon, { backgroundColor: "#FFEBEE" }]}>
            <Trash2 size={20} color="#C62828" />
          </View>
          <View>
            <Text style={[styles.optionLabel, { color: "#C62828" }]}>Remove friend</Text>
            <Text style={styles.optionSub}>Delete chat and friendship</Text>
          </View>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral300,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
    textAlign: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  optionSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral200,
    marginVertical: 4,
  },
  cancelBtn: {
    marginTop: 16,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.neutral600,
  },
});