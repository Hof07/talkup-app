// ─── components/FriendRow.tsx ─────────────────────────────────────────────────

import { useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { EyeOff, Pin } from "lucide-react-native";
import Colors from "../constants/colors";
// import { isOnline, formatLastSeen } from "../utils";
// import { Friend } from "../types";
import { TalkUpRow } from "./TalkUpRow";
import { Friend } from "../home_compo/types";
import { formatLastSeen, isOnline } from "../home_compo/utils";

interface Props {
  item:        Friend;
  onLongPress: () => void;
  isPinned?:   boolean;
}

export const FriendRow = ({ item, onLongPress, isPinned }: Props) => {
  if (item.isTalkUp) return <TalkUpRow item={item} />;
  return <RegularFriendRow item={item} onLongPress={onLongPress} isPinned={isPinned} />;
};

// ── Regular friend row ────────────────────────────────────────────────────────

const RegularFriendRow = ({ item, onLongPress, isPinned }: Props) => {
  const online    = isOnline(item.last_seen);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);   // bg color via state, not native driver

  const onPressIn = () => {
    setPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const onPressOut = () => {
    setPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.rowWrap,
        { transform: [{ scale: scaleAnim }] },
        pressed && styles.rowWrapPressed,
      ]}
    >
      <TouchableOpacity
        style={styles.row}
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLongPress={onLongPress}
        delayLongPress={400}
        onPress={() =>
          router.push({
            pathname: "/chat/[id]",
            params: {
              id:         item.id,
              username:   item.username,
              avatar_url: item.avatar_url ?? "",
            },
          })
        }
      >
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {item.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.onlineDot,
              { backgroundColor: online ? Colors.green : Colors.neutral400 },
            ]}
          />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.topRow}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.username}</Text>
              {item.isHidden && (
                <View style={styles.hiddenBadge}>
                  <EyeOff size={10} color={Colors.neutral500} />
                  <Text style={styles.hiddenBadgeText}>hidden</Text>
                </View>
              )}
              {isPinned && (
                <Pin size={12} color={Colors.primary} style={{ marginLeft: 2 }} />
              )}
            </View>
            <Text style={styles.time}>{item.last_message_time}</Text>
          </View>

          <View style={styles.bottomRow}>
            {item.last_message ? (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.last_message}
              </Text>
            ) : (
              <Text style={[styles.lastMessage, styles.lastMessageMuted]}>
                {online ? "online" : formatLastSeen(item.last_seen)}
              </Text>
            )}
            {!!item.unread_count && item.unread_count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  rowWrap: {
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: "transparent",
  },
  rowWrapPressed: {
    backgroundColor: Colors.primaryFaded ?? "rgba(255,214,0,0.12)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 14,
  },
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: Colors.neutral600,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  info: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  hiddenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.neutral200,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hiddenBadgeText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 10,
    color: Colors.neutral500,
  },
  time: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.neutral400,
    flex: 1,
    marginRight: 8,
  },
  lastMessageMuted: { fontStyle: "italic" },
  badge: {
    backgroundColor: Colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.black,
  },
});