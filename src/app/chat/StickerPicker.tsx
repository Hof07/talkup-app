/**
 * StickerPicker.tsx
 *
 * WhatsApp-style sticker picker bottom sheet.
 *
 * Features:
 * - Pack tabs at the bottom (like WhatsApp)
 * - Animated GIF stickers from Noto Emoji
 * - Recently used stickers tab (persisted to local file cache)
 * - Local file cache (instant load, no DB round-trip)
 * - Supabase sync of recently used in background
 * - Smooth fade-in per sticker as images load
 *
 * Usage:
 *   <StickerPicker
 *     visible={showStickers}
 *     onClose={() => setShowStickers(false)}
 *     onSelect={(sticker) => sendMessage({ content: sticker.url, message_type: "sticker" })}
 *     userId={currentUserId}
 *   />
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
  Animated,
  ScrollView,
  Platform,
} from "react-native";
import { X, Clock } from "lucide-react-native";
import { STICKER_PACKS, Stickers, StickerPack } from "./stickers";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/lib/supabase";

const FileSystemAny = FileSystem as any;
const fsDocDir: string = FileSystemAny.documentDirectory ?? "";
const fsGetInfo = FileSystemAny.getInfoAsync as typeof FileSystem.getInfoAsync;
const fsRead = FileSystemAny.readAsStringAsync as typeof FileSystem.readAsStringAsync;
const fsWrite = FileSystemAny.writeAsStringAsync as typeof FileSystem.writeAsStringAsync;
const UTF8 = "utf8" as const;

const RECENT_CACHE_PATH = `${fsDocDir}sticker_recent.txt`;
const MAX_RECENT = 24;

async function loadRecentFromFile(): Promise<Stickers[]> {
  try {
    const info = await fsGetInfo(RECENT_CACHE_PATH);
    if (!info.exists) return [];
    const raw = await fsRead(RECENT_CACHE_PATH, { encoding: UTF8 });
    return JSON.parse(raw) as Stickers[];
  } catch {
    return [];
  }
}

async function saveRecentToFile(stickers: Stickers[]): Promise<void> {
  try {
    await fsWrite(RECENT_CACHE_PATH, JSON.stringify(stickers), {
      encoding: UTF8,
    });
  } catch (e) {
    console.warn("[StickerPicker] cache write failed:", e);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StickerPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (sticker: Stickers) => void;
  userId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SHEET_H = SCREEN_H * 0.52;
const TAB_H = 52;
const GRID_COLS = 4;
const STICKER_GAP = 6;
const STICKER_SIZE =
  (SCREEN_W - STICKER_GAP * (GRID_COLS + 1)) / GRID_COLS;

// ─── Sticker Cell ─────────────────────────────────────────────────────────────

const StickerCell = memo(
  ({
    sticker,
    onPress,
  }: {
    sticker: Stickers;
    onPress: (s: Stickers) => void;
  }) => {
    const opacity = useRef(new Animated.Value(0)).current;

    const onLoad = () => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        onPress={() => onPress(sticker)}
        activeOpacity={0.7}
        style={s.stickerCell}
      >
        <Animated.Image
          source={{ uri: sticker.url }}
          style={[s.stickerImage, { opacity }]}
          resizeMode="contain"
          onLoad={onLoad}
        />
      </TouchableOpacity>
    );
  }
);

// ─── Pack Tab Button ──────────────────────────────────────────────────────────

const PackTab = memo(
  ({
    pack,
    active,
    onPress,
  }: {
    pack: { id: string; cover: string | null; isRecent?: boolean };
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[s.packTab, active && s.packTabActive]}
      activeOpacity={0.7}
    >
      {pack.isRecent ? (
        <Clock
          size={20}
          color={active ? "#f0f0f0" : "#666"}
          strokeWidth={active ? 2.5 : 1.8}
        />
      ) : (
        <Image
          source={{ uri: pack.cover! }}
          style={s.packTabImage}
          resizeMode="contain"
        />
      )}
      {active && <View style={s.packTabDot} />}
    </TouchableOpacity>
  )
);

// ─── Main Component ───────────────────────────────────────────────────────────

export function StickerPicker({
  visible,
  onClose,
  onSelect,
  userId,
}: StickerPickerProps) {
  const [activePackId, setActivePackId] = useState<string>("recent");
  const [recentStickers, setRecentStickers] = useState<Stickers[]>([]);
  const slideAnim = useRef(new Animated.Value(SHEET_H)).current;

  // ── Load recent stickers from local cache on mount ────────────────────────
  useEffect(() => {
    loadRecentFromFile().then(setRecentStickers);
  }, []);

  // ── Animate sheet in/out ──────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      // Reset to recent tab on open if there are recents, else first pack
      setActivePackId(recentStickers.length > 0 ? "recent" : STICKER_PACKS[0].id);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_H,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, recentStickers.length]);

  // ── Handle sticker selection ──────────────────────────────────────────────
  const handleSelect = useCallback(
    (sticker: Stickers) => {
      // Update recents — prepend, dedupe, trim
      setRecentStickers((prev) => {
        const deduped = [sticker, ...prev.filter((r) => r.id !== sticker.id)];
        const trimmed = deduped.slice(0, MAX_RECENT);
        // Persist to local file
        saveRecentToFile(trimmed);
        // Sync to Supabase in background (fire & forget)
        void Promise.resolve(
          supabase
            .from("user_sticker_recents")
            .upsert(
              { user_id: userId, recents: JSON.stringify(trimmed) },
              { onConflict: "user_id" }
            )
        ).catch(() => {});
        return trimmed;
      });

      onSelect(sticker);
      onClose();
    },
    [onSelect, onClose, userId]
  );

  // ── Active pack data ──────────────────────────────────────────────────────
  const activeStickers: Stickers[] =
    activePackId === "recent"
      ? recentStickers
      : STICKER_PACKS.find((p) => p.id === activePackId)?.stickers ?? [];

  const renderSticker = useCallback(
    ({ item }: { item: Stickers }) => (
      <StickerCell sticker={item} onPress={handleSelect} />
    ),
    [handleSelect]
  );

  const keyExtractor = useCallback((item: Stickers) => item.id, []);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: "recent", cover: null, isRecent: true },
    ...STICKER_PACKS.map((p) => ({ id: p.id, cover: p.cover, isRecent: false })),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={s.backdrop} onPress={onClose} />

      {/* Sheet */}
      <Animated.View
        style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle + header */}
        <View style={s.handleRow}>
          <View style={s.handle} />
        </View>

        <View style={s.header}>
          <Text style={s.headerTitle}>
            {activePackId === "recent"
              ? "Recently Used"
              : STICKER_PACKS.find((p) => p.id === activePackId)?.name ??
                "Stickers"}
          </Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={12}>
            <X size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Sticker grid */}
        <View style={s.gridContainer}>
          {activePackId === "recent" && recentStickers.length === 0 ? (
            <View style={s.emptyRecent}>
              <Clock size={32} color="#444" />
              <Text style={s.emptyRecentText}>
                Stickers you send will{"\n"}appear here
              </Text>
            </View>
          ) : (
            <FlatList
              data={activeStickers}
              renderItem={renderSticker}
              keyExtractor={keyExtractor}
              numColumns={GRID_COLS}
              columnWrapperStyle={s.gridRow}
              contentContainerStyle={s.gridContent}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews
              windowSize={6}
              maxToRenderPerBatch={16}
              initialNumToRender={16}
            />
          )}
        </View>

        {/* Pack tabs */}
        <View style={s.tabBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabBarContent}
          >
            {tabs.map((tab) => (
              <PackTab
                key={tab.id}
                pack={tab}
                active={activePackId === tab.id}
                onPress={() => setActivePackId(tab.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Safe area spacer on iOS */}
        {Platform.OS === "ios" && <View style={s.iosSafeArea} />}
      </Animated.View>
    </Modal>
  );
}

export default StickerPicker;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    backgroundColor: "#181818",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },

  handleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3a3a3a",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    color: "#e0e0e0",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Outfit_600SemiBold",
  },
  closeBtn: { padding: 4 },

  // Grid
  gridContainer: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: STICKER_GAP,
    paddingTop: 4,
    paddingBottom: 8,
  },
  gridRow: {
    gap: STICKER_GAP,
    marginBottom: STICKER_GAP,
  },
  stickerCell: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    borderRadius: 14,
    backgroundColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stickerImage: {
    width: STICKER_SIZE * 0.82,
    height: STICKER_SIZE * 0.82,
  },

  // Empty recent
  emptyRecent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 20,
  },
  emptyRecentText: {
    color: "#555",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Outfit_400Regular",
  },

  // Pack tab bar
  tabBar: {
    height: TAB_H,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
    backgroundColor: "#141414",
  },
  tabBarContent: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  packTab: {
    width: 44,
    height: TAB_H,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  packTabActive: {
    // highlighted by dot below
  },
  packTabImage: {
    width: 26,
    height: 26,
  },
  packTabDot: {
    position: "absolute",
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#f0f0f0",
  },

  iosSafeArea: { height: 20 },
});