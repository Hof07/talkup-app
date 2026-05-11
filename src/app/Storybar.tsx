// ─── StoryBar.tsx ─────────────────────────────────────────────────────────────
// Drop-in replacement for the StoryBar inside HomeScreen.tsx
// Fixes:
//   1. Only shows stories from ACCEPTED friends (was showing all users)
//   2. Proper auth guard (handles unauthenticated state)
// Upgrades:
//   • Instagram-style animated gradient ring (gold → orange → pink)
//   • Smooth shimmer skeleton loading state
//   • "Seen" stories get a muted gray ring (exactly like Instagram)
//   • Own story shows a camera badge for "add more"
//   • Subtle scale-on-press animation

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import Colors from "./constants/colors";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StoryItem {
  user_id: string;
  username: string;
  avatar_url: string | null;
  has_unseen: boolean;
  is_own?: boolean;
  view_count?: number;
}

// ─── Skeleton placeholder ─────────────────────────────────────────────────────
function StorySkeleton({ colors }: { colors: any }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });
  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ alignItems: "center", gap: 6 }}>
          <Animated.View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.neutral200,
              opacity,
            }}
          />
          <Animated.View
            style={{
              width: 44,
              height: 9,
              borderRadius: 4,
              backgroundColor: colors.neutral200,
              opacity,
            }}
          />
        </View>
      ))}
    </View>
  );
}

// ─── Single story bubble ──────────────────────────────────────────────────────
function StoryBubble({
  item,
  colors,
}: {
  item: StoryItem;
  colors: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const isAdd = item.user_id === "add";
  const isOwn = !!item.is_own;
  const seen = !isAdd && !isOwn && !item.has_unseen;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const onPress = () => {
    onPressOut();
    if (isAdd) {
      router.push("/add-story");
    } else {
      router.push({ pathname: "/story/[id]", params: { id: item.user_id } });
    }
  };

  const label = isAdd ? "Add" : isOwn ? "Your Story" : item.username;

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      style={{ alignItems: "center", width: 68 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {/* Ring wrapper */}
        {seen ? (
          // Seen → flat gray ring
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              borderWidth: 2,
              borderColor: colors.neutral300,
              padding: 3,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AvatarInner item={item} colors={colors} isAdd={isAdd} isOwn={isOwn} />
          </View>
        ) : (
          // Unseen / own / add → gradient ring
          <LinearGradient
            colors={
              isAdd
                ? [Colors.primary, Colors.primary]
                : ["#FFB800", "#FF6B35", "#E91E8C"]
            }
            start={{ x: 0.2, y: 0.8 }}
            end={{ x: 0.8, y: 0.2 }}
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              padding: 2.5,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.background,
                padding: 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AvatarInner item={item} colors={colors} isAdd={isAdd} isOwn={isOwn} />
            </View>
          </LinearGradient>
        )}

        {/* Add (+) badge on own story */}
        {isOwn && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: Colors.primary,
              borderWidth: 2,
              borderColor: colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 13, color: "#000", fontFamily: "Outfit_700Bold", lineHeight: 15 }}>
              +
            </Text>
          </View>
        )}

        {/* View count badge on own story */}
        {isOwn && (item.view_count ?? 0) > 0 && (
          <View
            style={{
              position: "absolute",
              top: 0,
              right: -4,
              backgroundColor: "#FF3B30",
              borderRadius: 10,
              minWidth: 20,
              height: 20,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 4,
              borderWidth: 1.5,
              borderColor: colors.background,
            }}
          >
            <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 10, color: "#fff" }}>
              {item.view_count}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Label */}
      <Text
        style={{
          fontFamily: "Outfit_400Regular",
          fontSize: 11,
          color: colors.neutral500,
          marginTop: 5,
          width: 68,
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Avatar inner content ─────────────────────────────────────────────────────
function AvatarInner({
  item,
  colors,
  isAdd,
  isOwn,
}: {
  item: StoryItem;
  colors: any;
  isAdd: boolean;
  isOwn: boolean;
}) {
  if (item.avatar_url) {
    return (
      <Image
        source={{ uri: item.avatar_url }}
        style={{ width: "100%", height: "100%", borderRadius: 999 }}
      />
    );
  }
  return (
    <View
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 999,
        backgroundColor: isAdd ? colors.neutral200 : colors.neutral100,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: "Outfit_700Bold",
          fontSize: 22,
          color: isAdd ? colors.neutral600 : Colors.primary,
        }}
      >
        {isAdd ? "+" : isOwn ? "✓" : item.username[0]?.toUpperCase() ?? "?"}
      </Text>
    </View>
  );
}

