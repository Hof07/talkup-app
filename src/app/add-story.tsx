// ─── app/add-story.tsx ────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
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

// ── Restores the Supabase auth session from AsyncStorage ──────────────────────
// Without this, auth.uid() is null in RLS policies even though the user is
// "logged in" via our custom AsyncStorage session.
async function restoreSupabaseSession(): Promise<string | null> {
  try {
    const sessionStr = await AsyncStorage.getItem("userSession");
    if (!sessionStr) return null;

    const session = JSON.parse(sessionStr);

    // Set the session on the Supabase client so auth.uid() works in RLS
    if (session?.access_token && session?.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) {
        console.warn("Failed to restore Supabase session:", error.message);
        return null;
      }
    }

    return session?.user?.id ?? null;
  } catch (e) {
    console.warn("restoreSupabaseSession error:", e);
    return null;
  }
}

export default function AddStory() {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  // ── Load & restore session on mount ──────────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Restore session → this makes auth.uid() work for RLS
        const uid = await restoreSupabaseSession();
        if (uid) {
          setUserId(uid);
          return;
        }

        // Fallback: check if Supabase already has an active session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          setUserId(sessionData.session.user.id);
        }
      } finally {
        setAuthLoading(false);
      }
    };
    loadUser();
  }, []);

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

  // ── Upload ────────────────────────────────────────────────────────────────
  const uploadStory = async () => {
    if (!mediaUri) return;

    setUploading(true);
    try {
      // Re-restore session right before upload as a safety net
      // (token could have been cleared between mount and button press)
      const freshUid = await restoreSupabaseSession();
      const activeUserId = freshUid ?? userId;

      if (!activeUserId) {
        Alert.alert("Not logged in", "You need to be logged in to post a story.");
        return;
      }

      const ext = mediaType === "video" ? "mp4" : "jpg";
      const path = `${activeUserId}/${Date.now()}.${ext}`;
      const mimeType = mediaType === "video" ? "video/mp4" : "image/jpeg";

      const formData = new FormData();
      formData.append("file", {
        uri: mediaUri,
        type: mimeType,
        name: `story.${ext}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(path, formData, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("stories").getPublicUrl(path);

      const { error: dbError } = await supabase.from("stories").insert({
        user_id: activeUserId,
        media_url: publicUrl,
        media_type: mediaType,
      });
      if (dbError) throw dbError;

      Alert.alert("Story posted! 🎉", "Your story is live for 24 hours.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setUploading(false);
    }
  };

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

      {/* Preview / Pick area */}
      {mediaUri ? (
        <View style={styles.previewBox}>
          {mediaType === "video" ? (
            <VideoPreview uri={mediaUri} />
          ) : (
            <Image
              source={{ uri: mediaUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
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
          <TouchableOpacity
            style={styles.pickOption}
            onPress={openCamera}
            activeOpacity={0.7}
          >
            <Text style={styles.pickOptionIcon}>📷</Text>
            <Text style={styles.pickOptionTitle}>Camera</Text>
            <Text style={styles.pickOptionSub}>Take a photo or video</Text>
          </TouchableOpacity>

          <View style={styles.pickDivider}>
            <View style={styles.pickDividerLine} />
            <Text style={styles.pickDividerText}>or</Text>
            <View style={styles.pickDividerLine} />
          </View>

          <TouchableOpacity
            style={styles.pickOption}
            onPress={openGallery}
            activeOpacity={0.7}
          >
            <Text style={styles.pickOptionIcon}>🖼</Text>
            <Text style={styles.pickOptionTitle}>Gallery</Text>
            <Text style={styles.pickOptionSub}>Max 30s video • Max 50 MB</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action button */}
      {mediaUri ? (
        <TouchableOpacity
          style={[
            styles.actionBtn,
            (uploading || authLoading) && styles.actionBtnDisabled,
          ]}
          onPress={uploadStory}
          disabled={uploading || authLoading}
          activeOpacity={0.85}
        >
          {uploading ? (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <ActivityIndicator color="#000" size="small" />
              <Text style={styles.actionBtnText}>Uploading…</Text>
            </View>
          ) : authLoading ? (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <ActivityIndicator color="#000" size="small" />
              <Text style={styles.actionBtnText}>Loading…</Text>
            </View>
          ) : (
            <Text style={styles.actionBtnText}>Post Story</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={openGallery}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>Select from Gallery</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  closeText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  title: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#fff" },
  previewBox: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
  },
  changeBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  changeBtnText: {
    fontFamily: "Outfit_600SemiBold",
    color: "#fff",
    fontSize: 13,
  },
  typeBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  typeBadgeText: {
    fontFamily: "Outfit_600SemiBold",
    color: "#fff",
    fontSize: 12,
  },
  pickArea: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: "#1A1A1A",
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
    justifyContent: "center",
    overflow: "hidden",
  },
  pickOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pickOptionIcon: { fontSize: 44 },
  pickOptionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: "#fff",
  },
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
    paddingHorizontal: 32,
    gap: 12,
    paddingVertical: 8,
  },
  pickDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  pickDividerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },
  actionBtn: {
    marginHorizontal: 20,
    marginBottom: 44,
    backgroundColor: "#FFB800",
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#000",
  },
});