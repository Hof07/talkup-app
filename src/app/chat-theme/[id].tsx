import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ImageBackground,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_700Bold,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { ArrowLeft, Check } from "lucide-react-native";
import { THEMES, ChatTheme } from "../../lib/themes";
import { saveChatTheme, loadChatTheme } from "../../lib/themeStorage";
import Colors from "../constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const ITEM_SIZE = (width - 48 - 12) / 2;

export default function ThemePicker() {
  const { id, username } = useLocalSearchParams<{
    id: string;
    username: string;
  }>();

  const [selectedTheme, setSelectedTheme] = useState<ChatTheme>(THEMES[0]);
  const [myId, setMyId] = useState("");

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      const sessionStr = await AsyncStorage.getItem("userSession");
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr);
      const uid = session.user?.id;
      setMyId(uid);

      // Load current theme for this chat
      const current = await loadChatTheme(uid, id as string);
      setSelectedTheme(current);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelect = async (theme: ChatTheme) => {
    setSelectedTheme(theme);
    await saveChatTheme(myId, id as string, theme.id);
  };

  if (!fontsLoaded) return null;

  const isImageTheme = selectedTheme.chatBgType === "image" && !!selectedTheme.bgImage;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={22} color="#111" />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Chat Theme</Text>
          <Text style={s.headerSub}>{username}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Live Preview */}
      {isImageTheme ? (
        <ImageBackground
          source={selectedTheme.bgImage}
          style={s.preview}
          resizeMode="cover"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: selectedTheme.chatBg, opacity: 0.12 }]} />

          {/* Header strip preview */}
          <View style={[s.previewHeaderStrip, { backgroundColor: `${selectedTheme.headerBg}D0` }]}>
            <View style={s.previewHeaderDot} />
            <Text style={[s.previewHeaderName, { color: selectedTheme.headerText }]} numberOfLines={1}>
              {username}
            </Text>
          </View>

          <View style={s.previewMessages}>
            <View style={s.previewRow}>
              <View style={[s.previewBubble, { backgroundColor: selectedTheme.theirBubbleBg }]}>
                <Text style={[s.previewText, { color: selectedTheme.theirBubbleText }]}>Hey! 👋</Text>
              </View>
            </View>
            <View style={[s.previewRow, { justifyContent: "flex-end" }]}>
              <View style={[s.previewBubble, { backgroundColor: selectedTheme.myBubbleBg }]}>
                <Text style={[s.previewText, { color: selectedTheme.myBubbleText }]}>Hello! 😊</Text>
              </View>
            </View>
            <View style={s.previewRow}>
              <View style={[s.previewBubble, { backgroundColor: selectedTheme.theirBubbleBg }]}>
                <Text style={[s.previewText, { color: selectedTheme.theirBubbleText }]}>What's up? 🔥</Text>
              </View>
            </View>
          </View>

          {/* Input bar */}
          <View style={[s.previewInput, { backgroundColor: "transparent" }]}>
            <View style={[s.previewInputBox, { backgroundColor: selectedTheme.inputBoxBg }]}>
              <Text style={[s.previewInputText, { color: selectedTheme.inputTextColor }]}>
                Say something...
              </Text>
            </View>
            <View style={[s.previewSendBtn, { backgroundColor: selectedTheme.sendBtnBg }]}>
              <Text style={{ color: selectedTheme.sendBtnIcon, fontSize: 14 }}>➤</Text>
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View style={[s.preview, { backgroundColor: selectedTheme.chatBg }]}>
          {/* Header strip preview */}
          <View style={[s.previewHeaderStrip, { backgroundColor: selectedTheme.headerBg }]}>
            <View style={s.previewHeaderDot} />
            <Text style={[s.previewHeaderName, { color: selectedTheme.headerText }]} numberOfLines={1}>
              {username}
            </Text>
          </View>

          <View style={s.previewMessages}>
            <View style={s.previewRow}>
              <View style={[s.previewBubble, { backgroundColor: selectedTheme.theirBubbleBg }]}>
                <Text style={[s.previewText, { color: selectedTheme.theirBubbleText }]}>Hey! 👋</Text>
              </View>
            </View>
            <View style={[s.previewRow, { justifyContent: "flex-end" }]}>
              <View style={[s.previewBubble, { backgroundColor: selectedTheme.myBubbleBg }]}>
                <Text style={[s.previewText, { color: selectedTheme.myBubbleText }]}>Hello! 😊</Text>
              </View>
            </View>
            <View style={s.previewRow}>
              <View style={[s.previewBubble, { backgroundColor: selectedTheme.theirBubbleBg }]}>
                <Text style={[s.previewText, { color: selectedTheme.theirBubbleText }]}>What's up? 🔥</Text>
              </View>
            </View>
          </View>

          {/* Input bar */}
          <View style={[s.previewInput, { backgroundColor: selectedTheme.inputBarBg }]}>
            <View style={[s.previewInputBox, { backgroundColor: selectedTheme.inputBoxBg }]}>
              <Text style={[s.previewInputText, { color: selectedTheme.inputTextColor }]}>
                Say something...
              </Text>
            </View>
            <View style={[s.previewSendBtn, { backgroundColor: selectedTheme.sendBtnBg }]}>
              <Text style={{ color: selectedTheme.sendBtnIcon, fontSize: 14 }}>➤</Text>
            </View>
          </View>
        </View>
      )}

      {/* Theme grid */}
      <ScrollView
        contentContainerStyle={s.grid}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.gridTitle}>Choose a theme</Text>

        <View style={s.gridRow}>
          {THEMES.map((theme) => {
            const isSelected = selectedTheme.id === theme.id;
            const tIsImage = theme.chatBgType === "image" && !!theme.bgImage;

            return (
              <TouchableOpacity
                key={theme.id}
                style={[s.themeCard, isSelected && s.themeCardActive]}
                onPress={() => handleSelect(theme)}
                activeOpacity={0.85}
              >
                {/* Theme mini preview */}
                {tIsImage ? (
                  <ImageBackground
                    source={theme.bgImage}
                    style={s.themePreview}
                    resizeMode="cover"
                  >
                    {/* Header strip */}
                    <View style={[s.themeCardHeaderStrip, { backgroundColor: `${theme.headerBg}CC` }]} />
                    <View style={{ padding: 5, gap: 4, flex: 1, justifyContent: "center" }}>
                      <View style={[s.themeBubble, s.themeBubbleLeft, { backgroundColor: theme.theirBubbleBg }]} />
                      <View style={[s.themeBubble, s.themeBubbleRight, { backgroundColor: theme.myBubbleBg }]} />
                      <View style={[s.themeBubble, s.themeBubbleLeft, { backgroundColor: theme.theirBubbleBg, width: "45%" }]} />
                    </View>
                    <View style={[s.themeInputBar, { backgroundColor: "transparent" }]}>
                      <View style={[s.themeInputBox, { backgroundColor: theme.inputBoxBg }]} />
                      <View style={[s.themeSendDot, { backgroundColor: theme.sendBtnBg }]} />
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={[s.themePreview, { backgroundColor: theme.chatBg }]}>
                    {/* Header strip */}
                    <View style={[s.themeCardHeaderStrip, { backgroundColor: theme.headerBg }]} />
                    <View style={{ padding: 5, gap: 4, flex: 1, justifyContent: "center" }}>
                      <View style={[s.themeBubble, s.themeBubbleLeft, { backgroundColor: theme.theirBubbleBg }]} />
                      <View style={[s.themeBubble, s.themeBubbleRight, { backgroundColor: theme.myBubbleBg }]} />
                      <View style={[s.themeBubble, s.themeBubbleLeft, { backgroundColor: theme.theirBubbleBg, width: "45%" }]} />
                    </View>
                    <View style={[s.themeInputBar, { backgroundColor: theme.inputBarBg }]}>
                      <View style={[s.themeInputBox, { backgroundColor: theme.inputBoxBg }]} />
                      <View style={[s.themeSendDot, { backgroundColor: theme.sendBtnBg }]} />
                    </View>
                  </View>
                )}

                {/* Theme name */}
                <View style={s.themeInfo}>
                  <Text style={s.themeEmoji}>{theme.emoji}</Text>
                  <Text style={[s.themeName, isSelected && { color: Colors.primary }]}>
                    {theme.name}
                  </Text>
                  {isSelected && (
                    <View style={s.checkBadge}>
                      <Check size={10} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.neutral100,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Outfit_700Bold", fontSize: 17,
    color: "#111", textAlign: "center",
  },
  headerSub: {
    fontFamily: "Outfit_400Regular", fontSize: 12,
    color: Colors.neutral400, textAlign: "center",
  },

  // Preview
  preview: {
    height: 220,
    overflow: "hidden",
  },
  previewHeaderStrip: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  previewHeaderDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  previewHeaderName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
  },
  previewMessages: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 6,
    justifyContent: "center",
  },
  previewRow: { flexDirection: "row", marginBottom: 4 },
  previewBubble: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 16, maxWidth: "70%",
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 2,
  },
  previewText: { fontFamily: "Outfit_400Regular", fontSize: 13 },
  previewInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  previewInputBox: {
    flex: 1, paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 20,
  },
  previewInputText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12, opacity: 0.5,
  },
  previewSendBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },

  // Grid
  grid: { padding: 16, paddingBottom: 40 },
  gridTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15, color: "#111", marginBottom: 14,
  },
  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

  themeCard: {
    width: ITEM_SIZE, borderRadius: 16,
    overflow: "hidden", borderWidth: 2,
    borderColor: "transparent", elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
    backgroundColor: "#fff",
  },
  themeCardActive: {
    borderColor: Colors.primary,
    elevation: 6, shadowOpacity: 0.2,
  },
  themePreview: { height: 110, overflow: "hidden" },
  themeCardHeaderStrip: { height: 18, width: "100%" },
  themeBubble: { height: 10, borderRadius: 8, width: "60%" },
  themeBubbleLeft: { alignSelf: "flex-start" },
  themeBubbleRight: { alignSelf: "flex-end" },
  themeInputBar: {
    flexDirection: "row", alignItems: "center",
    padding: 5, gap: 4,
  },
  themeInputBox: { flex: 1, height: 12, borderRadius: 8 },
  themeSendDot: { width: 18, height: 18, borderRadius: 9 },

  themeInfo: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 8,
    gap: 6, backgroundColor: "#fff",
  },
  themeEmoji: { fontSize: 16 },
  themeName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13, color: "#333", flex: 1,
  },
  checkBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
});