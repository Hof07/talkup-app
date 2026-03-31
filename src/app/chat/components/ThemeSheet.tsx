import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
  ImageBackground,
} from "react-native";
import { X, Check } from "lucide-react-native";
import { THEMES, ChatTheme } from "../../../lib/themes";

const { width } = Dimensions.get("window");
const THEME_CARD_W = (width - 48 - 12) / 2;

interface Props {
  visible: boolean;
  themeSheetAnim: Animated.Value;
  theme: ChatTheme;
  username: string;
  onClose: () => void;
  onSelectTheme: (t: ChatTheme) => void;
}

export default function ThemeSheet({
  visible,
  themeSheetAnim,
  theme,
  username,
  onClose,
  onSelectTheme,
}: Props) {
  const isImageTheme = theme.chatBgType === "image" && !!theme.bgImage;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.sheetOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                s.themeSheet,
                {
                  transform: [
                    {
                      translateY: themeSheetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [500, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Header */}
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Chat Theme</Text>
                <TouchableOpacity onPress={onClose} style={s.sheetClose}>
                  <X size={20} color="#555" />
                </TouchableOpacity>
              </View>

              {/* Live Preview */}
              <View style={s.previewContainer}>
                {isImageTheme ? (
                  <ImageBackground
                    source={theme.bgImage}
                    style={s.previewBg}
                    resizeMode="cover"
                  >
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: theme.chatBg, opacity: 0.12 },
                      ]}
                    />
                    {/* Header strip */}
                    <View
                      style={[
                        s.previewHeaderBar,
                        { backgroundColor: `${theme.headerBg}D0` },
                      ]}
                    >
                      <View
                        style={[
                          s.previewHeaderDot,
                          { backgroundColor: "rgba(255,255,255,0.5)" },
                        ]}
                      />
                      <Text
                        style={[s.previewHeaderText, { color: theme.headerText }]}
                        numberOfLines={1}
                      >
                        {username}
                      </Text>
                    </View>
                    {/* Bubbles */}
                    <View style={s.previewMessages}>
                      <View style={s.previewRow}>
                        <View
                          style={[
                            s.previewBubble,
                            { backgroundColor: theme.theirBubbleBg },
                          ]}
                        >
                          <Text
                            style={[
                              s.previewBubbleText,
                              { color: theme.theirBubbleText },
                            ]}
                          >
                            Hey! 👋
                          </Text>
                        </View>
                      </View>
                      <View style={[s.previewRow, { justifyContent: "flex-end" }]}>
                        <View
                          style={[
                            s.previewBubble,
                            { backgroundColor: theme.myBubbleBg },
                          ]}
                        >
                          <Text
                            style={[
                              s.previewBubbleText,
                              { color: theme.myBubbleText },
                            ]}
                          >
                            Hello! 😊
                          </Text>
                        </View>
                      </View>
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={[s.previewBg, { backgroundColor: theme.chatBg }]}>
                    {/* Header strip */}
                    <View
                      style={[
                        s.previewHeaderBar,
                        { backgroundColor: theme.headerBg },
                      ]}
                    >
                      <View
                        style={[
                          s.previewHeaderDot,
                          {
                            backgroundColor:
                              theme.headerText === "#ffffff"
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(0,0,0,0.2)",
                          },
                        ]}
                      />
                      <Text
                        style={[s.previewHeaderText, { color: theme.headerText }]}
                        numberOfLines={1}
                      >
                        {username}
                      </Text>
                    </View>
                    {/* Bubbles */}
                    <View style={s.previewMessages}>
                      <View style={s.previewRow}>
                        <View
                          style={[
                            s.previewBubble,
                            { backgroundColor: theme.theirBubbleBg },
                          ]}
                        >
                          <Text
                            style={[
                              s.previewBubbleText,
                              { color: theme.theirBubbleText },
                            ]}
                          >
                            Hey! 👋
                          </Text>
                        </View>
                      </View>
                      <View style={[s.previewRow, { justifyContent: "flex-end" }]}>
                        <View
                          style={[
                            s.previewBubble,
                            { backgroundColor: theme.myBubbleBg },
                          ]}
                        >
                          <Text
                            style={[
                              s.previewBubbleText,
                              { color: theme.myBubbleText },
                            ]}
                          >
                            Hello! 😊
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Theme Grid */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.themeGrid}
              >
                {THEMES.map((t) => {
                  const isSelected = theme.id === t.id;
                  const tIsImage = t.chatBgType === "image" && !!t.bgImage;

                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        s.themeCard,
                        isSelected && {
                          borderColor: "#eab308",
                          borderWidth: 2.5,
                        },
                      ]}
                      onPress={() => onSelectTheme(t)}
                      activeOpacity={0.85}
                    >
                      {/* Card preview */}
                      {tIsImage ? (
                        <ImageBackground
                          source={t.bgImage}
                          style={s.themeCardBg}
                          resizeMode="cover"
                        >
                          <View
                            style={[
                              s.themeCardHeader,
                              { backgroundColor: `${t.headerBg}CC` },
                            ]}
                          />
                          <View style={s.themeCardBubbles}>
                            <View
                              style={[
                                s.miniMsgLeft,
                                { backgroundColor: t.theirBubbleBg },
                              ]}
                            />
                            <View
                              style={[
                                s.miniMsgRight,
                                { backgroundColor: t.myBubbleBg },
                              ]}
                            />
                            <View
                              style={[
                                s.miniMsgLeft,
                                {
                                  backgroundColor: t.theirBubbleBg,
                                  width: "45%",
                                },
                              ]}
                            />
                          </View>
                        </ImageBackground>
                      ) : (
                        <View
                          style={[s.themeCardBg, { backgroundColor: t.chatBg }]}
                        >
                          <View
                            style={[
                              s.themeCardHeader,
                              { backgroundColor: t.headerBg },
                            ]}
                          />
                          <View style={s.themeCardBubbles}>
                            <View
                              style={[
                                s.miniMsgLeft,
                                { backgroundColor: t.theirBubbleBg },
                              ]}
                            />
                            <View
                              style={[
                                s.miniMsgRight,
                                { backgroundColor: t.myBubbleBg },
                              ]}
                            />
                            <View
                              style={[
                                s.miniMsgLeft,
                                {
                                  backgroundColor: t.theirBubbleBg,
                                  width: "45%",
                                },
                              ]}
                            />
                          </View>
                        </View>
                      )}

                      {/* Card name row */}
                      <View style={s.themeCardBottom}>
                        <Text style={s.themeCardEmoji}>{t.emoji}</Text>
                        <Text
                          style={[
                            s.themeCardName,
                            isSelected && { color: "#eab308" },
                          ]}
                        >
                          {t.name}
                        </Text>
                        {isSelected && (
                          <View style={s.themeCheckBadge}>
                            <Check size={10} color="#fff" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  themeSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    overflow: "hidden",
  },

  // Header
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sheetTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: "#111",
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },

  // Live preview
  previewContainer: {
    height: 130,
    overflow: "hidden",
  },
  previewBg: {
    flex: 1,
  },
  previewHeaderBar: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  previewHeaderDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  previewHeaderText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    flex: 1,
  },
  previewMessages: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 6,
  },
  previewRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  previewBubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    maxWidth: "60%",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  previewBubbleText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
  },

  // Theme grid
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 16,
    paddingBottom: 40,
  },
  themeCard: {
    width: THEME_CARD_W,
    borderRadius: 14,
    backgroundColor: "#fff",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  themeCardBg: {
    height: 90,
    overflow: "hidden",
  },
  themeCardHeader: {
    height: 20,
    width: "100%",
  },
  themeCardBubbles: {
    padding: 5,
    gap: 4,
  },
  miniMsgLeft: {
    height: 9,
    width: "60%",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  miniMsgRight: {
    height: 9,
    width: "55%",
    borderRadius: 8,
    alignSelf: "flex-end",
  },
  themeCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 6,
    backgroundColor: "#fff",
  },
  themeCardEmoji: {
    fontSize: 16,
  },
  themeCardName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: "#333",
    flex: 1,
  },
  themeCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#eab308",
    alignItems: "center",
    justifyContent: "center",
  },
});
