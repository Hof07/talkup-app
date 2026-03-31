import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Animated,
  StyleSheet,
} from "react-native";
import {
  Palette,
  Trash2,
  Lock,
  Unlock,
  Timer,
  Bell,
  BellOff,
  Search,
} from "lucide-react-native";
import { ChatTheme } from "../../../lib/themes";

interface Props {
  visible: boolean;
  dotsMenuAnim: Animated.Value;
  theme: ChatTheme;
  onClose: () => void;

  // Existing
  onThemePress: () => void;
  onClearChat: () => void;

  // Privacy & Security
  onLockChat: () => void;
  isChatLocked: boolean;
  onDisappearingMessages: () => void;
  disappearAfterHours: number | null; // null = off

  // Notifications & Search
  onMuteNotifications: () => void;
  muteUntil: Date | null; // null = not muted
  onSearchChat: () => void;
}

export default function DotsMenu({
  visible,
  dotsMenuAnim,
  theme,
  onClose,
  onThemePress,
  onClearChat,
  onLockChat,
  isChatLocked,
  onDisappearingMessages,
  disappearAfterHours,
  onMuteNotifications,
  muteUntil,
  onSearchChat,
}: Props) {
  const isMuted = muteUntil !== null && muteUntil > new Date();

  const muteLabel = isMuted
    ? `Muted until ${muteUntil!.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "Mute Notifications";

  const disappearLabel = disappearAfterHours
    ? `Auto-delete after ${disappearAfterHours}h`
    : "Disappearing Messages";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.dotsOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                s.dotsMenu,
                {
                  opacity: dotsMenuAnim,
                  transform: [
                    {
                      scale: dotsMenuAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* ── Chat Theme ── */}
              <TouchableOpacity style={s.dotsItem} onPress={onThemePress}>
                <View style={[s.dotsIcon, { backgroundColor: "#F3F0FF" }]}>
                  <Palette size={18} color="#7C3AED" />
                </View>
                <View style={s.dotsTextCol}>
                  <Text style={s.dotsTitle}>Chat Theme</Text>
                  <Text style={s.dotsSub}>Change chat appearance</Text>
                </View>
                <View
                  style={[
                    s.currentThemeDot,
                    { backgroundColor: theme.myBubbleBg },
                  ]}
                />
              </TouchableOpacity>

              <View style={s.dotsDivider} />

              {/* ── Privacy & Security ── */}
              <View style={s.sectionLabel}>
                <Text style={s.sectionLabelText}>Privacy & Security</Text>
              </View>

              {/* Lock Chat */}
              <TouchableOpacity style={s.dotsItem} onPress={onLockChat}>
                <View style={[s.dotsIcon, { backgroundColor: "#EEF2FF" }]}>
                  {isChatLocked ? (
                    <Lock size={18} color="#4F46E5" />
                  ) : (
                    <Unlock size={18} color="#4F46E5" />
                  )}
                </View>
                <View style={s.dotsTextCol}>
                  <Text style={s.dotsTitle}>
                    {isChatLocked ? "Unlock Chat" : "Lock Chat"}
                  </Text>
                  <Text style={s.dotsSub}>Biometric or PIN protection</Text>
                </View>
                {isChatLocked && (
                  <View style={s.activeBadge}>
                    <Text style={s.activeBadgeText}>ON</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Disappearing Messages */}
              <TouchableOpacity
                style={s.dotsItem}
                onPress={onDisappearingMessages}
              >
                <View style={[s.dotsIcon, { backgroundColor: "#EEF2FF" }]}>
                  <Timer size={18} color="#4F46E5" />
                </View>
                <View style={s.dotsTextCol}>
                  <Text style={s.dotsTitle}>{disappearLabel}</Text>
                  <Text style={s.dotsSub}>Auto-delete messages</Text>
                </View>
                {disappearAfterHours != null && (
                  <View style={s.activeBadge}>
                    <Text style={s.activeBadgeText}>{disappearAfterHours}h</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={s.dotsDivider} />

              {/* ── Notifications & Search ── */}
              <View style={s.sectionLabel}>
                <Text style={s.sectionLabelText}>Notifications & Search</Text>
              </View>

              {/* Mute Notifications */}
              <TouchableOpacity style={s.dotsItem} onPress={onMuteNotifications}>
                <View style={[s.dotsIcon, { backgroundColor: "#F0FDF4" }]}>
                  {isMuted ? (
                    <BellOff size={18} color="#16a34a" />
                  ) : (
                    <Bell size={18} color="#16a34a" />
                  )}
                </View>
                <View style={s.dotsTextCol}>
                  <Text style={s.dotsTitle}>{muteLabel}</Text>
                  <Text style={s.dotsSub}>
                    {isMuted ? "Tap to unmute" : "Silence this chat"}
                  </Text>
                </View>
                {isMuted && (
                  <View style={[s.activeBadge, s.activeBadgeGreen]}>
                    <Text style={[s.activeBadgeText, s.activeBadgeTextGreen]}>
                      ON
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Search in Chat */}
              <TouchableOpacity style={s.dotsItem} onPress={onSearchChat}>
                <View style={[s.dotsIcon, { backgroundColor: "#F0FDF4" }]}>
                  <Search size={18} color="#16a34a" />
                </View>
                <View style={s.dotsTextCol}>
                  <Text style={s.dotsTitle}>Search in Chat</Text>
                  <Text style={s.dotsSub}>Find messages by keyword</Text>
                </View>
              </TouchableOpacity>

              <View style={s.dotsDivider} />

              {/* ── Clear Chat ── */}
              <TouchableOpacity style={s.dotsItem} onPress={onClearChat}>
                <View style={[s.dotsIcon, { backgroundColor: "#FFF0F0" }]}>
                  <Trash2 size={18} color="#ef4444" />
                </View>
                <View style={s.dotsTextCol}>
                  <Text style={[s.dotsTitle, { color: "#ef4444" }]}>
                    Clear Chat
                  </Text>
                  <Text style={s.dotsSub}>Delete all messages</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  dotsOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },

  dotsMenu: {
    position: "absolute",
    top: 100,
    right: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    width: 260,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    overflow: "hidden",
  },

  dotsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },

  dotsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  dotsTextCol: { flex: 1 },

  dotsTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: "#111",
  },

  dotsSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: "#999",
    marginTop: 1,
  },

  dotsDivider: { height: 1, backgroundColor: "#f0f0f0" },

  currentThemeDot: { width: 16, height: 16, borderRadius: 8 },

  sectionLabel: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },

  sectionLabelText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 10,
    color: "#bbb",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  activeBadge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  activeBadgeText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 10,
    color: "#4F46E5",
  },

  activeBadgeGreen: {
    backgroundColor: "#DCFCE7",
  },

  activeBadgeTextGreen: {
    color: "#16a34a",
  },
});