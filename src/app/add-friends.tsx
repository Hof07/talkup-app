import { forwardRef, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_700Bold,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserPlus, Check, Clock, ArrowLeft, Search, X, Users } from "lucide-react-native";
import Colors from "./constants/colors";

const { width } = Dimensions.get("window");

type Tab = "find" | "requests";

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  requestStatus?: "none" | "pending" | "accepted" | "rejected";
}

interface IncomingRequest {
  id: string;
  sender_id: string;
  sender: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

const AddFriends = forwardRef<View>((props, ref) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [tab, setTab] = useState<Tab>("find");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

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

    loadSession();
  }, []);

  const loadSession = async () => {
    const sessionStr = await AsyncStorage.getItem("userSession");
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    setCurrentUserId(session.user?.id);
    setAccessToken(session.access_token);
  };

  // Load incoming requests when tab changes to requests
  useEffect(() => {
    if (tab === "requests" && currentUserId && accessToken) {
      loadIncomingRequests();
    }
  }, [tab, currentUserId, accessToken]);

  // Search debounce
  useEffect(() => {
    if (!currentUserId || !accessToken) return;
    if (search.trim().length < 2) {
      setUsers([]);
      return;
    }

    const timeout = setTimeout(() => {
      searchUsers(search.trim());
    }, 500);

    return () => clearTimeout(timeout);
  }, [search, currentUserId, accessToken]);

  const loadIncomingRequests = async () => {
    setRequestsLoading(true);
    try {
      // Get pending requests where I am receiver
      const reqRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?receiver_id=eq.${currentUserId}&status=eq.pending&select=id,sender_id`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const requests = await reqRes.json();

      if (!requests || requests.length === 0) {
        setIncomingRequests([]);
        return;
      }

      // Get sender profiles
      const senderIds = requests.map((r: any) => r.sender_id);
      const sendersRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/users?id=in.(${senderIds.join(",")})&select=id,username,avatar_url`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const senders = await sendersRes.json();

      const requestsWithSenders = requests.map((req: any) => ({
        ...req,
        sender: senders.find((s: any) => s.id === req.sender_id) || {},
      }));

      setIncomingRequests(requestsWithSenders);
    } catch (e) {
      console.error(e);
    } finally {
      setRequestsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/users?username=ilike.*${query}*&id=neq.${currentUserId}&select=id,username,avatar_url`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await res.json();

      const reqRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests?or=(sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId})&select=sender_id,receiver_id,status`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const requests = await reqRes.json();

      const usersWithStatus = data.map((user: User) => {
        const req = requests.find(
          (r: any) =>
            (r.sender_id === currentUserId && r.receiver_id === user.id) ||
            (r.sender_id === user.id && r.receiver_id === currentUserId)
        );
        return {
          ...user,
          requestStatus: req ? req.status : "none",
        };
      });

      setUsers(usersWithStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    setSendingId(receiverId);
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/friend_requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            sender_id: currentUserId,
            receiver_id: receiverId,
            status: "pending",
          }),
        }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u.id === receiverId ? { ...u, requestStatus: "pending" } : u
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSendingId(null);
    }
  };

  const handleAccept = async (requestId: string) => {
    setActionId(requestId);
    try {
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

      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionId(requestId);
    try {
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

      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <Animated.View style={[styles.userRow, { opacity: fadeAnim }]}>
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
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
      </View>

      {item.requestStatus === "accepted" ? (
        <View style={[styles.actionBtn, styles.acceptedBtn]}>
          <Check size={14} color={Colors.white} />
          <Text style={styles.acceptedText}>Friends</Text>
        </View>
      ) : item.requestStatus === "pending" ? (
        <View style={[styles.actionBtn, styles.pendingBtn]}>
          <Clock size={14} color={Colors.neutral500} />
          <Text style={styles.pendingText}>Pending</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.actionBtn, styles.addBtn]}
          onPress={() => sendFriendRequest(item.id)}
          disabled={sendingId === item.id}
        >
          {sendingId === item.id ? (
            <ActivityIndicator size={14} color={Colors.black} />
          ) : (
            <>
              <UserPlus size={14} color={Colors.black} />
              <Text style={styles.addText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderRequest = ({ item }: { item: IncomingRequest }) => (
    <Animated.View style={[styles.userRow, { opacity: fadeAnim }]}>
      <View style={styles.avatarWrapper}>
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

      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.sender?.username}</Text>
        <Text style={styles.requestLabel}>wants to be your friend</Text>
      </View>

      <View style={styles.requestActions}>
        {/* Accept */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.addBtn]}
          onPress={() => handleAccept(item.id)}
          disabled={actionId === item.id}
        >
          {actionId === item.id ? (
            <ActivityIndicator size={14} color={Colors.black} />
          ) : (
            <>
              <Check size={14} color={Colors.black} />
              <Text style={styles.addText}>Accept</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Reject */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => handleReject(item.id)}
          disabled={actionId === item.id}
        >
          <X size={14} color={Colors.neutral500} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  if (!fontsLoaded) return null;

  return (
    <View ref={ref} style={styles.container}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={{ width: 42 }} />
      </Animated.View>

      {/* Tabs */}
      <Animated.View
        style={[
          styles.tabRow,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.tab, tab === "find" && styles.tabActive]}
          onPress={() => setTab("find")}
        >
          <UserPlus
            size={15}
            color={tab === "find" ? Colors.black : Colors.neutral500}
          />
          <Text style={[styles.tabText, tab === "find" && styles.tabTextActive]}>
            Find Friends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === "requests" && styles.tabActive]}
          onPress={() => setTab("requests")}
        >
          <Users
            size={15}
            color={tab === "requests" ? Colors.black : Colors.neutral500}
          />
          <Text
            style={[
              styles.tabText,
              tab === "requests" && styles.tabTextActive,
            ]}
          >
            Requests
            {incomingRequests.length > 0 && (
              <Text style={styles.tabBadge}> ({incomingRequests.length})</Text>
            )}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Find Friends Tab */}
      {tab === "find" && (
        <>
          <Animated.View
            style={[
              styles.searchContainer,
              { opacity: fadeAnim },
            ]}
          >
            <Search size={18} color={Colors.neutral400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor={Colors.neutral400}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <X size={16} color={Colors.neutral400} />
              </TouchableOpacity>
            )}
          </Animated.View>

          {loading ? (
            <ActivityIndicator
              color={Colors.primary}
              size="large"
              style={{ marginTop: 40 }}
            />
          ) : search.trim().length < 2 ? (
            <Animated.View
              style={[styles.emptyContainer, { opacity: fadeAnim }]}
            >
              <UserPlus size={56} color={Colors.neutral300} />
              <Text style={styles.emptyTitle}>Find Friends</Text>
              <Text style={styles.emptySubtitle}>
                Search by username to add friends
              </Text>
            </Animated.View>
          ) : users.length === 0 ? (
            <Animated.View
              style={[styles.emptyContainer, { opacity: fadeAnim }]}
            >
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>Try a different username</Text>
            </Animated.View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={renderUser}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </>
      )}

      {/* Requests Tab */}
      {tab === "requests" && (
        <>
          {requestsLoading ? (
            <ActivityIndicator
              color={Colors.primary}
              size="large"
              style={{ marginTop: 40 }}
            />
          ) : incomingRequests.length === 0 ? (
            <Animated.View
              style={[styles.emptyContainer, { opacity: fadeAnim }]}
            >
              <Users size={56} color={Colors.neutral300} />
              <Text style={styles.emptyTitle}>No Requests</Text>
              <Text style={styles.emptySubtitle}>
                You have no pending friend requests
              </Text>
            </Animated.View>
          ) : (
            <FlatList
              data={incomingRequests}
              keyExtractor={(item) => item.id}
              renderItem={renderRequest}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </>
      )}
    </View>
  );
});

AddFriends.displayName = "AddFriends";

export default AddFriends;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: Colors.neutral900,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: Colors.white,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: Colors.neutral200,
    borderRadius: 50,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.neutral500,
  },
  tabTextActive: {
    color: Colors.black,
  },
  tabBadge: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: Colors.black,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text,
  },

  // List
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.neutral200,
  },

  // Avatar
  avatarWrapper: {},
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: Colors.neutral600,
  },

  // User info
  userInfo: {
    flex: 1,
  },
  username: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  requestLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
    marginTop: 2,
  },

  // Request actions
  requestActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  // Action buttons
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
  },
  addBtn: {
    backgroundColor: Colors.primary,
  },
  addText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.black,
  },
  pendingBtn: {
    backgroundColor: Colors.neutral200,
  },
  pendingText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.neutral500,
  },
  acceptedBtn: {
    backgroundColor: Colors.green,
  },
  acceptedText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.white,
  },
  rejectBtn: {
    backgroundColor: Colors.neutral200,
    paddingHorizontal: 10,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 8,
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
    textAlign: "center",
    paddingHorizontal: 40,
  },
});