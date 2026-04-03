// ─── screens/TalkUpScreen.tsx ─────────────────────────────────────────────────
//
// The TalkUp announcements feed — like WhatsApp Channels or Instagram Broadcast.
// Posts are read-only. Users cannot reply.
// Place this at app/talkup.tsx in your Expo Router project.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, BadgeCheck, Megaphone, Pin } from "lucide-react-native";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";

import Colors from "../constants/colors";
import { TalkUpPost } from "../home_compo/types";
import { fetchTalkUpPosts, markAllPostsRead } from "../home_compo/talkupApi";
// import {
//   fetchTalkUpPosts,
//   markAllPostsRead,
// } from "../talkupApi";
// import { TalkUpPost } from "../types";

export default function TalkUpScreen() {
  const [posts,      setPosts]      = useState<TalkUpPost[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [session,    setSession]    = useState<any>(null);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  const loadPosts = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem("userSession");
      if (!sessionStr) return;
      const s = JSON.parse(sessionStr);
      setSession(s);

      const data = await fetchTalkUpPosts(s.access_token);
      setPosts(data);

      // Mark all as read when user opens the screen
      await markAllPostsRead(s.user.id, s.access_token);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPosts(); }, [loadPosts]));

  const formatPostTime = (iso: string) => {
    const d    = new Date(iso);
    const now  = new Date();
    const diff = (now.getTime() - d.getTime()) / 3_600_000;
    if (diff < 1) return "Just now";
    if (diff < 24) {
      let h    = d.getHours();
      const m  = d.getMinutes().toString().padStart(2, "0");
      const ap = h >= 12 ? "pm" : "am";
      h = h % 12 || 12;
      return `${h}:${m} ${ap}`;
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const renderPost = ({ item }: { item: TalkUpPost }) => (
    <View style={[styles.postCard, item.is_pinned && styles.postCardPinned]}>
      {item.is_pinned && (
        <View style={styles.pinnedRow}>
          <Pin size={12} color={Colors.primary} />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}
      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postBody}>{item.body}</Text>
      <Text style={styles.postTime}>{formatPostTime(item.created_at)}</Text>
    </View>
  );

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Megaphone size={20} color={Colors.black} />
          </View>
          <View>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName}>TalkUp</Text>
              <BadgeCheck size={14} color={Colors.primary} fill={Colors.primary} />
            </View>
            <Text style={styles.headerSub}>Official announcements</Text>
          </View>
        </View>
      </View>

      {/* ── Read-only notice ── */}
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          📢 This is an official channel. Only TalkUp can post here.
        </Text>
      </View>

      {/* ── Posts feed ── */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Megaphone size={48} color={Colors.neutral300} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySub}>Check back soon for updates</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPosts(true)}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
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
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral200,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 17,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
    marginTop: 1,
  },

  // ── Read-only notice ──
  notice: {
    backgroundColor: Colors.neutral100,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  noticeText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral500,
    textAlign: "center",
  },

  // ── Post cards ──
  listContent: {
    padding: 20,
    gap: 14,
  },
  postCard: {
    backgroundColor: Colors.neutral100,
    borderRadius: 18,
    padding: 18,
    gap: 8,
    marginBottom: 14,
  },
  postCardPinned: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.neutral100,
  },
  pinnedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  pinnedText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  postImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  postTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
  },
  postBody: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.neutral600,
    lineHeight: 21,
  },
  postTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.neutral400,
    marginTop: 4,
  },

  // ── Empty ──
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.neutral400,
  },
});