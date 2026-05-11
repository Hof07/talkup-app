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
import { GiftMessageComposer } from "./components/GiftMessageComposer";
import { Lock, X, ChevronLeft, ChevronRight } from "lucide-react-native";

import { MessageBubble, Message, ReplyTo } from "./components/MessageBubble";
import InputBar from "./components/InputBar";
import ContextMenu from "./components/ContextMenu";
import DotsMenu from "./components/DotsMenu";
import ThemeSheet from "./components/ThemeSheet";
import TypingIndicator from "./components/TypingIndicator";
import ReplyPreview from "./components/ReplyPreview";
import SearchInChat from "./components/SearchInChat";
import ForwardModal from "./components/ForwardModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useChat } from "./hooks/useChat";
import { useTheme } from "./hooks/useTheme";
import ChatHeader from "./components/ChatHeader";
import { SpecialMessagePicker } from "./components/SpecialMessagePicker";

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
    null
  );

  // ── Scroll tracking ───────────────────────────────────────────────────────
  const userScrolledUp = useRef(false);

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
  const [searchVisible, setSearchVisible] = useState(false);

  // ── DotsMenu state ────────────────────────────────────────────────────────
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [disappearAfterHours, setDisappearAfterHours] = useState<number | null>(
    null
  );
  const [muteUntil, setMuteUntil] = useState<Date | null>(null);

  // ── Reply state ───────────────────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);

  // ── Forward state ─────────────────────────────────────────────────────────
  const [forwardVisible, setForwardVisible] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);

  // ── Starred messages ──────────────────────────────────────────────────────
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // ── Special message picker ────────────────────────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);

  const {
    messages,
    setMessages,
    loading,
    sending,
    friendLastSeen,
    friendIsTyping,
    currentUserId,
    currentUserIdRef,
    hasMore,
    loadingMore,
    init,
    sendMessage,
    sendImage,
    broadcastTyping,
    broadcastStopTyping,
    loadMoreMessages,
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

  const handleGiftSend = async (message: string) => {
    setComposerVisible(false);
    userScrolledUp.current = false;
    await sendMessage(message, replyTo, "gift");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  useEffect(() => {
    init();
    const showL = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        if (!userScrolledUp.current) {
          setTimeout(
            () => flatListRef.current?.scrollToEnd({ animated: true }),
            100
          );
        }
      }
    );
    const hideL = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
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
    AsyncStorage.getItem(`starred_${id}`).then((raw) => {
      if (raw) setStarredIds(new Set(JSON.parse(raw)));
    });
  }, []);

  useEffect(() => {
    if (friendIsTyping && !userScrolledUp.current) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100
      );
    }
  }, [friendIsTyping]);

  // ── Swipe to reply ────────────────────────────────────────────────────────
  const handleSwipeReply = (msg: Message) => {
    setReplyTo({
      id: msg.id,
      content: msg.content,
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
        2000
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

  // ── DotsMenu handlers ─────────────────────────────────────────────────────
  const handleLockChat = () => {
    setIsChatLocked((prev) => !prev);
  };

  const handleDisappearingMessages = () => {
    setDisappearAfterHours((prev) => {
      if (prev === null) return 1;
      if (prev === 1) return 6;
      if (prev === 6) return 24;
      return null;
    });
  };

  const handleMuteNotifications = () => {
    const now = new Date();
    const isMuted = muteUntil !== null && muteUntil > now;
    if (isMuted) {
      setMuteUntil(null);
    } else {
      const until = new Date(now.getTime() + 60 * 60 * 1000);
      setMuteUntil(until);
    }
  };

  const handleSearchChat = () => {
    closeDotsMenu();
    setTimeout(() => setSearchVisible(true), 200);
  };

  const handleJumpToMessage = (messageId: string) => {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    const text = newMessage.trim();
    const currentReply = replyTo;
    setNewMessage("");
    setInputHeight(45);
    setReplyTo(null);
    userScrolledUp.current = false;
    await sendMessage(text, currentReply);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleImagePick = async () => {
    const currentReply = replyTo;
    setReplyTo(null);
    userScrolledUp.current = false;
    await sendImage(id as string, currentReply);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
  };

  const handleReact = async (emoji: string) => {
    if (!selectedMsg) return;
    closeMenu();
    await reactToMessage(selectedMsg, emoji);
  };

  const handleReplyFromMenu = () => {
    if (!selectedMsg) return;
    closeMenu();
    handleSwipeReply(selectedMsg);
  };

  const handleForward = () => {
    if (!selectedMsg) return;
    closeMenu();
    setForwardMsg(selectedMsg);
    setTimeout(() => setForwardVisible(true), 200);
  };

  const handleStar = async () => {
    if (!selectedMsg) return;
    const msgId = selectedMsg.id;
    closeMenu();
    setStarredIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(msgId)) updated.delete(msgId);
      else updated.add(msgId);
      AsyncStorage.setItem(`starred_${id}`, JSON.stringify([...updated]));
      return updated;
    });
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

  // ── FIX: only trigger loadMoreMessages once when near top ─────────────────
  // Previously this called loadMoreMessages() on every scroll event near top,
  // causing hammering. Now guarded by loadingMore + hasMore flags.
  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;

    if (contentOffset.y < 80 && !loadingMore && hasMore) {
      loadMoreMessages();
    }

    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    userScrolledUp.current = distanceFromBottom > 80;
  };

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
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (!userScrolledUp.current) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
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
          ListHeaderComponent={() =>
            loadingMore ? (
              <ActivityIndicator
                color={theme.sendBtnBg}
                size="small"
                style={{ marginVertical: 12 }}
              />
            ) : null
          }
        />
      )}

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
        onGiftPress={() => setPickerVisible(true)}
        sending={sending}
        inputHeight={inputHeight}
        onContentSizeChange={(e: any) =>
          setInputHeight(e.nativeEvent.contentSize.height)
        }
        theme={theme}
        isImageTheme={isImageTheme}
        userId={currentUserId}
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
          {searchVisible ? (
            <SearchInChat
              visible={searchVisible}
              messages={messages}
              theme={theme}
              onClose={() => setSearchVisible(false)}
              onJumpToMessage={handleJumpToMessage}
            />
          ) : (
            <ChatHeader
              username={username as string}
              avatar_url={avatar_url as string}
              friendLastSeen={friendLastSeen}
              theme={theme}
              headerBgColor={headerBgColor}
              onDotsPress={openDotsMenu}
            />
          )}
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
          {searchVisible ? (
            <SearchInChat
              visible={searchVisible}
              messages={messages}
              theme={theme}
              onClose={() => setSearchVisible(false)}
              onJumpToMessage={handleJumpToMessage}
            />
          ) : (
            <ChatHeader
              username={username as string}
              avatar_url={avatar_url as string}
              friendLastSeen={friendLastSeen}
              theme={theme}
              headerBgColor={theme.headerBg}
              onDotsPress={openDotsMenu}
            />
          )}
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
        onLockChat={handleLockChat}
        isChatLocked={isChatLocked}
        onDisappearingMessages={handleDisappearingMessages}
        disappearAfterHours={disappearAfterHours}
        onMuteNotifications={handleMuteNotifications}
        muteUntil={muteUntil}
        onSearchChat={handleSearchChat}
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
        onForward={handleForward}
        onStar={handleStar}
        isStarred={selectedMsg ? starredIds.has(selectedMsg.id) : false}
      />
      <ForwardModal
        visible={forwardVisible}
        messageContent={forwardMsg?.content || ""}
        messageType={forwardMsg?.message_type || "text"}
        onClose={() => {
          setForwardVisible(false);
          setForwardMsg(null);
        }}
        onForwarded={() => {
          setForwardVisible(false);
          setForwardMsg(null);
          Alert.alert("Forwarded", "Message sent!");
        }}
      />
      <SpecialMessagePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(type) => {
          setPickerVisible(false);
          if (type.id === "gift")
            setTimeout(() => setComposerVisible(true), 300);
        }}
        theme={theme}
      />
      <GiftMessageComposer
        visible={composerVisible}
        onBack={() => {
          setComposerVisible(false);
          setTimeout(() => setPickerVisible(true), 300);
        }}
        onSend={handleGiftSend}
        theme={theme}
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