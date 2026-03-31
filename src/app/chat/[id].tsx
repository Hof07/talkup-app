import React, { forwardRef, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Keyboard,
  Alert,
  Platform,
  Animated,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_700Bold,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { Lock, X, ChevronLeft, ChevronRight } from "lucide-react-native";

import ChatHeader from "./components/ChatHeader";
import { MessageBubble, Message, ReplyTo } from "./components/MessageBubble";
import InputBar from "./components/InputBar";
import ContextMenu from "./components/ContextMenu";
import DotsMenu from "./components/DotsMenu";
import ThemeSheet from "./components/ThemeSheet";
import TypingIndicator from "./components/TypingIndicator";
import ReplyPreview from "./components/ReplyPreview";

import { useChat } from "./hooks/useChat";
import { useTheme } from "./hooks/useTheme";

const { width: SW, height: SH } = Dimensions.get("window");

// ── Gallery viewer ────────────────────────────────────────────────────────────
const GalleryViewer = ({
  visible,
  images,
  startIndex,
  onClose,
}: {
  visible: boolean;
  images: string[];
  startIndex: number;
  onClose: () => void;
}) => {
  const [current, setCurrent] = useState(startIndex);
  useEffect(() => {
    if (visible) setCurrent(startIndex);
  }, [visible, startIndex]);
  if (!visible || !images.length) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={gv.overlay}>
        <TouchableOpacity
          style={gv.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <X size={22} color="#fff" />
        </TouchableOpacity>
        {images.length > 1 && (
          <View style={gv.counter}>
            <Text style={gv.counterText}>
              {current + 1} / {images.length}
            </Text>
          </View>
        )}
        <Image
          source={{ uri: images[current] }}
          style={gv.fullImg}
          resizeMode="contain"
        />
        {images.length > 1 && (
          <>
            {current > 0 && (
              <TouchableOpacity
                style={[gv.navBtn, { left: 12 }]}
                onPress={() => setCurrent((c) => c - 1)}
                activeOpacity={0.8}
              >
                <ChevronLeft size={26} color="#fff" />
              </TouchableOpacity>
            )}
            {current < images.length - 1 && (
              <TouchableOpacity
                style={[gv.navBtn, { right: 12 }]}
                onPress={() => setCurrent((c) => c + 1)}
                activeOpacity={0.8}
              >
                <ChevronRight size={26} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        )}
        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={gv.thumbStrip}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}
          >
            {images.map((uri, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setCurrent(i)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri }}
                  style={[gv.thumb, i === current && gv.thumbActive]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const gv = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.97)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 54,
    right: 18,
    zIndex: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 8,
  },
  counter: { position: "absolute", top: 58, alignSelf: "center", zIndex: 20 },
  counterText: {
    color: "#fff",
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
  },
  fullImg: { width: SW, height: SH * 0.72 },
  navBtn: {
    position: "absolute",
    top: "40%",
    zIndex: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 24,
    padding: 10,
  },
  thumbStrip: { position: "absolute", bottom: 48, width: SW },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbActive: { borderColor: "#fff" },
});

// ── Main screen ───────────────────────────────────────────────────────────────
const ChatScreen = forwardRef<View>((props, ref) => {
  const { id, username, avatar_url } = useLocalSearchParams<{
    id: string;
    username: string;
    avatar_url: string;
  }>();

  const flatListRef = useRef<FlatList>(null);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const dotsMenuAnim = useRef(new Animated.Value(0)).current;
  const themeSheetAnim = useRef(new Animated.Value(0)).current;
  const typingBroadcastTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [newMessage, setNewMessage] = useState("");
  const [inputHeight, setInputHeight] = useState(45);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [dotsMenuVisible, setDotsMenuVisible] = useState(false);
  const [themeSheetVisible, setThemeSheetVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryVisible, setGalleryVisible] = useState(false);

  // ── Reply state ───────────────────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);

  const {
    messages,
    setMessages,
    loading,
    sending,
    friendLastSeen,
    friendIsTyping,
    currentUserId,
    currentUserIdRef,
    init,
    sendMessage,
    sendImage,
    broadcastTyping,
    broadcastStopTyping,
    reactToMessage,
    deleteMessage,
    clearChat,
    cleanup,
  } = useChat(id as string);

  const { theme, selectTheme } = useTheme(currentUserId, id as string);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    init();
    const showL = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          100,
        );
      },
    );
    const hideL = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      showL.remove();
      hideL.remove();
      cleanup();
      if (typingBroadcastTimeout.current)
        clearTimeout(typingBroadcastTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (friendIsTyping)
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
  }, [friendIsTyping]);

  // ── Swipe to reply ────────────────────────────────────────────────────────
  const handleSwipeReply = (msg: Message) => {
    const isImage =
      msg.message_type === "image" || msg.message_type === "image_group";
    setReplyTo({
      id: msg.id,
      content: isImage ? msg.content : msg.content,
      sender_id: msg.sender_id,
      message_type: msg.message_type,
    });
  };

  // ── Typing ────────────────────────────────────────────────────────────────
  const handleTyping = (text: string) => {
    setNewMessage(text);
    if (text.length > 0) {
      broadcastTyping();
      if (typingBroadcastTimeout.current)
        clearTimeout(typingBroadcastTimeout.current);
      typingBroadcastTimeout.current = setTimeout(
        () => broadcastStopTyping(),
        2000,
      );
    } else {
      broadcastStopTyping();
      if (typingBroadcastTimeout.current)
        clearTimeout(typingBroadcastTimeout.current);
    }
  };

  const handleImagePress = (url: string, urls?: string[]) => {
    const allImgs = urls && urls.length > 1 ? urls : [url];
    const idx = allImgs.indexOf(url);
    setGalleryImages(allImgs);
    setGalleryIndex(idx >= 0 ? idx : 0);
    setGalleryVisible(true);
  };

  const openMenu = (msg: Message) => {
    if (msg.deleted_for_everyone) return;
    setSelectedMsg(msg);
    setMenuVisible(true);
    Animated.spring(menuAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
      setSelectedMsg(null);
    });
  };

  const openDotsMenu = () => {
    setDotsMenuVisible(true);
    Animated.spring(dotsMenuAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeDotsMenu = () => {
    Animated.timing(dotsMenuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setDotsMenuVisible(false));
  };

  const openThemeSheet = () => {
    closeDotsMenu();
    setTimeout(() => {
      setThemeSheetVisible(true);
      Animated.spring(themeSheetAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    }, 200);
  };

  const closeThemeSheet = () => {
    Animated.timing(themeSheetAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setThemeSheetVisible(false));
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    const text = newMessage.trim();
    const currentReply = replyTo;
    setNewMessage("");
    setInputHeight(45);
    setReplyTo(null); // clear reply after send
    await sendMessage(text, currentReply);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleImagePick = async () => {
    const currentReply = replyTo;
    setReplyTo(null);
    await sendImage(id as string, currentReply);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
  };

  const handleReact = async (emoji: string) => {
    if (!selectedMsg) return;
    closeMenu();
    await reactToMessage(selectedMsg, emoji);
  };

  // Also allow reply from long-press context menu
  const handleReplyFromMenu = () => {
    if (!selectedMsg) return;
    closeMenu();
    handleSwipeReply(selectedMsg);
  };

  const handleDelete = () => {
    if (!selectedMsg) return;
    const msg = selectedMsg;
    const isMine = msg.sender_id === currentUserIdRef.current;
    closeMenu();
    const options: Array<{
      text: string;
      style?: "cancel" | "destructive" | "default";
      onPress?: () => void;
    }> = [
      { text: "Cancel", style: "cancel" },
      { text: "Delete for me", onPress: () => deleteMessage(msg, false) },
    ];
    if (isMine) {
      options.push({
        text: "Delete for everyone",
        style: "destructive",
        onPress: () => deleteMessage(msg, true),
      });
    }
    Alert.alert("Delete message", "Choose an option", options);
  };

  const handleClearChat = () => {
    closeDotsMenu();
    Alert.alert("Clear Chat", "Delete all messages?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearChat },
    ]);
  };

  const handleCopy = () => {
    closeMenu();
    Alert.alert("Copied", "Message copied!");
  };

  if (!fontsLoaded) return null;

  const isImageTheme = theme.chatBgType === "image" && !!theme.bgImage;
  const headerBgColor = isImageTheme ? `${theme.headerBg}D0` : theme.headerBg;
  const e2eBgColor = isImageTheme ? `${theme.inputBarBg}BB` : theme.inputBarBg;

  const chatContent = (
    <View style={[s.flex, { marginBottom: keyboardHeight }]}>
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.sendBtnBg} size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }: { item: Message; index: number }) => (
            <MessageBubble
              item={item}
              index={index}
              messages={messages}
              currentUserId={currentUserId}
              username={username as string}
              avatar_url={avatar_url as string}
              theme={theme}
              onLongPress={openMenu}
              onImagePress={handleImagePress}
              onSwipeReply={handleSwipeReply}
              setMessages={setMessages}
            />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={() => (
            <TypingIndicator
              visible={friendIsTyping}
              avatar_url={avatar_url as string}
              username={username as string}
              theme={theme}
            />
          )}
          ListEmptyComponent={() => (
            <View style={s.emptyBox}>
              <View
                style={[
                  s.emptyLockCircle,
                  { backgroundColor: `${theme.sendBtnBg}22` },
                ]}
              >
                <Lock size={28} color={theme.sendBtnBg} />
              </View>
              <Text style={[s.emptyTitle, { color: theme.theirBubbleText }]}>
                Say hello! 👋
              </Text>
              <Text style={[s.emptySub, { color: theme.theirMetaColor }]}>
                Your messages are end-to-end encrypted
              </Text>
            </View>
          )}
        />
      )}

      {/* Reply preview bar above input */}
      {replyTo && (
        <ReplyPreview
          replyTo={replyTo}
          currentUserId={currentUserId}
          username={username as string}
          onCancel={() => setReplyTo(null)}
          theme={theme}
        />
      )}

      <InputBar
        value={newMessage}
        onChangeText={handleTyping}
        onSend={handleSend}
        onImagePick={handleImagePick}
        sending={sending}
        inputHeight={inputHeight}
        onContentSizeChange={(e: any) =>
          setInputHeight(e.nativeEvent.contentSize.height)
        }
        theme={theme}
        isImageTheme={isImageTheme}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[s.safe, { backgroundColor: theme.inputBarBg }]}
      edges={["bottom"]}
    >
      <StatusBar
        barStyle={
          theme.headerText === "#ffffff" ? "light-content" : "dark-content"
        }
        translucent
        backgroundColor="transparent"
      />

      {isImageTheme ? (
        <ImageBackground
          source={theme.bgImage}
          style={s.fullScreen}
          resizeMode="cover"
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.chatBg, opacity: 0.12 },
            ]}
          />
          <ChatHeader
            username={username as string}
            avatar_url={avatar_url as string}
            friendLastSeen={friendLastSeen}
            theme={theme}
            headerBgColor={headerBgColor}
            onDotsPress={openDotsMenu}
          />
          <View style={[s.e2eBanner, { backgroundColor: e2eBgColor }]}>
            <Lock size={11} color={theme.dateLabelText} />
            <Text style={[s.e2eBannerText, { color: theme.theirMetaColor }]}>
              Messages are end-to-end encrypted.
            </Text>
          </View>
          {chatContent}
        </ImageBackground>
      ) : (
        <View style={[s.fullScreen, { backgroundColor: theme.chatBg }]}>
          <ChatHeader
            username={username as string}
            avatar_url={avatar_url as string}
            friendLastSeen={friendLastSeen}
            theme={theme}
            headerBgColor={theme.headerBg}
            onDotsPress={openDotsMenu}
          />
          <View style={[s.e2eBanner, { backgroundColor: theme.inputBarBg }]}>
            <Lock size={11} color={theme.dateLabelText} />
            <Text style={[s.e2eBannerText, { color: theme.theirMetaColor }]}>
              Messages are end-to-end encrypted.
            </Text>
          </View>
          {chatContent}
        </View>
      )}

      <DotsMenu
        visible={dotsMenuVisible}
        dotsMenuAnim={dotsMenuAnim}
        theme={theme}
        onClose={closeDotsMenu}
        onThemePress={openThemeSheet}
        onClearChat={handleClearChat}
      />
      <ThemeSheet
        visible={themeSheetVisible}
        themeSheetAnim={themeSheetAnim}
        theme={theme}
        username={username as string}
        onClose={closeThemeSheet}
        onSelectTheme={selectTheme}
      />
      <ContextMenu
        visible={menuVisible}
        selectedMsg={selectedMsg}
        menuAnim={menuAnim}
        currentUserId={currentUserId}
        onClose={closeMenu}
        onReact={handleReact}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onReply={handleReplyFromMenu}
      />
      <GalleryViewer
        visible={galleryVisible}
        images={galleryImages}
        startIndex={galleryIndex}
        onClose={() => setGalleryVisible(false)}
      />
    </SafeAreaView>
  );
});

export default ChatScreen;

const s = StyleSheet.create({
  safe: { flex: 1 },
  fullScreen: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    flexGrow: 1,
  },
  e2eBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  e2eBannerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    textAlign: "center",
    flex: 1,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyLockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: "Outfit_700Bold", fontSize: 18 },
  emptySub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
