import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
} from "react-native";
import { Send, ImagePlus, Sticker } from "lucide-react-native";
import { ChatTheme, THEMES } from "../../../lib/themes";
import { Stickers } from "../stickers";
import { StickerPicker } from "../StickerPicker";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onImagePick: () => void;
  onStickerSend?: (sticker: Stickers) => void;
  sending: boolean;
  inputHeight: number;
  onContentSizeChange: (
    e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>
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
  sending,
  inputHeight,
  onContentSizeChange,
  theme,
  isImageTheme,
  userId,
}: Props) {
  const [stickerVisible, setStickerVisible] = useState(false);

  const resolvedInputHeight = Math.max(
    MIN_INPUT_HEIGHT,
    Math.min(MAX_INPUT_HEIGHT, inputHeight)
  );

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
          <TouchableOpacity
            onPress={onImagePick}
            style={[s.iconBtn, { backgroundColor: `${theme.sendBtnBg}18` }]}
            activeOpacity={0.7}
          >
            <ImagePlus size={20} color={theme.sendBtnBg} />
          </TouchableOpacity>

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
            />
          </View>

          <TouchableOpacity
            onPress={() => setStickerVisible(true)}
            style={[s.iconBtn, { backgroundColor: `${theme.sendBtnBg}18` }]}
            activeOpacity={0.7}
          >
            <Sticker size={20} color={theme.sendBtnBg} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSend}
            disabled={!value.trim() || sending}
            activeOpacity={0.7}
            style={[
              s.sendBtn,
              {
                backgroundColor: value.trim() ? theme.sendBtnBg : "#e5e5e5",
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={theme.sendBtnIcon} />
            ) : (
              <Send
                size={19}
                color={value.trim() ? theme.sendBtnIcon : "#aaa"}
                strokeWidth={2.5}
              />
            )}
          </TouchableOpacity>
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
    alignItems: "flex-end",
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
  textInput: {
    fontSize: 15,
    lineHeight: LINE_HEIGHT,
    fontFamily: "Outfit_400Regular",
    minHeight: MIN_INPUT_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
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