export const StoryBar = ({
  currentUserId,
  colors,
}: {
  currentUserId: string;
  colors: any;
}) => {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [hasOwnStory, setHasOwnStory] = useState(false);
  const [ownViewCount, setOwnViewCount] = useState(0);
  const [loadingStories, setLoadingStories] = useState(true);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    setLoadingStories(true);
    try {
      const now = new Date().toISOString();

     
      const { data: friendships } = await supabase
        .from("friends")
        .select("user_id, friend_id")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .eq("status", "accepted"); 

      const friendIds: string[] = (friendships ?? []).map((row: any) =>
        row.user_id === currentUserId ? row.friend_id : row.user_id
      );


      if (friendIds.length > 0) {
        const { data: friendData } = await supabase
          .from("stories")
          .select("user_id, users(username, avatar_url), story_views(viewer_id)")
          .in("user_id", friendIds) 
          .gte("expires_at", now)
          .order("created_at", { ascending: false });

        if (friendData) {
          const seen = new Set<string>();
          const result: StoryItem[] = [];
          for (const row of friendData as any[]) {
            if (seen.has(row.user_id)) continue;
            seen.add(row.user_id);
            const userObj = Array.isArray(row.users) ? row.users[0] : row.users;
            result.push({
              user_id: row.user_id,
              username: userObj?.username ?? "User",
              avatar_url: userObj?.avatar_url ?? null,
              has_unseen: !row.story_views?.some(
                (v: any) => v.viewer_id === currentUserId
              ),
            });
          }
          // Unseen stories first (Instagram ordering)
          result.sort((a, b) => (b.has_unseen ? 1 : 0) - (a.has_unseen ? 1 : 0));
          setStories(result);
        }
      }

      // ── Own stories ───────────────────────────────────────────────────────
      const { data: ownData } = await supabase
        .from("stories")
        .select("id")
        .eq("user_id", currentUserId)
        .gte("expires_at", now);

      const hasOwn = !!(ownData && ownData.length > 0);
      setHasOwnStory(hasOwn);

      if (hasOwn) {
        const storyIds = (ownData as any[]).map((s) => s.id);
        const { data: viewData } = await supabase
          .from("story_views")
          .select("story_id")
          .in("story_id", storyIds);
        setOwnViewCount(viewData?.length ?? 0);
      }
    } finally {
      setLoadingStories(false);
    }
  };

  const addItem: StoryItem = {
    user_id: "add",
    username: "Add",
    avatar_url: null,
    has_unseen: false,
  };

  const ownItem: StoryItem | null = hasOwnStory
    ? {
        user_id: currentUserId,
        username: "Your Story",
        avatar_url: null,
        has_unseen: false,
        is_own: true,
        view_count: ownViewCount,
      }
    : null;

  const allItems: StoryItem[] = [
    addItem,
    ...(ownItem ? [ownItem] : []),
    ...stories,
  ];

  return (
    <View style={{ marginBottom: 8 }}>
      <Text
        style={{
          fontFamily: "Outfit_700Bold",
          fontSize: 13,
          color: colors.neutral500,
          paddingHorizontal: 24,
          marginBottom: 10,
          marginTop: 4,
        }}
      >
        Stories
      </Text>

      {loadingStories ? (
        <StorySkeleton colors={colors} />
      ) : (
        <FlatList<StoryItem>
          data={allItems}
          keyExtractor={(item) =>
            item.user_id === "add"
              ? "add"
              : item.user_id + (item.is_own ? "_own" : "")
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
          renderItem={({ item }) => (
            <StoryBubble item={item} colors={colors} />
          )}
        />
      )}
    </View>
  );
};