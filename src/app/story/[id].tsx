// ─── app/story/[id].tsx ───────────────────────────────────────────────────────
// Story viewer screen — shows all stories for a given user_id
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
// import { supabase } from "../lib/supabase"; // ← adjust if needed
// import { useAppTheme } from "../constants/ThemeContext"; // ← adjust if needed
import { supabase } from "../../lib/supabase.ts";
import { useAppTheme } from "../constants/ThemeContext.tsx";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Story {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
  user_id: string;
  users: {
    username: string;
    avatar_url: string | null;
  } | null;
}

const STORY_DURATION = 5000; // 5 seconds per image story

export default function StoryViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();

  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [paused, setPaused] = useState<boolean>(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const videoRef = useRef<Video>(null);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    if (id) fetchStories(id as string);
  }, [id]);

  useEffect(() => {
    if (stories.length > 0) {
      markAsViewed(stories[currentIndex].id);
      startProgress(stories[currentIndex].media_type === "video" ? 15000 : STORY_DURATION);
    }
  }, [currentIndex, stories]);

  const fetchStories = async (userId: string): Promise<void> => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("stories")
      .select("id, media_url, media_type, created_at, user_id, users(username, avatar_url)")
      .eq("user_id", userId)
      .gte("expires_at", now)
      .order("created_at", { ascending: true });

    if (data) setStories(data as Story[]);
    setLoading(false);
  };

  const markAsViewed = async (storyId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("story_views").upsert({
      story_id: storyId,
      viewer_id: user.id,
    });
  };

  const startProgress = (duration: number): void => {
    progressAnim.setValue(0);
    progressAnimation.current?.stop();
    progressAnimation.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });
    progressAnimation.current.start(({ finished }) => {
      if (finished) goNext();
    });
  };

  const goNext = (): void => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      router.back();
    }
  };

  const goPrev = (): void => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleLongPress = (): void => {
    setPaused(true);
    progressAnimation.current?.stop();
  };

  const handlePressOut = (): void => {
    setPaused(false);
    const current = stories[currentIndex];
    if (current) {
      startProgress(current.media_type === "video" ? 15000 : STORY_DURATION);
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#FFB800" size="large" />
      </View>
    );
  }

  if (stories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.noStoryText}>No stories available</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const current = stories[currentIndex];
  const user = current.users;
  const timeAgo = getTimeAgo(current.created_at);

  return (
    <View style={styles.container}>
      {/* ── Media ── */}
      <TouchableWithoutFeedback
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
      >
        <View style={styles.mediaContainer}>
          {current.media_type === "video" ? (
            <Video
              ref={videoRef}
              source={{ uri: current.media_url }}
              style={styles.media}
              resizeMode={ResizeMode.COVER}
              shouldPlay={!paused}
              isLooping={false}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded && status.didJustFinish) goNext();
              }}
            />
          ) : (
            <Image
              source={{ uri: current.media_url }}
              style={styles.media}
              resizeMode="cover"
            />
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* ── Progress bars ── */}
      <View style={styles.progressRow}>
        {stories.map((_, i) => (
          <View key={i} style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width:
                    i < currentIndex
                      ? "100%"
                      : i === currentIndex
                      ? progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        })
                      : "0%",
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {user?.username?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.username}>{user?.username ?? "User"}</Text>
            <Text style={styles.timeAgo}>{timeAgo}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tap left / right to navigate ── */}
      <View style={styles.tapRow}>
        <TouchableOpacity style={styles.tapZone} onPress={goPrev} />
        <TouchableOpacity style={styles.tapZone} onPress={goNext} />
      </View>
    </View>
  );
}

// ── Time helper ───────────────────────────────────────────────────────────────
function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  noStoryText: {
    color: "#fff",
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: "#FFB800",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 50,
  },
  backBtnText: {
    fontFamily: "Outfit_600SemiBold",
    color: "#000",
    fontSize: 14,
  },
  mediaContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  media: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  progressRow: {
    flexDirection: "row",
    position: "absolute",
    top: 52,
    left: 12,
    right: 12,
    gap: 4,
    zIndex: 10,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  header: {
    position: "absolute",
    top: 64,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: "#FFB800" },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFB800",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#000" },
  username: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#fff" },
  timeAgo: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  closeBtn: { padding: 8 },
  closeText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  tapRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    zIndex: 5,
  },
  tapZone: { flex: 1 },
});