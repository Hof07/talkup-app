import React, { useState, useRef, useEffect } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  Animated, StyleSheet, Dimensions, Platform, KeyboardAvoidingView,
} from "react-native";
import { ArrowLeft, Send } from "lucide-react-native";
import { ChatTheme } from "../../../lib/themes";

const { height: SCREEN_H } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onBack: () => void;
  onSend: (message: string) => void;
  theme: ChatTheme;
}

export function GiftMessageComposer({ visible, onBack, onSend, theme }: Props) {
  const [text, setText] = useState("");
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      setText("");
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onBack}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Animated.View style={[s.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity style={s.flex} onPress={onBack} activeOpacity={1} />
        </Animated.View>

        <Animated.View
          style={[
            s.sheet,
            { backgroundColor: theme.theirBubbleBg ?? "#1e1e1e" },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <ArrowLeft size={20} color={theme.theirMetaColor} />
            </TouchableOpacity>
            <Text style={[s.title, { color: theme.theirBubbleText ?? "#fff" }]}>
              🎁  Gift message
            </Text>
            <View style={{ width: 20 }} />
          </View>

          {/* Preview */}
          <View style={[s.previewBox, { backgroundColor: `${theme.sendBtnBg}14` }]}>
            <Text style={s.previewEmoji}>🎁</Text>
            <Text style={[s.previewHint, { color: theme.theirMetaColor }]}>
              They'll see the gift box and tap to flip and reveal your message
            </Text>
          </View>

          {/* Input */}
          <View
            style={[
              s.inputWrap,
              { borderColor: `${theme.sendBtnBg}35`, backgroundColor: `${theme.sendBtnBg}10` },
            ]}
          >
            <TextInput
              style={[s.input, { color: theme.theirBubbleText ?? "#fff" }]}
              placeholder="Write your secret message…"
              placeholderTextColor={theme.theirMetaColor}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={300}
              autoFocus
              cursorColor={theme.sendBtnBg}
              selectionColor={`${theme.sendBtnBg}40`}
            />
          </View>

          <Text style={[s.charCount, { color: theme.theirMetaColor }]}>{text.length}/300</Text>

          <TouchableOpacity
            style={[
              s.sendBtn,
              { backgroundColor: text.trim() ? theme.sendBtnBg : `${theme.sendBtnBg}40` },
            ]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.8}
          >
            <Send size={18} color="#fff" strokeWidth={2.5} />
            <Text style={s.sendBtnTxt}>Wrap & send</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
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
  previewBox: {
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  previewEmoji: { fontSize: 40 },
  previewHint: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12, lineHeight: 18 },
  inputWrap: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 100,
    marginBottom: 6,
  },
  input: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  charCount: { fontFamily: "Outfit_400Regular", fontSize: 11, textAlign: "right", marginBottom: 16 },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 24,
    paddingVertical: 14,
  },
  sendBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: "#fff" },
});