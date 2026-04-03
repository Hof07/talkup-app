// ─── components/TalkUpRow.tsx ─────────────────────────────────────────────────

import { useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { BadgeCheck, Megaphone } from "lucide-react-native";
import Colors from "../constants/colors";
import { Friend } from "../home_compo/types";
// import { Friend } from "./types";

interface Props {
  item: Friend;
}

export const TalkUpRow = ({ item }: Props) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);   // drives bg color via state

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
        pressed && styles.rowWrapPressed,   // bg swap via state — no native driver conflict
      ]}
    >
      <TouchableOpacity
        style={styles.row}
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id, username: "TalkUp", avatar_url: "" } })}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Megaphone size={24} color={Colors.black} />
          </View>
          <View style={[styles.dot, { backgroundColor: Colors.green }]} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.topRow}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>TalkUp</Text>
              <BadgeCheck size={15} color={Colors.primary} fill={Colors.primary} />
              <View style={styles.officialBadge}>
                <Text style={styles.officialBadgeText}>Official</Text>
              </View>
            </View>
            <Text style={styles.time}>{item.last_message_time}</Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.preview} numberOfLines={1}>
              {item.last_message || "Updates, news & announcements"}
            </Text>
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
  avatarWrap: { position: "relative" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
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
    gap: 5,
  },
  name: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  officialBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  officialBadgeText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 10,
    color: Colors.black,
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
  preview: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.neutral400,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: Colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.black,
  },
});