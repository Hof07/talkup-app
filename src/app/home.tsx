// ─── HomeScreen.tsx ───────────────────────────────────────────────────────────

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
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";

import Colors from "./constants/colors";
// import { useHomeData } from "./useHomeData";
// import { getSecretKey, hasSecretKey } from "./hiddenChats";
import { HomeHeader } from "./components/HomeHeader";
import { FriendRow } from "./components/FriendRow";
import { RequestRow } from "./components/RequestRow";
import { EmptyState } from "./components/EmptyState";
import { SearchBar } from "./components/SearchBar";
// import { ActionModal } from "./components/ActionModal";
import { DeleteModal } from "./components/DeleteModal";
// import { SetSecretKeyModal } from "./components/SetSecretKeyModal";
// import type { Friend, Tab } from "./types";
import { useHomeData } from "./home_compo/useHomeData";
import { getSecretKey, hasSecretKey } from "./home_compo/Hiddenchats";
import { ActionModal } from "./components/Actionmodal";
import { SetSecretKeyModal } from "./components/Setsecretkeymodal";
import { Friend, Tab } from "./home_compo/types";

const HomeScreen = forwardRef<View>((props, ref) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [tab, setTab] = useState<Tab>("dm");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [secretUnlocked, setSecretUnlocked] = useState(false);

  // Action bottom sheet (long press)
  const [actionTarget, setActionTarget] = useState<Friend | null>(null);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<Friend | null>(null);

  const [showSetKey, setShowSetKey] = useState(false);
  const pendingHideId = useRef<string | null>(null);

  const {
    friends,
    pendingRequests,
    currentUser,
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

  // ── Secret key check on every query change ───────────────────────────────────
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
    if (secretUnlocked) {
      // Show ALL friends (hidden + visible) when key is correct
      return friends;
    }
    if (searchQuery.trim()) {
      // Normal search — only non-hidden friends, filter by name
      return friends.filter(
        (f) =>
          !f.isHidden &&
          f.username.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    // Default view — hide hidden friends
    return friends.filter((f) => !f.isHidden);
  })();

  // ── Hide chat — check if key exists first ─────────────────────────────────────
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

  // ── Close search ──────────────────────────────────────────────────────────────
  const closeSearch = () => {
    setSearchVisible(false);
    setSearchQuery("");
    setSecretUnlocked(false);
  };

  if (!fontsLoaded) return null;

  return (
    <View ref={ref} style={styles.container}>
      {/* ── Header ── */}
      <HomeHeader
        username={currentUser?.username}
        fadeAnim={fadeAnim}
        slideAnim={slideAnim}
        onSearchPress={() => {
          if (searchVisible) {
            closeSearch();
          } else {
            setSearchVisible(true);
          }
        }}
        searchActive={searchVisible}
      />

      {/* ── Body ── */}
      <View style={styles.body}>
        {/* Search bar */}
        {searchVisible && (
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={closeSearch}
            secretUnlocked={secretUnlocked}
          />
        )}

        {/* Pending friend requests (hidden while searching) */}
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

        {/* DM / Group tabs (hidden while searching) */}
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

        {/* Friends list */}
        {loading ? (
          <ActivityIndicator
            color={Colors.primary}
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : visibleFriends.length === 0 ? (
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
                onLongPress={() => setActionTarget(item)}
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

      {/* ── Long press action sheet ── */}
      <ActionModal
        friend={actionTarget}
        visible={!!actionTarget}
        onHide={tryHideChat}
        onUnhide={handleUnhideChat}
        onDelete={(f) => setDeleteTarget(f)}
        onCancel={() => setActionTarget(null)}
      />

      {/* ── Delete confirmation ── */}
      <DeleteModal
        visible={!!deleteTarget}
        username={deleteTarget?.username ?? ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Set secret key (first time) ── */}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  separator: {
    height: 1,
    backgroundColor: Colors.neutral200,
    marginHorizontal: 28,
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
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.neutral500,
  },
  tabTextActive: {
    color: Colors.black,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
