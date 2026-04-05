import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Easing,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { ChatTheme } from "../../../lib/themes";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

export function GiftBubble({ content, isMine, time, theme, onLongPress }: any) {
  const [revealed, setRevealed] = useState(false);

  const giftAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const msgOpacity = useRef(new Animated.Value(0)).current;

  const handleTap = () => {
    if (revealed) return;

    // Instagram Physics: Jump Up -> Drop Off Screen
    Animated.sequence([
      Animated.timing(giftAnim, {
        toValue: -50,
        duration: 350,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.delay(50),
      Animated.parallel([
        Animated.timing(giftAnim, {
          toValue: SCREEN_H * 0.6,
          duration: 600,
          easing: Easing.in(Easing.poly(3)),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setRevealed(true);
      Animated.timing(msgOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const bgColor = isMine ? theme.myBubbleBg : theme.theirBubbleBg;
  const textColor = isMine ? theme.myBubbleText : theme.theirBubbleText;
  const metaColor = isMine ? theme.myMetaColor : theme.theirMetaColor;

  return (
    <View style={[s.container, isMine ? s.alignRight : s.alignLeft]}>
      {!revealed ? (
        <View style={s.placeholder}>
          <Animated.View
            style={{
              opacity: opacityAnim,
              transform: [
                { translateY: giftAnim },
                {
                  scale: opacityAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.1, 1],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              onPress={handleTap}
              onLongPress={onLongPress}
              activeOpacity={0.9}
              style={s.giftPill}
            >
              {/* THE 3D PILL BASE */}
              <View style={s.pillShadow} />

              {/* RIBBON STRIPS */}
              <View style={s.ribbonH} />
              <View style={s.ribbonV} />

              {/* RECOLORED SVG BOW */}
              <View style={s.svgWrapper}>
                <Svg width="56" height="56" viewBox="0 0 128 128">
                  {/* Shadows/Creases (Originally #af0c1a -> Ice Blue #A9C2D9) */}
                  <Path
                    d="M60.23 50.47s-10.56 2.98-19.38 8.8c-7.26 4.78-13.83 12.04-13.83 12.04l1.88 17.76L34.1 93l21.81-19.63s3.1-8.1 4.21-13.65c.58-2.86.88-5.66.88-5.66l-.77-3.59z"
                    fill="#A9C2D9"
                  />
                  <Path
                    d="M69.19 52.69s2.21 8.35 3.02 11.66c.92 3.74 2.69 9.82 2.69 9.82l21.69 15.42l8.2-16.05s-4.61-5.72-7.09-8.71c-2.48-2.99-16.57-12.72-16.57-12.72l-11.94.58z"
                    fill="#A9C2D9"
                  />

                  {/* Main Loops (Originally #ff605e -> Glossy White #F0F8FF) */}
                  <Path
                    d="M13.32 98.51s.75-6.87 6.39-16.69s8.41-11.53 8.41-11.53s3.26-.76 6.15-1.11c3.12-.38 5.72-.09 5.72-.09s-3.93 4.78-6.15 9.39s-3.59 8.97-1.96 9.82c1.62.85 3.43-5 6.92-10.33c3.67-5.62 6.47-8.38 6.47-8.38s2.8.09 5.72.96c3.23.96 5.02 2.6 5.02 2.6s-5.76 15.49-8.92 24.46s-7.72 20.87-8.83 21.3c-1.11.43-3.04-3.02-4.24-5.75c-1.2-2.73-5.29-17.25-5.55-16.99s-15.15 2.34-15.15 2.34z"
                    fill="#F0F8FF"
                  />
                  <Path
                    d="M74.89 74.1s2.51-1.69 4.56-2.38c2.05-.68 5.68-1.26 5.68-1.26s2.18 4.26 3.88 7.17c1.71 2.9 4.49 8.88 6.28 8.02c1.79-.85-.51-6.89-1.84-9.56c-1.21-2.43-3.33-5.72-3.33-5.72s2.65-.34 7.51.6c4.87.94 7.17 2.56 7.17 2.56s4.5 6.68 6.92 10.76c3.22 5.44 7.26 14.68 7.26 14.68l-17.85 1.46l-8.97 19.64s-1.24.08-1.93-.34c-.68-.43-3.91-9.3-5.66-14.5c-2.75-8.21-9.68-31.13-9.68-31.13z"
                    fill="#F0F8FF"
                  />

                  {/* Mid-Shadows (Originally #dc0d28 -> Soft Blue-Gray #C4D8EB) */}
                  <Path
                    d="M100.1 98.73c-.69.64-7.36 17.21-7.56 17.7c-1.03 2.54-2.44 3.12-2.44 3.12s1.21 1.74 3.26 1.14c1.58-.46 9.1-18.27 9.1-18.27s13.59.13 15.57-.73c2.22-.96.92-2.77.92-2.77s-17.93-1.05-18.85-.19z"
                    fill="#C4D8EB"
                  />
                  <Path
                    d="M13.35 98.13s4.02-.73 7.72-1.71s8.44-2.37 8.44-2.37s3.74 10.22 4.86 13.65c1.12 3.43 4.04 11.1 4.04 11.1s-1.27 1.37-3.1.24c-1.71-1.06-4.98-10.1-5.84-12.5c-1.1-3.04-2.53-7.55-2.53-7.55s-3.88 1.29-7.11 1.88c-3.23.59-5.42 1.02-6.28.16c-.86-.85-.2-2.9-.2-2.9z"
                    fill="#C4D8EB"
                  />
                  <Path
                    d="M46.36 28.97l-18.55-4.76L14.7 34.87l-5.44 26l2.97 5s3.22 2.46 12.28.44c9.06-2.03 29.52-9.91 29.52-9.91s2.61 1.08 4.95 1.4s6.33-.52 6.33-.52s5.02.82 8.01.61c2.98-.21 4.26-.53 4.26-.53s9.81 5.22 19.61 7.99s17.37 3.4 19.08 3.2c2.66-.32 3.94-4.8 3.94-4.8l-1.07-9.81l-14.28-30.7l-29.74 8.53l-1.81 2.03l-7.79-2.12l-10.57 2.08l-1.33-1.56l-7.26-3.23z"
                    fill="#C4D8EB"
                  />

                  {/* Outer Loops (Originally #ff605e -> Glossy White #F0F8FF) */}
                  <Path
                    d="M54.59 33.37s1.18-3.66 10.07-3.66c8.29 0 9.41 3.28 9.41 3.28s1.08 7.2.1 13.44c-.87 5.58-3.96 11.41-3.96 11.41s-2.05.51-5.22.6c-2.99.08-6.17-.67-6.17-.67S56 52.8 54.81 46.56c-1.14-6.04-.22-13.19-.22-13.19z"
                    fill="#F0F8FF"
                  />
                  <Path
                    d="M75.11 31.77s1.13 1.38 2.13 3.86c.74 1.82 1.54 4.48 1.54 4.48s3.68-3.21 6.83-4.95c3.14-1.74 18.15-7.07 18.54.2c.31 5.91-10.75 5.79-15.94 7.9c-3.65 1.48-8.62 4.28-8.62 4.28v6.02s2.4 2.56 8.02 3.03c5.62.47 20.03.3 22.87.42c5.91.25 7.98 2.9 7.98 6.05c0 3.14-1.11 4.43-.74 4.84c.48.54 2.95-1.43 4.29-6.52c1.34-5.09 2.37-14.6 1.97-22.75c-.47-9.63-2.37-22.52-6.67-24.92s-16.84.8-24.2 3.95c-12.38 5.3-18 14.11-18 14.11z"
                    fill="#F0F8FF"
                  />
                  <Path
                    d="M50.37 39.74s.46-2.37 1.33-4.25c.68-1.47 1.93-3.28 1.93-3.28s-2.36-6.15-11.05-11.14s-26.87-8.89-32.66-6.69c-2.88 1.09-5.67 8.48-6.52 19.7c-.73 9.74.23 21.4 3.3 27.15c2.31 4.33 8.17 7.55 9.95 5.77c.87-.87-5.77-3.89.56-7.87c3.67-2.3 10.69-2.1 16.78-2.5c6.09-.4 8.69-.1 11.89-.9c3.2-.8 5.19-2 5.19-2s-.75-2.5-.9-3.7c-.21-1.64-.34-2.98-.34-2.98s-2.11-1.19-7.65-2.11c-5.43-.91-14.35-.71-14.48-6.69c-.17-7.59 8.59-5.69 12.68-4s9.49 4.99 9.99 5.49z"
                    fill="#F0F8FF"
                  />

                  {/* Highlights (Originally #fcc4bf -> Pure White #FFFFFF) */}
                  <Path
                    d="M59.9 45.07c1.7.34 2.67-4.23 3.74-5.48c1.68-1.95 5.66-1.57 5.59-4.18c-.05-2.06-7.63-3.01-10.36.81c-1.9 2.67-1.68 8.31 1.03 8.85z"
                    fill="#FFFFFF"
                  />
                </Svg>
              </View>
            </TouchableOpacity>
            <Text style={[s.tapHint, { color: metaColor }]}>
              Tap to reveal gift message
            </Text>
          </Animated.View>
        </View>
      ) : (
        <Animated.View
          style={[
            s.msgBubble,
            { backgroundColor: bgColor, opacity: msgOpacity },
          ]}
        >
          <Text style={[s.msgTxt, { color: textColor }]}>{content}</Text>
          <Text style={[s.timeTxt, { color: metaColor }]}>{time}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginVertical: 12, marginHorizontal: 16 },
  alignRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  alignLeft: { alignSelf: "flex-start", alignItems: "flex-start" },
  placeholder: {
    width: 160,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
  },

  giftPill: {
    width: 154,
    height: 68,
    backgroundColor: "#FF4081", // The vibrant pink from your reference
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  

  ribbonH: {
    position: "absolute",
    width: "100%",
    height: 10,
    backgroundColor: "#F8F9FA",
  },
  ribbonV: {
    position: "absolute",
    width: 10,
    height: "100%",
    backgroundColor: "#F8F9FA",
  },

  svgWrapper: {
    zIndex: 10,
    // The SVG paths you provided are slightly off-center in their 128x128 box,
    // so we use a slight margin/transform to perfectly align it over the white cross.
    transform: [{ translateY: 2 }],
  },

  msgBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: SCREEN_W * 0.75,
  },
  msgTxt: { fontSize: 16, fontFamily: "Outfit_400Regular" },
  timeTxt: { fontSize: 10, marginTop: 4, alignSelf: "flex-end", opacity: 0.6 },
  tapHint: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.9,
    fontFamily: "Outfit_500Medium",
  },
});
