import { useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { EyeOff } from "lucide-react-native";
import Colors from "../constants/colors";
import { Friend } from "../home_compo/types";
import { formatLastSeen, isOnline } from "../home_compo/utils";

interface Props {
  item: Friend;
  onLongPress: () => void;
}

export const FriendRow = ({ item, onLongPress }: Props) => {
  const online = isOnline(item.last_seen);

  // Separate animation nodes
  const bgAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    // JS Driver: Background Color
    Animated.timing(bgAnim, {
      toValue: 1,
      duration: 80,
      useNativeDriver: false,
    }).start();

    // Native Driver: Scale
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const onPressOut = () => {
    // JS Driver: Fade background out
    Animated.timing(bgAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    // Native Driver: Snap scale back
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const rowBg = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "rgba(0,0,0,0)",
      Colors.primaryFaded ?? "rgba(255,214,0,0.12)",
    ],
  });

  return (
    /* LAYER 1: Native Driver 
       Handles Scale. Native driver "takes over" this node.
    */
    <Animated.View
      style={[
        styles.rowWrap,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* LAYER 2: JS Driver 
         Handles Background Color. Since this is a child, it doesn't 
         conflict with the Native Driver on the parent.
      */}
      <Animated.View style={[styles.innerContainer, { backgroundColor: rowBg }]}>
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
                id: item.id,
                username: item.username,
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  rowWrap: {
    marginHorizontal: 4,
  },
  innerContainer: {
    borderRadius: 16,
    overflow: "hidden", // Ensures background color respects border radius
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
  lastMessageMuted: {
    fontStyle: "italic",
  },
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