import * as FileSystem from "expo-file-system";
import { Check, CheckCheck, ImageIcon, Reply } from "lucide-react-native";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { ChatTheme } from "../../../lib/themes";
import { StickerBubble } from "../StickerBubble";
import { Message, Reaction, ReplyTo } from "../utils/types";
import { GiftBubble } from "./GiftBubble";

const documentDirectory: string = (FileSystem as any).documentDirectory ?? "";
const getInfoAsync = (FileSystem as any)
  .getInfoAsync as typeof FileSystem.getInfoAsync;
const readAsStringAsync = (FileSystem as any)
  .readAsStringAsync as typeof FileSystem.readAsStringAsync;
const writeAsStringAsync = (FileSystem as any)
  .writeAsStringAsync as typeof FileSystem.writeAsStringAsync;
const UTF8 = "utf8" as const;

export type { Message, Reaction, ReplyTo };

const { width } = Dimensions.get("window");

const cacheFilePath = (conversationId: string) =>
  `${documentDirectory}chat_cache_${conversationId}.txt`;

async function readCacheFile(conversationId: string): Promise<Message[]> {
  const path = cacheFilePath(conversationId);
  try {
    const info = await getInfoAsync(path);
    if (!info.exists) return [];
    const raw = await readAsStringAsync(path, { encoding: UTF8 });
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}

async function writeCacheFile(
  conversationId: string,
  messages: Message[],
): Promise<void> {
  const path = cacheFilePath(conversationId);
  try {
    await writeAsStringAsync(path, JSON.stringify(messages.slice(-200)), {
      encoding: UTF8,
    });
  } catch (e) {
    console.warn("[ChatCache] write failed:", e);
  }
}

function mergeMessages(cached: Message[], fresh: Message[]): Message[] {
  const map = new Map<string, Message>();
  for (const m of cached) map.set(m.id, m);
  for (const m of fresh) map.set(m.id, m);
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

const isEmojiOnly = (text: string): boolean => {
  const stripped = text.trim();
  if (stripped.length === 0 || stripped.length > 12) return false;
  return /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\s)+$/u.test(
    stripped,
  );
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDateLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const isStickerMsg = (msg: Message): boolean => msg.message_type === "sticker";
const isGiftMsg = (msg: Message): boolean => msg.message_type === "gift"; // ← NEW

const isImageContent = (msg: Message): boolean =>
  msg.message_type === "image" ||
  msg.message_type === "image_group" ||
  (!msg.message_type &&
    typeof msg.content === "string" &&
    (msg.content.startsWith("http") || msg.content.startsWith("file://")) &&
    (msg.content.includes(".jpg") ||
      msg.content.includes(".jpeg") ||
      msg.content.includes(".png") ||
      msg.content.includes(".webp") ||
      msg.content.includes("chat-images")));

const GRID_W = width * 0.62;
const SINGLE_H = GRID_W * 1.25;
const GRID_GAP = 3;
const HALF = (GRID_W - GRID_GAP) / 2;
const SWIPE_THRESHOLD = 60;

export interface MessageBubbleProps {
  item: Message;
  index: number;
  messages: Message[];
  currentUserId: string;
  username: string;
  avatar_url: string;
  theme: ChatTheme;
  onLongPress: (msg: Message) => void;
  onImagePress: (url: string, urls?: string[]) => void;
  onSwipeReply: (msg: Message) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function MessageBubble({
  item,
  index,
  messages,
  currentUserId,
  username,
  avatar_url,
  theme,
  onLongPress,
  onImagePress,
  onSwipeReply,
  setMessages,
}: MessageBubbleProps) {
  const isMine = item.sender_id === currentUserId;
  const prev = messages[index - 1];
  const next = messages[index + 1];
  const isFirst = !prev || prev.sender_id !== item.sender_id;
  const isLast = !next || next.sender_id !== item.sender_id;
  const isDeleted = item.deleted_for_everyone;
  const isSticker = isStickerMsg(item);
  const isGift = isGiftMsg(item); // ← NEW
  const isImage = !isSticker && !isGift && isImageContent(item); // ← updated
  const emojiOnly =
    !isDeleted &&
    !isImage &&
    !isSticker &&
    !isGift &&
    isEmojiOnly(item.content); // ← updated

  const showDateLabel =
    index === 0 ||
    new Date(item.created_at).toDateString() !==
    new Date(messages[index - 1].created_at).toDateString();

  const reactionMap: Record<string, number> = {};
  (item.reactions || []).forEach((r) => {
    reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1;
  });

  const translateX = useRef(new Animated.Value(0)).current;
  const replyIconOpacity = useRef(new Animated.Value(0)).current;
  const replyIconScale = useRef(new Animated.Value(0.5)).current;
  const hasTriggered = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) return;
        const clamped = Math.min(g.dx, SWIPE_THRESHOLD + 20);
        translateX.setValue(clamped);
        const progress = Math.min(clamped / SWIPE_THRESHOLD, 1);
        replyIconOpacity.setValue(progress);
        replyIconScale.setValue(0.5 + progress * 0.5);
        if (clamped >= SWIPE_THRESHOLD && !hasTriggered.current) {
          hasTriggered.current = true;
          onSwipeReply(item);
        }
      },
      onPanResponderRelease: () => {
        hasTriggered.current = false;
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
          }),
          Animated.timing(replyIconOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(replyIconScale, {
            toValue: 0.5,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      },
    }),
  ).current;

  const renderTick = (dark = false) => {
    if (item.is_temp)
      return (
        <Check
          size={11}
          color={dark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.35)"}
        />
      );
    if (item.is_read) return <CheckCheck size={11} color="#4FC3F7" />;
    return (
      <Check
        size={11}
        color={dark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)"}
      />
    );
  };

  const renderReplyQuote = () => {
    if (!item.reply_to) return null;
    const isMyReply = item.reply_to.sender_id === currentUserId;
    const quotedIsImage =
      item.reply_to.message_type === "image" ||
      item.reply_to.message_type === "image_group";

    return (
      <View
        style={[
          s.replyQuote,
          isMine
            ? { backgroundColor: "rgba(0,0,0,0.15)" }
            : { backgroundColor: "rgba(0,0,0,0.07)" },
        ]}
      >
        <View
          style={[
            s.replyQuoteBar,
            {
              backgroundColor: isMine
                ? "rgba(255,255,255,0.7)"
                : theme.sendBtnBg,
            },
          ]}
        />
        <View style={s.replyQuoteContent}>
          <Text
            style={[
              s.replyQuoteName,
              { color: isMine ? "rgba(255,255,255,0.9)" : theme.sendBtnBg },
            ]}
          >
            {isMyReply ? "You" : username}
          </Text>
          {quotedIsImage ? (
            <View style={s.replyQuoteImageRow}>
              <ImageIcon
                size={11}
                color={isMine ? "rgba(255,255,255,0.7)" : theme.theirMetaColor}
              />
              <Text
                style={[
                  s.replyQuoteText,
                  {
                    color: isMine
                      ? "rgba(255,255,255,0.7)"
                      : theme.theirMetaColor,
                  },
                ]}
              >
                {item.reply_to.message_type === "image_group"
                  ? "Images"
                  : "Photo"}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                s.replyQuoteText,
                {
                  color: isMine
                    ? "rgba(255,255,255,0.7)"
                    : theme.theirMetaColor,
                },
              ]}
              numberOfLines={1}
            >
              {item.reply_to.content}
            </Text>
          )}
        </View>
        {quotedIsImage && (
          <Image
            source={{ uri: item.reply_to.content }}
            style={s.replyQuoteThumb}
            resizeMode="cover"
          />
        )}
      </View>
    );
  };

  const metaBadge = () => (
    <View style={s.imageMetaRow}>
      <Text style={s.imageMetaTime}>{formatTime(item.created_at)}</Text>
      {isMine && <View style={{ marginLeft: 3 }}>{renderTick()}</View>}
    </View>
  );

  const renderSingleImage = (uri: string, allUris?: string[]) => (
    <TouchableOpacity
      onPress={() => !item.is_temp && onImagePress(uri, allUris)}
      onLongPress={() => !isDeleted && onLongPress(item)}
      delayLongPress={300}
      activeOpacity={0.93}
      style={[
        s.imageCard,
        isMine
          ? { borderBottomRightRadius: isLast ? 4 : 18 }
          : { borderBottomLeftRadius: isLast ? 4 : 18 },
        isFirst && isMine && { borderTopRightRadius: 18 },
        isFirst && !isMine && { borderTopLeftRadius: 18 },
      ]}
    >
      <Image
        source={{ uri }}
        style={s.imageBlurBg}
        blurRadius={18}
        resizeMode="cover"
      />
      <View style={s.imageBlurOverlay} />
      {item.reply_to && (
        <View style={s.imageReplyQuote}>{renderReplyQuote()}</View>
      )}
      {item.is_temp ? (
        <View style={s.imageUploadingBox}>
          <Image
            source={{ uri }}
            style={s.imageMain}
            resizeMode="contain"
            blurRadius={2}
          />
          <View style={[StyleSheet.absoluteFill, s.uploadingOverlay]}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={s.uploadingText}>Sending...</Text>
          </View>
        </View>
      ) : (
        <Image source={{ uri }} style={s.imageMain} resizeMode="contain" />
      )}
      {metaBadge()}
    </TouchableOpacity>
  );

  const renderImageGrid = () => {
    const imgs =
      item.images && item.images.length > 1 ? item.images : [item.content];
    const count = imgs.length;
    if (count === 1) return renderSingleImage(imgs[0], imgs);
    const cellRadius = { borderRadius: 12, overflow: "hidden" as const };

    if (count === 2) {
      return (
        <TouchableWithoutFeedback
          onLongPress={() => !isDeleted && onLongPress(item)}
          delayLongPress={300}
        >
          <View
            style={[s.gridWrapper, { borderRadius: 18, overflow: "hidden" }]}
          >
            <View style={[s.gridRow, { gap: GRID_GAP }]}>
              {imgs.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => onImagePress(uri, imgs)}
                  activeOpacity={0.9}
                  style={[{ width: HALF, height: HALF * 1.15 }, cellRadius]}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: HALF, height: HALF * 1.15 }}
                    resizeMode="cover"
                  />
                  {item.is_temp && (
                    <View style={[StyleSheet.absoluteFill, s.uploadingOverlay]}>
                      <ActivityIndicator color="#fff" size="small" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {metaBadge()}
          </View>
        </TouchableWithoutFeedback>
      );
    }

    if (count === 3) {
      return (
        <TouchableWithoutFeedback
          onLongPress={() => !isDeleted && onLongPress(item)}
          delayLongPress={300}
        >
          <View
            style={[s.gridWrapper, { borderRadius: 18, overflow: "hidden" }]}
          >
            <TouchableOpacity
              onPress={() => onImagePress(imgs[0], imgs)}
              activeOpacity={0.9}
              style={{
                width: GRID_W,
                height: GRID_W * 0.7,
                marginBottom: GRID_GAP,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: imgs[0] }}
                style={{ width: GRID_W, height: GRID_W * 0.7 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <View style={[s.gridRow, { gap: GRID_GAP }]}>
              {imgs.slice(1).map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => onImagePress(uri, imgs)}
                  activeOpacity={0.9}
                  style={[{ width: HALF, height: HALF * 0.75 }, cellRadius]}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: HALF, height: HALF * 0.75 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
            {metaBadge()}
          </View>
        </TouchableWithoutFeedback>
      );
    }

    const displayImgs = imgs.slice(0, 4);
    const extra = count - 4;
    return (
      <TouchableWithoutFeedback
        onLongPress={() => !isDeleted && onLongPress(item)}
        delayLongPress={300}
      >
        <View style={[s.gridWrapper, { borderRadius: 18, overflow: "hidden" }]}>
          <View style={[s.gridRow, { gap: GRID_GAP, marginBottom: GRID_GAP }]}>
            {displayImgs.slice(0, 2).map((uri, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => onImagePress(uri, imgs)}
                activeOpacity={0.9}
                style={[{ width: HALF, height: HALF }, cellRadius]}
              >
                <Image
                  source={{ uri }}
                  style={{ width: HALF, height: HALF }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
          <View style={[s.gridRow, { gap: GRID_GAP }]}>
            {displayImgs.slice(2, 4).map((uri, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => onImagePress(uri, imgs)}
                activeOpacity={0.9}
                style={[{ width: HALF, height: HALF }, cellRadius]}
              >
                <Image
                  source={{ uri }}
                  style={{ width: HALF, height: HALF }}
                  resizeMode="cover"
                />
                {i === 1 && extra > 0 && (
                  <View style={s.extraOverlay}>
                    <Text style={s.extraText}>+{extra}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {metaBadge()}
        </View>
      </TouchableWithoutFeedback>
    );
  };

  return (
    <View>
      {showDateLabel && (
        <View style={s.dateLabelRow}>
          <View style={[s.dateLabelBg, { backgroundColor: theme.dateLabelBg }]}>
            <Text style={[s.dateLabel, { color: theme.dateLabelText }]}>
              {formatDateLabel(item.created_at)}
            </Text>
          </View>
        </View>
      )}

      <View style={s.swipeContainer}>
        <Animated.View
          style={[
            s.replyIconBehind,
            isMine ? s.replyIconLeft : s.replyIconRight,
            {
              opacity: replyIconOpacity,
              transform: [{ scale: replyIconScale }],
            },
          ]}
        >
          <View
            style={[s.replyIconCircle, { backgroundColor: theme.sendBtnBg }]}
          >
            <Reply size={18} color="#fff" />
          </View>
        </Animated.View>

        <Animated.View
          style={{ transform: [{ translateX }] }}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              s.msgWrapper,
              isMine ? s.myWrapper : s.theirWrapper,
              { marginBottom: isLast ? 10 : 2 },
            ]}
          >
            {!isMine && (
              <View style={s.avatarCol}>
                {isLast ? (
                  <Image
                    source={{
                      uri:
                        avatar_url ||
                        `https://ui-avatars.com/api/?name=${username}&background=FFD700&color=000`,
                    }}
                    style={s.msgAvatar}
                  />
                ) : (
                  <View style={{ width: 30 }} />
                )}
              </View>
            )}

            <View style={{ maxWidth: width * 0.72 }}>
              {/* ── GIFT (NEW — must be first) ── */}
              {isGift ? (
                <GiftBubble
                  content={item.content}
                  isMine={isMine}
                  time={formatTime(item.created_at)}
                  theme={theme}
                  onLongPress={() => !isDeleted && onLongPress(item)}
                />
              ) : isSticker ? (
                <StickerBubble
                  uri={item.content}
                  isMine={isMine}
                  time={formatTime(item.created_at)}
                  isRead={item.is_read}
                  isTemp={item.is_temp}
                  onLongPress={() => !isDeleted && onLongPress(item)}
                />
              ) : isImage ? (
                renderImageGrid()
              ) : emojiOnly ? (
                <TouchableWithoutFeedback
                  onLongPress={() => !isDeleted && onLongPress(item)}
                  delayLongPress={300}
                >
                  <View
                    style={[
                      s.emojiBigWrapper,
                      isMine
                        ? { alignItems: "flex-end" }
                        : { alignItems: "flex-start" },
                    ]}
                  >
                    <Text style={s.emojiBig}>{item.content}</Text>
                    <View style={s.emojiMeta}>
                      <Text
                        style={[s.metaTime, { color: theme.theirMetaColor }]}
                      >
                        {formatTime(item.created_at)}
                      </Text>
                      {isMine && (
                        <View style={{ marginLeft: 3 }}>
                          {renderTick(true)}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              ) : (
                <TouchableWithoutFeedback
                  onLongPress={() => !isDeleted && onLongPress(item)}
                  delayLongPress={300}
                >
                  <View
                    style={[
                      s.bubble,
                      isMine
                        ? [
                          s.myBubble,
                          {
                            backgroundColor: isDeleted
                              ? "#f0f0f0"
                              : theme.myBubbleBg,
                          },
                        ]
                        : [
                          s.theirBubble,
                          {
                            backgroundColor: isDeleted
                              ? "#f0f0f0"
                              : theme.theirBubbleBg,
                          },
                        ],
                      isMine && isLast && s.myTail,
                      !isMine && isLast && s.theirTail,
                      isMine && isFirst && { borderTopRightRadius: 20 },
                      !isMine && isFirst && { borderTopLeftRadius: 20 },
                    ]}
                  >
                    {renderReplyQuote()}
                    <Text
                      style={[
                        s.msgText,
                        isDeleted
                          ? s.deletedText
                          : isMine
                            ? { color: theme.myBubbleText }
                            : { color: theme.theirBubbleText },
                      ]}
                    >
                      {item.content}
                    </Text>
                    <View style={s.meta}>
                      <Text
                        style={[
                          s.metaTime,
                          isMine && !isDeleted && { color: theme.myMetaColor },
                        ]}
                      >
                        {formatTime(item.created_at)}
                      </Text>
                      {isMine && !isDeleted && (
                        <View style={{ marginLeft: 3 }}>{renderTick()}</View>
                      )}
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              )}

              {/* Reactions */}
              {Object.entries(reactionMap).length > 0 && (
                <View
                  style={[s.reactionsRow, isMine ? s.reactMine : s.reactTheir]}
                >
                  {Object.entries(reactionMap).map(([emoji, count]) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        s.reactionBubble,
                        (item.reactions || []).find(
                          (r) =>
                            r.emoji === emoji && r.user_id === currentUserId,
                        ) && s.reactionBubbleActive,
                      ]}
                      onPress={async () => {
                        const current: Reaction[] = item.reactions || [];
                        const existing = current.find(
                          (r) =>
                            r.user_id === currentUserId && r.emoji === emoji,
                        );
                        const newR = existing
                          ? current.filter(
                            (r) =>
                              !(
                                r.user_id === currentUserId &&
                                r.emoji === emoji
                              ),
                          )
                          : [
                            ...current.filter(
                              (r) => r.user_id !== currentUserId,
                            ),
                            { emoji, user_id: currentUserId },
                          ];
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === item.id ? { ...m, reactions: newR } : m,
                          ),
                        );
                        await supabase
                          .from("messages")
                          .update({ reactions: newR })
                          .eq("id", item.id);
                      }}
                    >
                      <Text style={s.reactionEmoji}>{emoji}</Text>
                      {count > 1 && (
                        <Text style={s.reactionCount}>{count}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

export default MessageBubble;

const cs = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8 },
});

const s = StyleSheet.create({
  dateLabelRow: { alignItems: "center", marginVertical: 10 },
  dateLabelBg: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  dateLabel: { fontFamily: "Outfit_400Regular", fontSize: 11 },
  swipeContainer: { position: "relative" },
  replyIconBehind: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 0,
    paddingHorizontal: 14,
  },
  replyIconLeft: { left: 0 },
  replyIconRight: { right: 0 },
  replyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  msgWrapper: { flexDirection: "row", width: "100%", alignItems: "flex-end" },
  myWrapper: { justifyContent: "flex-end", paddingLeft: 50 },
  theirWrapper: { justifyContent: "flex-start", paddingRight: 50 },
  avatarCol: {
    width: 30,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  msgAvatar: { width: 28, height: 28, borderRadius: 14 },
  bubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  myBubble: { borderBottomRightRadius: 20 },
  theirBubble: { borderBottomLeftRadius: 20 },
  myTail: { borderBottomRightRadius: 4 },
  theirTail: { borderBottomLeftRadius: 4 },
  msgText: { fontFamily: "Outfit_400Regular", fontSize: 15, lineHeight: 22 },
  deletedText: { color: "#999", fontStyle: "italic", fontSize: 13 },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 2,
  },
  metaTime: { fontSize: 10, color: "#888", fontFamily: "Outfit_400Regular" },
  replyQuote: {
    flexDirection: "row",
    borderRadius: 10,
    marginBottom: 6,
    overflow: "hidden",
    minHeight: 40,
  },
  replyQuoteBar: { width: 3 },
  replyQuoteContent: { flex: 1, paddingHorizontal: 8, paddingVertical: 4 },
  replyQuoteName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    marginBottom: 2,
  },
  replyQuoteText: { fontFamily: "Outfit_400Regular", fontSize: 12 },
  replyQuoteImageRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  replyQuoteThumb: { width: 36, height: 36, borderRadius: 4 },
  imageReplyQuote: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    zIndex: 10,
  },
  emojiBigWrapper: { paddingHorizontal: 4, paddingVertical: 2 },
  emojiBig: { fontSize: 32, lineHeight: 62 },
  emojiMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 3,
  },
  imageCard: {
    width: GRID_W,
    height: SINGLE_H,
    borderRadius: 18,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    backgroundColor: "#111",
  },
  imageBlurBg: {
    ...StyleSheet.absoluteFillObject,
    width: GRID_W,
    height: SINGLE_H,
  },
  imageBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  imageMain: { width: GRID_W, height: SINGLE_H },
  imageUploadingBox: { width: GRID_W, height: SINGLE_H },
  uploadingOverlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadingText: {
    color: "#fff",
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
  },
  imageMetaRow: {
    position: "absolute",
    bottom: 10,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  imageMetaTime: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Outfit_400Regular",
  },
  gridWrapper: { width: GRID_W, backgroundColor: "#111", position: "relative" },
  gridRow: { flexDirection: "row" },
  extraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  extraText: { color: "#fff", fontFamily: "Outfit_700Bold", fontSize: 22 },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  reactMine: { justifyContent: "flex-end" },
  reactTheir: { justifyContent: "flex-start" },
  reactionBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    elevation: 2,
    gap: 3,
  },
  reactionBubbleActive: {
    borderColor: "#eab308",
    borderWidth: 1.5,
    backgroundColor: "#FFF9E6",
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: {
    fontSize: 11,
    color: "#555",
    fontFamily: "Outfit_600SemiBold",
  },
});
