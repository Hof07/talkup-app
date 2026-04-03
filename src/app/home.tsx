// ─── HomeScreen.tsx ───────────────────────────────────────────────────────────
// When the logged-in user IS the TalkUp account, redirect to BroadcastScreen.
// Everyone else sees the normal home screen.

import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";

import Colors from "./constants/colors";
import { HomeHeader } from "./components/HomeHeader";
import { FriendRow } from "./components/FriendRow";
import { RequestRow } from "./components/RequestRow";
import { EmptyState } from "./components/EmptyState";
import { SearchBar } from "./components/SearchBar";
import { DeleteModal } from "./components/DeleteModal";
import { useHomeData } from "./home_compo/useHomeData";
import { getSecretKey, hasSecretKey } from "./home_compo/Hiddenchats";
import { Friend, Tab, TALKUP_USER_ID } from "./home_compo/types";
import { ActionModal } from "./components/Actionmodal";
import { SetSecretKeyModal } from "./components/Setsecretkeymodal";

const HomeScreen = forwardRef<View>((props, ref) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [tab, setTab] = useState<Tab>("dm");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [actionTarget, setActionTarget] = useState<Friend | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Friend | null>(null);
  const [showSetKey, setShowSetKey] = useState(false);
  const pendingHideId = useRef<string | null>(null);

  const {
    friends,
    pendingRequests,
    currentUser,
    currentUserId,
    loading,
    refreshing,
    loadData,
    handleAccept,
    handleReject,
    handleDeleteFriend,
    handleHideChat,
    handleUnhideChat,
  } = useHomeData();

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

  // ── If this IS the TalkUp account, redirect to broadcast screen ──────────────
  useEffect(() => {
    if (currentUserId && currentUserId === TALKUP_USER_ID) {
      router.replace("/broadcast");
    }
  }, [currentUserId]);

  // ── Secret key check ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSecretUnlocked(false);
      return;
    }
    getSecretKey().then((savedKey) => {
      setSecretUnlocked(!!savedKey && searchQuery.trim() === savedKey);
    });
  }, [searchQuery]);

  // ── Filter logic ──────────────────────────────────────────────────────────────
  const visibleFriends = (() => {
    const talkUpRow = friends.find((f) => f.isTalkUp);
    const rest = friends.filter((f) => !f.isTalkUp);

    let filtered: Friend[];
    if (secretUnlocked) {
      filtered = rest;
    } else if (searchQuery.trim()) {
      filtered = rest.filter(
        (f) =>
          !f.isHidden &&
          f.username.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    } else {
      filtered = rest.filter((f) => !f.isHidden);
    }

    return talkUpRow ? [talkUpRow, ...filtered] : filtered;
  })();

  // ── Long press guard for TalkUp ───────────────────────────────────────────────
  const onFriendLongPress = (item: Friend) => {
    if (item.isTalkUp) return;
    setActionTarget(item);
  };

  // ── Hide chat ─────────────────────────────────────────────────────────────────
  const tryHideChat = async (friendId: string) => {
    const keyExists = await hasSecretKey();
    if (!keyExists) {
      pendingHideId.current = friendId;
      setShowSetKey(true);
    } else {
      handleHideChat(friendId);
    }
  };

  const onKeySet = () => {
    setShowSetKey(false);
    if (pendingHideId.current) {
      handleHideChat(pendingHideId.current);
      pendingHideId.current = null;
    }
  };

  // ── Delete confirm ────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await handleDeleteFriend(deleteTarget.id);
    setDeleteTarget(null);
  };

  const closeSearch = () => {
    setSearchVisible(false);
    setSearchQuery("");
    setSecretUnlocked(false);
  };

  if (!fontsLoaded) return null;

  return (
    <View ref={ref} style={styles.container}>
      <HomeHeader
        username={currentUser?.username}
        fadeAnim={fadeAnim}
        slideAnim={slideAnim}
        onSearchPress={() =>
          searchVisible ? closeSearch() : setSearchVisible(true)
        }
        searchActive={searchVisible}
      />

      <View style={styles.body}>
        {searchVisible && (
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={closeSearch}
            secretUnlocked={secretUnlocked}
          />
        )}

        {!searchVisible && pendingRequests.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.sectionTitle}>
              Friend Requests ({pendingRequests.length})
            </Text>
            <FlatList
              data={pendingRequests}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <RequestRow
                  item={item}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            <View style={styles.divider} />
          </Animated.View>
        )}

        {!searchVisible && (
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
              <Text
                style={[styles.tabText, tab === "dm" && styles.tabTextActive]}
              >
                Direct Message
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "group" && styles.tabActive]}
              onPress={() => setTab("group")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "group" && styles.tabTextActive,
                ]}
              >
                Group
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {loading ? (
          <ActivityIndicator
            color={Colors.primary}
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : visibleFriends.length === 0 ||
          (visibleFriends.length === 1 && visibleFriends[0]?.isTalkUp) ? (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <EmptyState
              searching={searchQuery.trim().length > 0 && !secretUnlocked}
            />
          </Animated.View>
        ) : (
          <FlatList
            data={visibleFriends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FriendRow
                item={item}
                onLongPress={() => onFriendLongPress(item)}
              />
            )}
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

      <ActionModal
        friend={actionTarget}
        visible={!!actionTarget}
        onHide={tryHideChat}
        onUnhide={handleUnhideChat}
        onDelete={(f) => setDeleteTarget(f)}
        onCancel={() => setActionTarget(null)}
      />

      <DeleteModal
        visible={!!deleteTarget}
        username={deleteTarget?.username ?? ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <SetSecretKeyModal
        visible={showSetKey}
        onSaved={onKeySet}
        onCancel={() => {
          setShowSetKey(false);
          pendingHideId.current = null;
        }}
      />
    </View>
  );
});

HomeScreen.displayName = "HomeScreen";
export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  separator: {
    height: 1,
    backgroundColor: Colors.neutral200,
    marginHorizontal: 28,
  },
  divider: { height: 8, backgroundColor: Colors.neutral100, marginVertical: 8 },
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
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
});
