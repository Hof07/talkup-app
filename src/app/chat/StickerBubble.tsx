/**
 * StickerBubble.tsx
 *
 * Drop-in sticker render component for MessageBubble.
 *
 * Renders a sticker without a bubble background — just the image
 * floating with a timestamp badge below it, same as WhatsApp/Telegram.
 *
 * Import this into MessageBubble.tsx and use it in the JSX tree
 * as shown in sticker_migration.sql comments.
 */

import React, { useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Dimensions,
} from "react-native";
import { Check, CheckCheck } from "lucide-react-native";

const { width } = Dimensions.get("window");
const STICKER_MSG_SIZE = width * 0.38; // sticker size in chat

interface StickerBubbleProps {
  uri: string;
  isMine: boolean;
  time: string;
  isRead?: boolean;
  isTemp?: boolean;
  onLongPress: () => void;
}

export function StickerBubble({
  uri,
  isMine,
  time,
  isRead,
  isTemp,
  onLongPress,
}: StickerBubbleProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [loaded, setLoaded] = useState(false);

  const onLoad = () => {
    setLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const renderTick = () => {
    if (isTemp)
      return <Check size={11} color="rgba(0,0,0,0.3)" />;
    if (isRead)
      return <CheckCheck size={11} color="#4FC3F7" />;
    return <Check size={11} color="rgba(0,0,0,0.5)" />;
  };

  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      delayLongPress={300}
      activeOpacity={0.85}
      style={[
        s.wrapper,
        isMine ? s.wrapperMine : s.wrapperTheir,
      ]}
    >
      {/* Sticker image — no bubble background */}
      <Animated.Image
        source={{ uri }}
        style={[
          s.image,
          { opacity: loaded ? opacity : 0.0 },
        ]}
        resizeMode="contain"
        onLoad={onLoad}
      />

      {/* Timestamp floated bottom-right */}
      <View style={[s.meta, isMine ? s.metaMine : s.metaTheir]}>
        <Text style={s.metaTime}>{time}</Text>
        {isMine && <View style={{ marginLeft: 2 }}>{renderTick()}</View>}
      </View>
    </TouchableOpacity>
  );
}

export default StickerBubble;

const s = StyleSheet.create({
  wrapper: {
    width: STICKER_MSG_SIZE,
    position: "relative",
  },
  wrapperMine: { alignItems: "flex-end" },
  wrapperTheir: { alignItems: "flex-start" },

  image: {
    width: STICKER_MSG_SIZE,
    height: STICKER_MSG_SIZE,
  },

  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  metaMine: { justifyContent: "flex-end" },
  metaTheir: { justifyContent: "flex-start" },
  metaTime: {
    fontSize: 10,
    color: "#888",
    fontFamily: "Outfit_400Regular",
  },
});