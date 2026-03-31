import { forwardRef, useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_700Bold,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Settings, UserPlus, MessageCircle } from "lucide-react-native";
import Colors from "./constants/colors";
import { decryptMessage, generateChatKey } from "../lib/crypto";

const { width } = Dimensions.get("window");

type Tab = "dm" | "group";

interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
  last_seen?: string | null;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  sender: {
    username: string;
    avatar_url: string | null;
  };
}

const HomeScreen = forwardRef<View>((props, ref) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [tab, setTab] = useState<Tab>("dm");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      updateLastSeen();
    }, [])
  );

  // Update current user's last_seen when they open the app
  const updateLastSeen = async () => {
    try {
      const sessionStr = await AsyncStorage.getItem("userSession");
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr);

      await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${session.user?.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.access_token}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ last_seen: new Date().toISOString() }),
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const formatLastSeen = (isoString: string | null | undefined): string => {
    if (!isoString) return "last seen recently";

    const lastSeen = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `last seen ${diffMins}m ago`;
    if (diffHours < 24) return `last seen ${diffHours}h ago`;
    if (diffDays === 1) return "last seen yesterday";
    return `last seen ${diffDays}d ago`;
  };

  const isOnline = (isoString: string | null | undefined): boolean => {
    if (!isoString) return false;
    const lastSeen = new Date(isoString);
    const diffMs = new Date().getTime() - lastSeen.getTime();
    return diffMs < 120000; 
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const sessionStr = await AsyncStorage.getItem("userSession");
      if (!sessionStr) {
        router.replace("/signin");
        return;
      }

      const session = JSON.parse(sessionStr);
      setSessionData(session);
      const accessToken = session.access_token;
      const userId = session.user?.id;
      setCurrentUserId(userId);

      // Get current user profile
      const userRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const userData = await userRes.json();
      if (userData.length > 0) setCurrentUser(userData[0]);

      const pendingRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?receiver_id=eq.${userId}&status=eq.pending&select=id,sender_id`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const pendingData = await pendingRes.json();

      if (pendingData.length > 0) {
        const senderIds = pendingData.map((r: any) => r.sender_id);
        const sendersRes = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/users?id=in.(${senderIds.join(",")})&select=id,username,avatar_url`,
          {
            headers: {
              apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        const sendersData = await sendersRes.json();
        const requestsWithSender = pendingData.map((req: any) => ({
          ...req,
          sender: sendersData.find((s: any) => s.id === req.sender_id) || {},
        }));
        setPendingRequests(requestsWithSender);
      } else {
        setPendingRequests([]);
      }

      // Get accepted friendships
      const friendshipsRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?or=(and(sender_id.eq.${userId},status.eq.accepted),and(receiver_id.eq.${userId},status.eq.accepted))&select=sender_id,receiver_id`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const friendships = await friendshipsRes.json();

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        return;
      }

      const friendIds = friendships.map((f: any) =>
        f.sender_id === userId ? f.receiver_id : f.sender_id
      );

      // Get friend profiles WITH last_seen
      const friendsRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/users?id=in.(${friendIds.join(",")})&select=id,username,avatar_url,last_seen`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const friendsData = await friendsRes.json();

      // Get last message + unread for each friend
      const friendsWithMessages = await Promise.all(
        friendsData.map(async (friend: Friend) => {
          const msgRes = await fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/messages?or=(and(sender_id.eq.${userId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${userId}))&order=created_at.desc&limit=1&select=content,created_at`,
            {
              headers: {
                apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          const msgs = await msgRes.json();
          const lastMsg = msgs[0];

          const unreadRes = await fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/messages?sender_id=eq.${friend.id}&receiver_id=eq.${userId}&is_read=eq.false&select=id`,
            {
              headers: {
                apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          const unread = await unreadRes.json();

          let decryptedLastMsg = "";
          if (lastMsg?.content) {
            const chatKey = generateChatKey(userId, friend.id);
            decryptedLastMsg = decryptMessage(lastMsg.content, chatKey);
          }

          return {
            ...friend,
            last_message: decryptedLastMsg,
            last_message_time: lastMsg?.created_at
              ? formatTime(lastMsg.created_at)
              : "",
            unread_count: unread?.length || 0,
          };
        })
      );

      // Sort by latest message
      friendsWithMessages.sort((a, b) => {
        if (!a.last_message_time) return 1;
        if (!b.last_message_time) return -1;
        return 0;
      });

      setFriends(friendsWithMessages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    try {
      const accessToken = sessionData?.access_token;
      await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?id=eq.${requestId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            status: "accepted",
            updated_at: new Date().toISOString(),
          }),
        }
      );
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const accessToken = sessionData?.access_token;
      await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?id=eq.${requestId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            status: "rejected",
            updated_at: new Date().toISOString(),
          }),
        }
      );
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const renderPendingRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestRow}>
      <View style={styles.requestAvatar}>
        {item.sender?.avatar_url ? (
          <Image source={{ uri: item.sender.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {item.sender?.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestUsername}>{item.sender?.username}</Text>
        <Text style={styles.requestLabel}>wants to be your friend</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => handleAcceptRequest(item.id, item.sender_id)}
        >
          <Text style={styles.acceptBtnText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => handleRejectRequest(item.id)}
        >
          <Text style={styles.rejectBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriend = ({ item }: { item: Friend }) => {
    const online = isOnline(item.last_seen);

    return (
      <TouchableOpacity
        style={styles.friendRow}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/chat/[id]",
            params: {
              id: item.id,
              username: item.username,
              avatar_url: item.avatar_url || "",
            },
          })
        }
      >
        <View style={styles.avatarWrapper}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {item.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {/* Online/offline dot */}
          <View
            style={[
              styles.onlineDot,
              { backgroundColor: online ? Colors.green : Colors.neutral400 },
            ]}
          />
        </View>

        <View style={styles.friendInfo}>
          <View style={styles.friendTopRow}>
            <Text style={styles.friendName}>{item.username}</Text>
            <Text style={styles.messageTime}>{item.last_message_time}</Text>
          </View>
          <View style={styles.friendBottomRow}>
            {/* Show last seen or last message */}
            {item.last_message ? (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.last_message}
              </Text>
            ) : (
              <Text style={[styles.lastMessage, { color: Colors.neutral400, fontStyle: "italic" }]}>
                {online ? "online" : formatLastSeen(item.last_seen)}
              </Text>
            )}
            {item.unread_count && item.unread_count > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) return null;

  return (
    <View ref={ref} style={styles.container}>
      {/* Header */}
      <ImageBackground
        source={require("../../assets/images/bgPattern.png")}
        style={styles.header}
        resizeMode="cover"
      >
        <View style={styles.headerOverlay} />
        <View style={styles.headerContent}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text style={styles.greetingSmall}>Welcome back 👋</Text>
            <Text style={styles.greeting}>
              {currentUser?.username || "there"}
            </Text>
          </Animated.View>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => router.push("/add-friends")}
              style={styles.iconBtn}
            >
              <UserPlus size={22} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/setting")}
              style={styles.iconBtn}
            >
              <Settings size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* Body */}
      <View style={styles.body}>
        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.sectionTitle}>
              Friend Requests ({pendingRequests.length})
            </Text>
            <FlatList
              data={pendingRequests}
              keyExtractor={(item) => item.id}
              renderItem={renderPendingRequest}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            <View style={styles.divider} />
          </Animated.View>
        )}

        {/* Tabs */}
        <Animated.View
          style={[
            styles.tabRow,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <TouchableOpacity
            style={[styles.tab, tab === "dm" && styles.tabActive]}
            onPress={() => setTab("dm")}
          >
            <Text style={[styles.tabText, tab === "dm" && styles.tabTextActive]}>
              Direct Message
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "group" && styles.tabActive]}
            onPress={() => setTab("group")}
          >
            <Text
              style={[styles.tabText, tab === "group" && styles.tabTextActive]}
            >
              Group
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Friends list */}
        {loading ? (
          <ActivityIndicator
            color={Colors.primary}
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : friends.length === 0 ? (
          <Animated.View
            style={[styles.emptyContainer, { opacity: fadeAnim }]}
          >
            <MessageCircle size={56} color={Colors.neutral300} />
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptySubtitle}>
              Add friends to start chatting
            </Text>
            <TouchableOpacity
              style={styles.addFriendBtn}
              onPress={() => router.push("/add-friends")}
            >
              <UserPlus size={16} color={Colors.black} />
              <Text style={styles.addFriendBtnText}>Add Friends</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={renderFriend}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadData(true)}
                tintColor={Colors.primary}
              />
            }
          />
        )}
      </View>
    </View>
  );
});

HomeScreen.displayName = "HomeScreen";

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 44,
    paddingHorizontal: 24,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetingSmall: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  greeting: {
    fontFamily: "Outfit_700Bold",
    fontSize: 26,
    color: Colors.white,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.neutral500,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  requestAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
  },
  requestInfo: { flex: 1 },
  requestUsername: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  requestLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnText: {
    fontSize: 16,
    color: Colors.black,
    fontWeight: "bold",
  },
  rejectBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtnText: {
    fontSize: 14,
    color: Colors.neutral500,
  },
  divider: {
    height: 8,
    backgroundColor: Colors.neutral100,
    marginVertical: 8,
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: Colors.neutral200,
    borderRadius: 50,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.neutral500,
  },
  tabTextActive: { color: Colors.black },
  listContent: { paddingHorizontal: 24 },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.neutral200,
  },
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: Colors.neutral600,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  friendInfo: { flex: 1 },
  friendTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  friendName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  messageTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
  },
  friendBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.neutral400,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.black,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.neutral400,
  },
  addFriendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    marginTop: 8,
  },
  addFriendBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.black,
  },
});