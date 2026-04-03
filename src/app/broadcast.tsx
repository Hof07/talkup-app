// ─── app/broadcast.tsx ───────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import {
  BadgeCheck,
  Image as ImageIcon,
  LogOut,
  Megaphone,
  MessageSquare,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
// import Colors from "../constants/colors";
// import {
//   broadcastMessage,
//   fetchBroadcastHistory,
//   fetchStats,
//   uploadBroadcastImage,
// } from "../api";
// import { formatTime } from "../utils";
import {
  broadcastMessage,
  fetchBroadcastHistory,
  fetchStats,
  uploadBroadcastImage,
} from "./home_compo/api";
import { formatTime } from "./home_compo/utils";
import Colors from "./constants/colors";

type Status = "idle" | "uploading" | "sending" | "done" | "error";

export default function BroadcastScreen() {
  const [message, setMessage] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ sent: 0, total: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalUsers: 0,
    broadcastsSent: 0,
  });
  const [session, setSession] = useState<any>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const sessionStr = await AsyncStorage.getItem("userSession");
      if (!sessionStr) return;
      const s = JSON.parse(sessionStr);
      setSession(s);

      const [statsData, hist] = await Promise.all([
        fetchStats(s.access_token),
        fetchBroadcastHistory(s.access_token),
      ]);

      setStats(statsData);
      setHistory(hist);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // ── Pick image from gallery ───────────────────────────────────────────────

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Permission required to access photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ── Broadcast ─────────────────────────────────────────────────────────────

  const handleBroadcast = async () => {
    if ((!message.trim() && !imageUri) || status === "sending") return;

    try {
      let uploadedUrl: string | null = null;

      // Step 1: upload image first if selected
      if (imageUri) {
        setStatus("uploading");
        uploadedUrl = await uploadBroadcastImage(
          imageUri,
          session.access_token,
        );
      }

      // Step 2: broadcast to all users
      setStatus("sending");
      setProgress({ sent: 0, total: 0 });

      await broadcastMessage(
        message.trim(),
        session.access_token,
        uploadedUrl,
        (sent, total) => setProgress({ sent, total }),
      );

      setStatus("done");
      setMessage("");
      setImageUri(null);
      loadData();
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      console.error(e);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userSession");
    router.replace("/signin");
  };

  const formatHistoryTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 86_400_000;
    if (diff < 1) return formatTime(iso);
    if (diff < 2) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const isSending = status === "sending" || status === "uploading";
  const canSend = (message.trim().length > 0 || !!imageUri) && !isSending;

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ── */}
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Megaphone size={22} color={Colors.black} />
          </View>
          <View>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName}>TalkUp</Text>
              <BadgeCheck
                size={14}
                color={Colors.primary}
                fill={Colors.primary}
              />
            </View>
            <Text style={styles.headerSub}>Broadcast Dashboard</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={Colors.neutral500} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats cards ── */}
        <Animated.View
          style={[
            styles.statsRow,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Total users */}
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: "rgba(255,214,0,0.15)" },
              ]}
            >
              <Users size={18} color={Colors.primary} />
            </View>
            <Text style={styles.statNumber}>
              {stats.totalUsers.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total users</Text>
          </View>

          {/* Total messages in DB */}
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: "rgba(76,175,125,0.15)" },
              ]}
            >
              <MessageSquare size={18} color={Colors.green} />
            </View>
            <Text style={styles.statNumber}>
              {stats.totalMessages.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total msgs in DB</Text>
          </View>

          {/* Broadcasts sent */}
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: "rgba(99,130,255,0.15)" },
              ]}
            >
              <Megaphone size={18} color="#6382FF" />
            </View>
            <Text style={styles.statNumber}>
              {stats.broadcastsSent.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Msgs delivered</Text>
          </View>
        </Animated.View>

        {/* ── Compose card ── */}
        <Animated.View
          style={[
            styles.composeCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.composeLabel}>New broadcast</Text>
          <Text style={styles.composeSub}>
            Sends to all {stats.totalUsers} users instantly
          </Text>

          {/* Image preview */}
          {imageUri && (
            <View style={styles.imagePreviewWrap}>
              <Image
                source={{ uri: imageUri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImageUri(null)}
              >
                <X size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Text input */}
          <TextInput
            style={styles.input}
            placeholder={
              imageUri
                ? "Add a caption... (optional)"
                : "Write your announcement..."
            }
            placeholderTextColor={Colors.neutral400}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          {/* Input toolbar */}
          <View style={styles.inputToolbar}>
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              <ImageIcon
                size={20}
                color={imageUri ? Colors.primary : Colors.neutral400}
              />
              <Text
                style={[
                  styles.toolbarBtnText,
                  imageUri && { color: Colors.primary },
                ]}
              >
                {imageUri ? "Change photo" : "Add photo"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.charCount}>{message.length}/500</Text>
          </View>

          {/* Progress bar */}
          {isSending && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                {status === "uploading" ? (
                  <Animated.View
                    style={[styles.progressFill, { width: "30%" }]}
                  />
                ) : progress.total > 0 ? (
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(progress.sent / progress.total) * 100}%` },
                    ]}
                  />
                ) : null}
              </View>
              <Text style={styles.progressText}>
                {status === "uploading"
                  ? "Uploading image..."
                  : `Sending... ${progress.sent}/${progress.total}`}
              </Text>
            </View>
          )}

          {/* Status */}
          {status === "done" && (
            <Text style={styles.statusDone}>
              ✓ Sent to all {progress.total} users!
            </Text>
          )}
          {status === "error" && (
            <Text style={styles.statusError}>
              Something went wrong. Try again.
            </Text>
          )}

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleBroadcast}
            activeOpacity={0.8}
            disabled={!canSend}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.black} />
            ) : (
              <>
                <Send size={18} color={Colors.black} />
                <Text style={styles.sendBtnText}>
                  Broadcast to {stats.totalUsers} users
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ── Broadcast history ── */}
        {history.length > 0 && (
          <Animated.View style={[styles.historySection, { opacity: fadeAnim }]}>
            <Text style={styles.historyTitle}>
              Previous broadcasts ({history.length})
            </Text>

            {history.map((item, index) => (
              <View key={item.id ?? index} style={styles.historyItem}>
                <View style={styles.historyDot} />
                <View style={styles.historyContent}>
                  {/* Image thumbnail in history */}
                  {item.imageUrl && (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.historyImage}
                      resizeMode="cover"
                    />
                  )}
                  {item.content ? (
                    <Text style={styles.historyMessage}>{item.content}</Text>
                  ) : null}
                  <Text style={styles.historyTime}>
                    {formatHistoryTime(item.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral200,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  headerName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
    marginTop: 1,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    gap: 20,
    paddingBottom: 60,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.neutral100,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statNumber: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: Colors.text,
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 10,
    color: Colors.neutral400,
    textAlign: "center",
  },

  // ── Compose ──
  composeCard: {
    backgroundColor: Colors.neutral100,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  composeLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  composeSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.neutral400,
    marginTop: -8,
  },

  // ── Image preview ──
  imagePreviewWrap: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Input ──
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text,
    minHeight: 100,
    borderWidth: 1.5,
    borderColor: Colors.neutral200,
  },
  inputToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -6,
  },
  toolbarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  toolbarBtnText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.neutral400,
  },
  charCount: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.neutral400,
  },

  // ── Progress ──
  progressWrap: { gap: 6 },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.neutral200,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral500,
    textAlign: "center",
  },

  // ── Status ──
  statusDone: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.green,
    textAlign: "center",
  },
  statusError: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: "#E05252",
    textAlign: "center",
  },

  // ── Send button ──
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.black,
  },

  // ── History ──
  historySection: { gap: 14 },
  historyTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.text,
  },
  historyItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 8,
    flexShrink: 0,
  },
  historyContent: {
    flex: 1,
    backgroundColor: Colors.neutral100,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  historyImage: {
    width: "100%",
    height: 140,
    borderRadius: 10,
  },
  historyMessage: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  historyTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.neutral400,
  },
});
