// ─── app/story/[id].tsx ───────────────────────────────────────────────────────
// Story viewer — shows all stories for a given user, image + video supported
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
import { useVideoPlayer, VideoView } from "expo-video";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { supabase } from "../../lib/supabase";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_DURATION = 5000;
const VIDEO_DURATION = 15000;

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Video sub-component ──────────────────────────────────────────────────────
// Isolated so useVideoPlayer hook always has a stable URI to work with
function StoryVideo({
  uri,
  paused,
  onFinish,
}: {
  uri: string;
  paused: boolean;
  onFinish: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener("playToEnd", onFinish);
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused]);

  return (
    <VideoView
      player={player}
      style={styles.media}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StoryViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [paused, setPaused] = useState<boolean>(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  // ── Fetch stories ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (id) fetchStories(id);
  }, [id]);

  // ── Start progress when story changes ────────────────────────────────────
  useEffect(() => {
    if (stories.length > 0 && stories[currentIndex]) {
      markAsViewed(stories[currentIndex].id);
      const duration =
        stories[currentIndex].media_type === "video"
          ? VIDEO_DURATION
          : IMAGE_DURATION;
      startProgress(duration);
    }
  }, [currentIndex, stories]);

  const fetchStories = async (userId: string): Promise<void> => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("stories")
      .select(
        "id, media_url, media_type, created_at, user_id, users(username, avatar_url)"
      )
      .eq("user_id", userId)
      .gte("expires_at", now)
      .order("created_at", { ascending: true });

    if (data) {
      const normalized: Story[] = (data as any[]).map((item) => ({
        ...item,
        users: Array.isArray(item.users) ? item.users[0] ?? null : item.users,
      }));
      setStories(normalized);
    }
    setLoading(false);
  };

  const markAsViewed = async (storyId: string): Promise<void> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("story_views")
      .upsert({ story_id: storyId, viewer_id: user.id });
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
      startProgress(
        current.media_type === "video" ? VIDEO_DURATION : IMAGE_DURATION
      );
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!fontsLoaded || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#FFB800" size="large" />
      </View>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (stories.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No stories available</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const current = stories[currentIndex];
  const user = current.users;

  return (
    <View style={styles.container}>
      {/* ── Media (image or video) ── */}
      <TouchableWithoutFeedback
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
      >
        <View style={StyleSheet.absoluteFill}>
          {current.media_type === "video" ? (
            <StoryVideo
              uri={current.media_url}
              paused={paused}
              onFinish={goNext}
            />
          ) : (
            <Image
              source={{ uri: current.media_url }}
              style={styles.media}
              resizeMode="cover"
            />
          )}
          {/* Dark gradient overlay */}
          <View style={styles.overlay} />
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

      {/* ── Header (avatar + name + close) ── */}
      <View style={styles.header}>
        <View style={styles.userRow}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>
                {user?.username?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.username}>{user?.username ?? "User"}</Text>
            <Text style={styles.timeAgo}>{getTimeAgo(current.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tap zones (left = prev, right = next) ── */}
      <View style={styles.tapRow} pointerEvents="box-none">
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
  centered: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    color: "#fff",
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: "#FFB800",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 50,
  },
  backBtnText: {
    fontFamily: "Outfit_700Bold",
    color: "#000",
    fontSize: 14,
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  progressRow: {
    flexDirection: "row",
    position: "absolute",
    top: 52,
    left: 12,
    right: 12,
    gap: 4,
    zIndex: 20,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: "rgba(255,255,255,0.35)",
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
    top: 66,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "#FFB800",
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFB800",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: "#000",
  },
  username: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#fff",
  },
  timeAgo: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 18,
  },
  closeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  tapRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    zIndex: 10,
  },
  tapZone: { flex: 1 },
});