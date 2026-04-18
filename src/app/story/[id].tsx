

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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

const { width: SW, height: SH } = Dimensions.get("window");
const IMAGE_DURATION = 5000;
const VIDEO_DURATION = 15000;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Story {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
  user_id: string;
  users: { username: string; avatar_url: string | null } | null;
}

interface Viewer {
  viewer_id: string;
  users: { username: string; avatar_url: string | null } | null;
}

// ─── Video sub-component ──────────────────────────────────────────────────────
function StoryVideo({
  uri,
  paused,
  muted,
  onFinish,
}: {
  uri: string;
  paused: boolean;
  muted: boolean;
  onFinish: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = muted;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener("playToEnd", onFinish);
    return () => sub.remove();
  }, [player, onFinish]);

  useEffect(() => { paused ? player.pause() : player.play(); }, [paused]);
  useEffect(() => { player.muted = muted; }, [muted]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

// ─── Viewers modal ────────────────────────────────────────────────────────────
function ViewersModal({
  visible,
  viewers,
  onClose,
  colors,
}: {
  visible: boolean;
  viewers: Viewer[];
  onClose: () => void;
  colors?: any;
}) {
  const slideY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: visible ? 0 : 300,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={viewStyles.backdrop}>
      <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <Animated.View
        style={[viewStyles.sheet, { transform: [{ translateY: slideY }] }]}
      >
        <View style={viewStyles.handle} />
        <Text style={viewStyles.sheetTitle}>
          {viewers.length} {viewers.length === 1 ? "viewer" : "viewers"}
        </Text>
        {viewers.length === 0 ? (
          <Text style={viewStyles.emptyLabel}>No views yet</Text>
        ) : (
          viewers.map((v) => {
            const u = Array.isArray(v.users) ? v.users[0] : v.users;
            return (
              <View key={v.viewer_id} style={viewStyles.viewerRow}>
                {u?.avatar_url ? (
                  <Image source={{ uri: u.avatar_url }} style={viewStyles.viewerAvatar} />
                ) : (
                  <View style={[viewStyles.viewerAvatar, viewStyles.viewerAvatarFallback]}>
                    <Text style={viewStyles.viewerAvatarLetter}>
                      {u?.username?.[0]?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                )}
                <Text style={viewStyles.viewerName}>{u?.username ?? "User"}</Text>
              </View>
            );
          })
        )}
      </Animated.View>
    </View>
  );
}

const viewStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  sheet: {
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 48,
    maxHeight: SH * 0.55,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#fff",
    marginBottom: 16,
  },
  emptyLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  viewerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  viewerAvatar: { width: 38, height: 38, borderRadius: 19 },
  viewerAvatarFallback: {
    backgroundColor: "#FFB800",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerAvatarLetter: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: "#000",
  },
  viewerName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StoryViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isOwnStory, setIsOwnStory] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const mediaFade = useRef(new Animated.Value(1)).current;
  const containerY = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id ?? null);
    });
  }, []);

  // ── Fetch stories ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (id) fetchStories(id);
  }, [id]);

  // ── Keyboard events (pause while typing) ─────────────────────────────────
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardOpen(true);
      setPaused(true);
      progressAnimation.current?.stop();
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardOpen(false);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Story change: mark viewed + start progress ────────────────────────────
  useEffect(() => {
    if (!stories.length || !stories[currentIndex]) return;
    const story = stories[currentIndex];

    // Fade in new story
    mediaFade.setValue(0);
    Animated.timing(mediaFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    markAsViewed(story.id);
    startProgress(story.media_type === "video" ? VIDEO_DURATION : IMAGE_DURATION);
  }, [currentIndex, stories]);

  // ── Own story check → fetch viewers ──────────────────────────────────────
  useEffect(() => {
    if (!currentUserId || !stories[currentIndex]) return;
    const own = stories[currentIndex].user_id === currentUserId;
    setIsOwnStory(own);
    if (own) fetchViewers(stories[currentIndex].id);
  }, [currentIndex, stories, currentUserId]);

  const fetchStories = async (userId: string) => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("stories")
      .select("id, media_url, media_type, created_at, user_id, users(username, avatar_url)")
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

  const fetchViewers = async (storyId: string) => {
    const { data } = await supabase
      .from("story_views")
      .select("viewer_id, users(username, avatar_url)")
      .eq("story_id", storyId);
    if (data) {
      const normalized: Viewer[] = (data as any[]).map((row) => ({
        viewer_id: row.viewer_id,
        users: Array.isArray(row.users) ? row.users[0] ?? null : row.users,
      }));
      setViewers(normalized);
    }
  };

  // ── BUG FIX: markAsViewed now safely handles unauthenticated state ────────
  const markAsViewed = async (storyId: string) => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return; // was crashing when user is null
    await supabase
      .from("story_views")
      .upsert({ story_id: storyId, viewer_id: data.user.id });
  };

  const startProgress = useCallback(
    (duration: number) => {
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
    },
    [currentIndex, stories]
  );

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) setCurrentIndex((p) => p + 1);
    else router.back();
  }, [currentIndex, stories]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((p) => p - 1);
  }, [currentIndex]);

  // ── Swipe-down-to-dismiss ─────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && g.dy > 0,
      onPanResponderGrant: () => {
        setPaused(true);
        progressAnimation.current?.stop();
      },
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) containerY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) {
          Animated.timing(containerY, {
            toValue: SH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => router.back());
        } else {
          Animated.spring(containerY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
          }).start(() => setPaused(false));
        }
      },
    })
  ).current;

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#FFB800" size="large" />
      </View>
    );
  }

  if (!stories.length) {
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#000" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View
        style={[styles.container, { transform: [{ translateY: containerY }] }]}
        {...panResponder.panHandlers}
      >
        {/* ── Media ── */}
        <TouchableWithoutFeedback
          onLongPress={() => {
            setPaused(true);
            progressAnimation.current?.stop();
          }}
          onPressOut={() => {
            if (!keyboardOpen) {
              setPaused(false);
              startProgress(
                current.media_type === "video" ? VIDEO_DURATION : IMAGE_DURATION
              );
            }
          }}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: mediaFade }]}>
            {current.media_type === "video" ? (
              <StoryVideo
                uri={current.media_url}
                paused={paused}
                muted={muted}
                onFinish={goNext}
              />
            ) : (
              <Image
                source={{ uri: current.media_url }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            )}
            {/* Gradient overlay top+bottom */}
            <View style={styles.gradientTop} />
            <View style={styles.gradientBottom} />
          </Animated.View>
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

          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {/* Mute toggle for video */}
            {current.media_type === "video" && (
              <TouchableOpacity
                onPress={() => setMuted((m) => !m)}
                style={styles.iconBtn}
              >
                <Text style={{ color: "#fff", fontSize: 16 }}>
                  {muted ? "🔇" : "🔊"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tap zones ── */}
        <View style={styles.tapRow} pointerEvents="box-none">
          <TouchableOpacity style={styles.tapZone} onPress={goPrev} />
          <TouchableOpacity style={styles.tapZone} onPress={goNext} />
        </View>

        {/* ── Bottom bar ── */}
        {isOwnStory ? (
          // Own story: show viewers
          <TouchableOpacity
            style={styles.viewerBar}
            onPress={() => {
              setPaused(true);
              progressAnimation.current?.stop();
              setShowViewers(true);
            }}
          >
            <Text style={{ fontSize: 18 }}>👁</Text>
            <Text style={styles.viewerBarText}>
              {viewers.length} {viewers.length === 1 ? "view" : "views"}
            </Text>
            <Text style={styles.viewerBarChevron}>›</Text>
          </TouchableOpacity>
        ) : (
          // Friend's story: reply bar
          !keyboardOpen ? (
            <TouchableOpacity
              style={styles.replyBarStub}
              onPress={() => {
                setPaused(true);
                progressAnimation.current?.stop();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.replyBarPlaceholder}>
                Reply to {user?.username ?? "Story"}…
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.replyBarActive}>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder={`Reply to ${user?.username ?? "Story"}…`}
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.replyInput}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={() => {
                  setReplyText("");
                  Keyboard.dismiss();
                }}
              />
              <TouchableOpacity style={styles.sendBtn}>
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </Animated.View>

      {/* ── Viewers modal ── */}
      <ViewersModal
        visible={showViewers}
        viewers={viewers}
        onClose={() => {
          setShowViewers(false);
          setPaused(false);
          startProgress(
            current.media_type === "video" ? VIDEO_DURATION : IMAGE_DURATION
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: { color: "#fff", fontFamily: "Outfit_400Regular", fontSize: 16 },
  backBtn: {
    backgroundColor: "#FFB800",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 50,
  },
  backBtnText: { fontFamily: "Outfit_700Bold", color: "#000", fontSize: 14 },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: "rgba(0,0,0,0.35)",
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
    backgroundColor: "rgba(255,255,255,0.30)",
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
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFB800",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFB800",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#000" },
  username: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#fff" },
  timeAgo: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 18,
  },
  closeText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  tapRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
    flexDirection: "row",
    zIndex: 10,
  },
  tapZone: { flex: 1 },
  // Reply bar (stub — tappable placeholder)
  replyBarStub: {
    position: "absolute",
    bottom: 32,
    left: 16,
    right: 16,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    paddingHorizontal: 20,
    alignItems: "flex-start",
    justifyContent: "center",
    zIndex: 20,
  },
  replyBarPlaceholder: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  // Reply bar (active — input visible)
  replyBarActive: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 20,
  },
  replyInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 20,
    color: "#fff",
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sendBtn: {
    backgroundColor: "#FFB800",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  sendBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: "#000",
  },
  // Viewer bar (own stories)
  viewerBar: {
    position: "absolute",
    bottom: 32,
    left: 16,
    right: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
    zIndex: 20,
  },
  viewerBarText: {
    flex: 1,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  viewerBarChevron: {
    fontSize: 22,
    color: "rgba(255,255,255,0.5)",
  },
});