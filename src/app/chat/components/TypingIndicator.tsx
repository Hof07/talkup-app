import React, { useEffect, useRef } from "react";
import {
  View,
  Animated,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import { ChatTheme } from "../../../lib/themes";

const { width } = Dimensions.get("window");

interface Props {
  visible: boolean;
  avatar_url: string;
  username: string;
  theme: ChatTheme;
}

export default function TypingIndicator({
  visible,
  avatar_url,
  username,
  theme,
}: Props) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const containerTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (visible) {
      // Fade + slide in
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(containerTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Looping bounce animation for 3 dots
      const bounceDot = (dot: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: -6,
              duration: 280,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 280,
              useNativeDriver: true,
            }),
            Animated.delay(400),
          ])
        );

      const anim1 = bounceDot(dot1, 0);
      const anim2 = bounceDot(dot2, 160);
      const anim3 = bounceDot(dot3, 320);

      anim1.start();
      anim2.start();
      anim3.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
        dot1.setValue(0);
        dot2.setValue(0);
        dot3.setValue(0);
      };
    } else {
      // Fade + slide out
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(containerTranslateY, {
          toValue: 10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        s.wrapper,
        {
          opacity: containerOpacity,
          transform: [{ translateY: containerTranslateY }],
        },
      ]}
    >
      {/* Avatar */}
      <Image
        source={{
          uri:
            avatar_url ||
            `https://ui-avatars.com/api/?name=${username}&background=FFD700&color=000`,
        }}
        style={s.avatar}
      />

      {/* Bubble */}
      <View style={[s.bubble, { backgroundColor: theme.theirBubbleBg }]}>
        <Animated.View
          style={[s.dot, { backgroundColor: theme.theirMetaColor, transform: [{ translateY: dot1 }] }]}
        />
        <Animated.View
          style={[s.dot, { backgroundColor: theme.theirMetaColor, transform: [{ translateY: dot2 }] }]}
        />
        <Animated.View
          style={[s.dot, { backgroundColor: theme.theirMetaColor, transform: [{ translateY: dot3 }] }]}
        />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 6,
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    gap: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});