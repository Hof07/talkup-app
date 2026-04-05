import React, { useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { X } from "lucide-react-native";
import { ChatTheme } from "../../../lib/themes";

const { height: SCREEN_H } = Dimensions.get("window");

export interface SpecialMessageType {
  id: string;
  emoji: string;
  label: string;
  description: string;
  comingSoon?: boolean;
}

const SPECIAL_TYPES: SpecialMessageType[] = [
  {
    id: "gift",
    emoji: "🎁",
    label: "Gift message",
    description: "Recipient taps to reveal your secret message",
  },
  // Future types — uncomment to add:
  // { id: "secret", emoji: "🤫", label: "Secret note", description: "Disappears after reading", comingSoon: true },
  // { id: "puzzle", emoji: "🧩", label: "Puzzle", description: "Solve to unlock", comingSoon: true },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: SpecialMessageType) => void;
  theme: ChatTheme;
}

export function SpecialMessagePicker({ visible, onClose, onSelect, theme }: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={s.flex} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={[
          s.sheet,
          { backgroundColor: theme.theirBubbleBg ?? "#1e1e1e" },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={s.handle} />

        <View style={s.header}>
          <Text style={[s.title, { color: theme.theirBubbleText ?? "#fff" }]}>
            Special messages
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X size={20} color={theme.theirMetaColor} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
          {SPECIAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                s.typeCard,
                { backgroundColor: `${theme.sendBtnBg}14`, borderColor: `${theme.sendBtnBg}28` },
                type.comingSoon && s.dimmed,
              ]}
              onPress={() => !type.comingSoon && onSelect(type)}
              activeOpacity={type.comingSoon ? 1 : 0.75}
            >
              <Text style={s.typeEmoji}>{type.emoji}</Text>
              <Text style={[s.typeLabel, { color: theme.theirBubbleText ?? "#fff" }]}>
                {type.label}
              </Text>
              <Text style={[s.typeDesc, { color: theme.theirMetaColor }]}>
                {type.description}
              </Text>
              {type.comingSoon && (
                <View style={[s.badge, { backgroundColor: theme.sendBtnBg }]}>
                  <Text style={s.badgeTxt}>Soon</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: 12,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    maxHeight: "80%",
  },
  handle: {
    alignSelf: "center",
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontFamily: "Outfit_600SemiBold", fontSize: 17 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  typeCard: {
    width: "47%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  dimmed: { opacity: 0.5 },
  typeEmoji: { fontSize: 36, marginBottom: 4 },
  typeLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 14, textAlign: "center" },
  typeDesc: { fontFamily: "Outfit_400Regular", fontSize: 11, textAlign: "center", lineHeight: 16 },
  badge: {
    position: "absolute",
    top: 10, right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: "#fff" },
});