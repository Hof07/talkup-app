// ─── app/add-story.tsx ────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
type Story = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  is_hidden: boolean;
  created_at: string;
};

// ─── VideoPreview ─────────────────────────────────────────────────────────────
function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

// ─── Restore Supabase session ─────────────────────────────────────────────────
async function restoreSupabaseSession(): Promise<string | null> {
  try {
    const sessionStr = await AsyncStorage.getItem("userSession");
    if (!sessionStr) return null;
    const session = JSON.parse(sessionStr);
    if (session?.access_token && session?.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) return null;
    }
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Story Action Sheet ───────────────────────────────────────────────────────
type ActionSheetProps = {
  visible: boolean;
  story: Story | null;
  onClose: () => void;
  onDelete: (story: Story) => void;
  onToggleHide: (story: Story) => void;
};

function StoryActionSheet({
  visible,
  story,
  onClose,
  onDelete,
  onToggleHide,
}: ActionSheetProps) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!story) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.sheetOverlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* Thumbnail preview row */}
        <View style={styles.sheetPreview}>
          <Image
            source={{ uri: story.media_url }}
            style={styles.sheetThumb}
            resizeMode="cover"
          />
          <View style={styles.sheetPreviewInfo}>
            <Text style={styles.sheetPreviewType}>
              {story.media_type === "video" ? "🎬 Video story" : "🖼 Photo story"}
            </Text>
            <Text style={styles.sheetPreviewDate}>
              {new Date(story.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {story.is_hidden && (
              <View style={styles.hiddenPill}>
                <Text style={styles.hiddenPillText}>Hidden</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sheetDivider} />

        {/* Hide / Unhide */}
        <TouchableOpacity
          style={styles.sheetAction}
          onPress={() => onToggleHide(story)}
          activeOpacity={0.7}
        >
          <View style={[styles.sheetActionIcon, { backgroundColor: "#1A2233" }]}>
            <Text style={styles.sheetActionEmoji}>{story.is_hidden ? "👁" : "🙈"}</Text>
          </View>
          <View style={styles.sheetActionTexts}>
            <Text style={styles.sheetActionTitle}>
              {story.is_hidden ? "Unhide Story" : "Hide Story"}
            </Text>
            <Text style={styles.sheetActionSub}>
              {story.is_hidden
                ? "Make this story visible to everyone"
                : "Only you will be able to see this"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          style={styles.sheetAction}
          onPress={() => onDelete(story)}
          activeOpacity={0.7}
        >
          <View style={[styles.sheetActionIcon, { backgroundColor: "#2A1A1A" }]}>
            <Text style={styles.sheetActionEmoji}>🗑</Text>
          </View>
          <View style={styles.sheetActionTexts}>
            <Text style={[styles.sheetActionTitle, { color: "#FF4444" }]}>Delete Story</Text>
            <Text style={styles.sheetActionSub}>Permanently removes this story</Text>
          </View>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity style={styles.sheetCancel} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.sheetCancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddStory() {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // My stories — lifted into parent so we can refresh without hacks
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  // Action sheet
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  // ── Fetch my stories ──────────────────────────────────────────────────────
  const fetchMyStories = useCallback(async (uid: string) => {
    setStoriesLoading(true);
    const { data, error } = await supabase
      .from("stories")
      .select("id, media_url, media_type, is_hidden, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (!error && data) setMyStories(data as Story[]);
    setStoriesLoading(false);
  }, []);

  // ── Load user + session on mount ──────────────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      try {
        const uid = await restoreSupabaseSession();
        if (uid) {
          setUserId(uid);
          fetchMyStories(uid);
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const id = sessionData.session.user.id;
          setUserId(id);
          fetchMyStories(id);
        }
      } finally {
        setAuthLoading(false);
      }
    };
    loadUser();
  }, [fetchMyStories]);

  // ── Gallery picker ────────────────────────────────────────────────────────
  const openGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow access to your gallery.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      videoMaxDuration: 30,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaType(asset.type === "video" ? "video" : "image");
    }
  };

  // ── Camera picker ─────────────────────────────────────────────────────────
  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow access to your camera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      videoMaxDuration: 30,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaType(asset.type === "video" ? "video" : "image");
    }
  };

  // ── Upload story ──────────────────────────────────────────────────────────
  const uploadStory = async () => {
    if (!mediaUri) return;
    setUploading(true);
    try {
      const freshUid = await restoreSupabaseSession();
      const activeUserId = freshUid ?? userId;
      if (!activeUserId) {
        Alert.alert("Not logged in", "Please log in first.");
        return;
      }

      const ext = mediaType === "video" ? "mp4" : "jpg";
      const path = `${activeUserId}/${Date.now()}.${ext}`;
      const mimeType = mediaType === "video" ? "video/mp4" : "image/jpeg";

      const formData = new FormData();
      formData.append("file", { uri: mediaUri, type: mimeType, name: `story.${ext}` } as any);

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(path, formData, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("stories").getPublicUrl(path);

      const { error: dbError } = await supabase.from("stories").insert({
        user_id: activeUserId,
        media_url: publicUrl,
        media_type: mediaType,
        is_hidden: false,
      });
      if (dbError) throw dbError;

      setMediaUri(null);
      fetchMyStories(activeUserId);

      Alert.alert("Story posted! 🎉", "Your story is live for 24 hours.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  // ── Delete story ──────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (story: Story) => {
      setSheetVisible(false);
      setTimeout(() => {
        Alert.alert(
          "Delete Story",
          "This will permanently remove your story. This cannot be undone.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  const uid = await restoreSupabaseSession();
                  const activeUid = uid ?? userId;

                  // Extract storage path from public URL
                  const urlObj = new URL(story.media_url);
                  const storagePath = urlObj.pathname.split("/stories/")[1];
                  if (storagePath) {
                    await supabase.storage.from("stories").remove([storagePath]);
                  }

                  const { error } = await supabase
                    .from("stories")
                    .delete()
                    .eq("id", story.id);
                  if (error) throw error;

                  if (activeUid) fetchMyStories(activeUid);
                } catch (err) {
                  Alert.alert("Error", err instanceof Error ? err.message : "Could not delete.");
                }
              },
            },
          ]
        );
      }, 350);
    },
    [userId, fetchMyStories]
  );

  // ── Hide / Unhide story ───────────────────────────────────────────────────
  const handleToggleHide = useCallback(
    async (story: Story) => {
      setSheetVisible(false);
      try {
        await restoreSupabaseSession();
        const { error } = await supabase
          .from("stories")
          .update({ is_hidden: !story.is_hidden })
          .eq("id", story.id);
        if (error) throw error;
        if (userId) fetchMyStories(userId);
      } catch (err) {
        Alert.alert("Error", err instanceof Error ? err.message : "Could not update story.");
      }
    },
    [userId, fetchMyStories]
  );

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Story</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* My Stories strip */}
      {!authLoading && myStories.length > 0 && (
        <View style={styles.storiesSection}>
          <Text style={styles.storiesSectionTitle}>My Stories</Text>
          {storiesLoading ? (
            <View style={styles.storiesLoading}>
              <ActivityIndicator color="#FFB800" size="small" />
            </View>
          ) : (
            <FlatList
              data={myStories}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedStory(item);
                    setSheetVisible(true);
                  }}
                  activeOpacity={0.8}
                  style={styles.storyThumbWrap}
                >
                  <Image
                    source={{ uri: item.media_url }}
                    style={styles.storyThumb}
                    resizeMode="cover"
                  />
                  {item.is_hidden && <View style={styles.storyThumbDim} />}
                  {item.is_hidden && (
                    <View style={styles.storyHiddenBadge}>
                      <Text style={styles.storyHiddenBadgeText}>Hidden</Text>
                    </View>
                  )}
                  {item.media_type === "video" && (
                    <View style={styles.storyVideoBadge}>
                      <Text style={styles.storyVideoBadgeText}>▶</Text>
                    </View>
                  )}
                  <View style={styles.storyDotsBadge}>
                    <Text style={styles.storyDotsBadgeText}>⋯</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Preview / Pick area */}
      {mediaUri ? (
        <View style={styles.previewBox}>
          {mediaType === "video" ? (
            <VideoPreview uri={mediaUri} />
          ) : (
            <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          <TouchableOpacity style={styles.changeBtn} onPress={openGallery}>
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {mediaType === "video" ? "🎬 Video" : "🖼 Photo"}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.pickArea}>
          <TouchableOpacity style={styles.pickOption} onPress={openCamera} activeOpacity={0.7}>
            <Text style={styles.pickOptionIcon}>📷</Text>
            <Text style={styles.pickOptionTitle}>Camera</Text>
            <Text style={styles.pickOptionSub}>Take a photo or video</Text>
          </TouchableOpacity>
          <View style={styles.pickDivider}>
            <View style={styles.pickDividerLine} />
            <Text style={styles.pickDividerText}>or</Text>
            <View style={styles.pickDividerLine} />
          </View>
          <TouchableOpacity style={styles.pickOption} onPress={openGallery} activeOpacity={0.7}>
            <Text style={styles.pickOptionIcon}>🖼</Text>
            <Text style={styles.pickOptionTitle}>Gallery</Text>
            <Text style={styles.pickOptionSub}>Max 30s video • Max 50 MB</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action button */}
      {mediaUri ? (
        <TouchableOpacity
          style={[styles.actionBtn, (uploading || authLoading) && styles.actionBtnDisabled]}
          onPress={uploadStory}
          disabled={uploading || authLoading}
          activeOpacity={0.85}
        >
          {uploading || authLoading ? (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <ActivityIndicator color="#000" size="small" />
              <Text style={styles.actionBtnText}>{uploading ? "Uploading…" : "Loading…"}</Text>
            </View>
          ) : (
            <Text style={styles.actionBtnText}>Post Story</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.actionBtn} onPress={openGallery} activeOpacity={0.85}>
          <Text style={styles.actionBtnText}>Select from Gallery</Text>
        </TouchableOpacity>
      )}

      {/* Action Sheet */}
      <StoryActionSheet
        visible={sheetVisible}
        story={selectedStory}
        onClose={() => setSheetVisible(false)}
        onDelete={handleDelete}
        onToggleHide={handleToggleHide}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 40, height: 40,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  closeText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  title: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#fff" },

  storiesSection: { marginBottom: 12 },
  storiesSectionTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    paddingHorizontal: 20,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  storiesLoading: { height: 90, alignItems: "center", justifyContent: "center" },
  storyThumbWrap: {
    width: 72, height: 90,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
  },
  storyThumb: { width: "100%", height: "100%" },
  storyThumbDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  storyHiddenBadge: {
    position: "absolute", top: 5, left: 5,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 5,
  },
  storyHiddenBadgeText: {
    fontFamily: "Outfit_600SemiBold",
    color: "#bbb", fontSize: 8,
  },
  storyVideoBadge: {
    position: "absolute", bottom: 22, right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  storyVideoBadgeText: { color: "#fff", fontSize: 8 },
  storyDotsBadge: {
    position: "absolute", bottom: 4,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8, paddingVertical: 1,
    borderRadius: 8,
  },
  storyDotsBadgeText: { color: "#fff", fontSize: 12, letterSpacing: 2 },

  previewBox: {
    flex: 1,
    marginHorizontal: 20, marginBottom: 16,
    borderRadius: 24, overflow: "hidden",
    backgroundColor: "#1A1A1A",
  },
  changeBtn: {
    position: "absolute", bottom: 16, right: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  changeBtnText: { fontFamily: "Outfit_600SemiBold", color: "#fff", fontSize: 13 },
  typeBadge: {
    position: "absolute", top: 16, left: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 50,
  },
  typeBadgeText: { fontFamily: "Outfit_600SemiBold", color: "#fff", fontSize: 12 },

  pickArea: {
    flex: 1,
    marginHorizontal: 20, marginBottom: 16,
    borderRadius: 24,
    backgroundColor: "#1A1A1A",
    borderWidth: 1.5, borderColor: "#2A2A2A",
    justifyContent: "center",
    overflow: "hidden",
  },
  pickOption: {
    flex: 1,
    alignItems: "center", justifyContent: "center",
    gap: 8,
  },
  pickOptionIcon: { fontSize: 44 },
  pickOptionTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: "#fff" },
  pickOptionSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  pickDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32, gap: 12, paddingVertical: 8,
  },
  pickDividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  pickDividerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12, color: "rgba(255,255,255,0.3)",
  },

  actionBtn: {
    marginHorizontal: 20, marginBottom: 44,
    backgroundColor: "#FFB800",
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center", justifyContent: "center",
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#000" },

  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#141414",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 44,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sheetThumb: {
    width: 56, height: 72,
    borderRadius: 10,
    backgroundColor: "#222",
  },
  sheetPreviewInfo: { flex: 1, gap: 4 },
  sheetPreviewType: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#fff" },
  sheetPreviewDate: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "rgba(255,255,255,0.45)" },
  hiddenPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, marginTop: 4,
  },
  hiddenPillText: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.6)" },
  sheetDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginHorizontal: 20, marginBottom: 8,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetActionIcon: {
    width: 44, height: 44,
    borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  sheetActionEmoji: { fontSize: 20 },
  sheetActionTexts: { flex: 1, gap: 2 },
  sheetActionTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: "#fff" },
  sheetActionSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "rgba(255,255,255,0.4)" },
  sheetCancel: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  sheetCancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: "rgba(255,255,255,0.7)" },
});