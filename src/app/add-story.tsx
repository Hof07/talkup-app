// ─── app/add-story.tsx ────────────────────────────────────────────────────────
// Add story — pick image or video, preview, upload to Supabase storage
import React, { useState } from "react";
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
import { supabase } from "@/lib/supabase";

// ─── Video preview sub-component ─────────────────────────────────────────────
function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.preview}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AddStory() {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState<boolean>(false);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  // ── Pick image or video from gallery ─────────────────────────────────────
  const pickMedia = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
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

  // ── Upload to Supabase ────────────────────────────────────────────────────
  const uploadStory = async (): Promise<void> => {
    if (!mediaUri) return;
    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const ext = mediaType === "video" ? "mp4" : "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const mimeType = mediaType === "video" ? "video/mp4" : "image/jpeg";

      // ✅ FormData approach — works with local file:// URIs in React Native
      const formData = new FormData();
      formData.append("file", {
        uri: mediaUri,
        type: mimeType,
        name: `story.${ext}`,
      } as any);

      // Upload to stories bucket
      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(path, formData, { contentType: mimeType });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("stories").getPublicUrl(path);

      // Save record to stories table
      const { error: dbError } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: publicUrl,
        media_type: mediaType,
        // expires_at is auto-set to now() + 24h by DB default
      });

      if (dbError) throw dbError;

      Alert.alert("Story posted! 🎉", "Your story is live for 24 hours.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      Alert.alert("Upload failed", message);
    } finally {
      setUploading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Story</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Preview or empty pick area ── */}
      {mediaUri ? (
        <View style={styles.previewBox}>
          {mediaType === "video" ? (
            <VideoPreview uri={mediaUri} />
          ) : (
            <Image
              source={{ uri: mediaUri }}
              style={styles.preview}
              resizeMode="cover"
            />
          )}

          {/* Change button overlay */}
          <TouchableOpacity style={styles.changeBtn} onPress={pickMedia}>
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>

          {/* Media type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {mediaType === "video" ? "🎬 Video" : "🖼 Photo"}
            </Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.pickArea}
          onPress={pickMedia}
          activeOpacity={0.7}
        >
          <Text style={styles.pickIcon}>📷</Text>
          <Text style={styles.pickTitle}>Choose Photo or Video</Text>
          <Text style={styles.pickSub}>
            Max 30 seconds for video • Max 50 MB
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Action button ── */}
      {mediaUri ? (
        <TouchableOpacity
          style={[styles.actionBtn, uploading && styles.actionBtnDisabled]}
          onPress={uploadStory}
          disabled={uploading}
          activeOpacity={0.85}
        >
          {uploading ? (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <ActivityIndicator color="#000" size="small" />
              <Text style={styles.actionBtnText}>Uploading...</Text>
            </View>
          ) : (
            <Text style={styles.actionBtnText}>Post Story</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={pickMedia}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>Select Media</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
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
  closeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: "#fff",
  },
  previewBox: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
  },
  preview: {
    width: "100%",
    height: "100%",
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
    borderWidth: 2,
    borderColor: "#2A2A2A",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  pickIcon: { fontSize: 56 },
  pickTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: "#fff",
  },
  pickSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
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
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#000",
  },
});