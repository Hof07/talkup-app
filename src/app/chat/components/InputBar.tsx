import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  Animated,
} from "react-native";
import {
  Send,
  ImagePlus,
  Sticker,
  Sparkles,
  Mic,
  Smile,
  PartyPopper,
} from "lucide-react-native";
import { ChatTheme } from "../../../lib/themes";
import { Stickers } from "../stickers";
import { StickerPicker } from "../StickerPicker";
import { fixGrammar } from "@/app/lib/grammarFix";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onImagePick: () => void;
  onStickerSend?: (sticker: Stickers) => void;
  onGiftPress: () => void;
  sending: boolean;
  inputHeight: number;
  onContentSizeChange: (
    e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) => void;
  theme: ChatTheme;
  isImageTheme: boolean;
  userId: string;
}

const LINE_HEIGHT = 22;
const MIN_INPUT_HEIGHT = 44;
const MAX_INPUT_HEIGHT = LINE_HEIGHT * 4 + 18;

export default function InputBar({
  value,
  onChangeText,
  onSend,
  onImagePick,
  onStickerSend,
  onGiftPress,
  sending,
  inputHeight,
  onContentSizeChange,
  theme,
  isImageTheme,
  userId,
  
}: Props) {
  const [stickerVisible, setStickerVisible] = useState(false);
  const [fixing, setFixing] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const resolvedInputHeight = Math.max(
    MIN_INPUT_HEIGHT,
    Math.min(MAX_INPUT_HEIGHT, inputHeight),
  );

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: value.trim() ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [value]);

  const handleFix = async () => {
    if (!value.trim() || fixing) return;
    setFixing(true);
    try {
      const fixed = await fixGrammar(value);
      onChangeText(fixed);
    } catch (e) {
      console.error(e);
    } finally {
      setFixing(false);
    }
  };

  return (
    <>
      <StickerPicker
        visible={stickerVisible}
        onClose={() => setStickerVisible(false)}
        onSelect={(sticker) => {
          onStickerSend?.(sticker);
          setStickerVisible(false);
        }}
        userId={userId}
      />

      <View
        style={[
          s.inputArea,
          {
            backgroundColor: isImageTheme ? "transparent" : theme.inputBarBg,
          },
        ]}
      >
        <View
          style={[
            s.podContainer,
            {
              backgroundColor: theme.inputBoxBg,
              minHeight: 58,
            },
          ]}
        >
          {/* Left - Image Pick Button */}
          <TouchableOpacity
            onPress={onImagePick}
            style={[s.iconBtn, { backgroundColor: `${theme.sendBtnBg}18` }]}
            activeOpacity={0.7}
          >
            <ImagePlus size={20} color={theme.sendBtnBg} />
          </TouchableOpacity>

          {/* Middle - Text Input */}
          <View style={s.podInputBox}>
            <TextInput
              style={[
                s.textInput,
                {
                  height: resolvedInputHeight,
                  color: theme.inputTextColor,
                },
              ]}
              placeholder="Message"
              placeholderTextColor={theme.theirMetaColor}
              multiline
              scrollEnabled={inputHeight > MAX_INPUT_HEIGHT}
              textAlignVertical="top"
              value={value}
              onChangeText={onChangeText}
              onContentSizeChange={onContentSizeChange}
              cursorColor={theme.sendBtnBg}
              selectionHandleColor={theme.sendBtnBg}
              selectionColor={`${theme.sendBtnBg}40`}
            />
          </View>

          {/* Right Side - Icons */}
          <View style={s.rightIcons}>
            <Animated.View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                opacity: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
                transform: [
                  {
                    scale: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.5],
                    }),
                  },
                ],
                position: "absolute",
                right: 0,
                pointerEvents: value.trim() ? "none" : "auto",
              }}
            >
              <TouchableOpacity
                onPress={() => setStickerVisible(true)}
                style={[s.iconBtn, { backgroundColor: `${theme.sendBtnBg}18` }]}
                activeOpacity={0.7}
              >
                <Sticker size={20} color={theme.sendBtnBg} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onGiftPress}
                style={[s.iconBtn, { backgroundColor: `${theme.sendBtnBg}18` }]}
                activeOpacity={0.7}
              >
                <PartyPopper size={20} color={theme.sendBtnBg} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {}}
                style={[s.iconBtn, { backgroundColor: `${theme.sendBtnBg}18` }]}
                activeOpacity={0.7}
              >
                <Smile size={20} color={theme.sendBtnBg} />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                opacity: animValue,
                transform: [
                  {
                    scale: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
                position: "absolute",
                right: 0,
                pointerEvents: value.trim() ? "auto" : "none",
              }}
            >
              <TouchableOpacity
                onPress={handleFix}
                disabled={fixing}
                activeOpacity={0.7}
                style={[s.iconBtn, { backgroundColor: `${theme.sendBtnBg}18` }]}
              >
                {fixing ? (
                  <ActivityIndicator size="small" color={theme.sendBtnBg} />
                ) : (
                  <Sparkles size={20} color={theme.sendBtnBg} />
                )}
              </TouchableOpacity>

              {/* Send */}
              <TouchableOpacity
                onPress={onSend}
                disabled={sending}
                activeOpacity={0.7}
                style={[s.sendBtn, { backgroundColor: theme.sendBtnBg }]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={theme.sendBtnIcon} />
                ) : (
                  <Send size={19} color={theme.sendBtnIcon} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 16 : 12,
  },
  podContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 7,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  podInputBox: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: 3 * 40 + 2 * 6,
    marginBottom: 2,
  },
  textInput: {
    fontSize: 15,
    lineHeight: LINE_HEIGHT,
    fontFamily: "Outfit_400Regular",
    minHeight: MIN_INPUT_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
    fontWeight: "600",
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginBottom: 1,
  },
});
