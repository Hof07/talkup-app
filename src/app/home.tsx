// ─── HomeScreen.tsx ───────────────────────────────────────────────────────────
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import React, { forwardRef, useEffect, useRef, useState } from "react";
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

import { ActionModal } from "./components/Actionmodal";
import { DeleteModal } from "./components/DeleteModal";
import { EmptyState } from "./components/EmptyState";
import { FriendRow } from "./components/FriendRow";
import { HomeHeader } from "./components/HomeHeader";
import { RequestRow } from "./components/RequestRow";
import { SearchBar } from "./components/SearchBar";
import { SetSecretKeyModal } from "./components/Setsecretkeymodal";
import Colors from "./constants/colors";
import { useAppTheme } from "./constants/ThemeContext";
import { getSecretKey, hasSecretKey } from "./home_compo/Hiddenchats";
import { getPinnedChats } from "./home_compo/pinnedChats";
import { Friend, FriendRequest, Tab, TALKUP_USER_ID } from "./home_compo/types";
import { useHomeData } from "./home_compo/useHomeData";
// import { StoryBar } from "./Storybar"; // ← temporarily disabled

// ─── HomeScreen ───────────────────────────────────────────────────────────────
const HomeScreen = forwardRef<View>((props, ref) => {
  const { colors, isDark } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [tab, setTab] = useState<Tab>("dm");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [actionTarget, setActionTarget] = useState<Friend | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Friend | null>(null);
  const [showSetKey, setShowSetKey] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
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
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (currentUserId && currentUserId === TALKUP_USER_ID) {
      router.replace("/broadcast");
    }
  }, [currentUserId]);

  useEffect(() => {
    getPinnedChats().then((ids: string[]) => setPinnedIds(ids));
  }, [friends]);

  const refreshPins = () => {
    getPinnedChats().then((ids: string[]) => setPinnedIds(ids));
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setSecretUnlocked(false); return; }
    getSecretKey().then((savedKey: string | null) => {
      setSecretUnlocked(!!savedKey && searchQuery.trim() === savedKey);
    });
  }, [searchQuery]);

  const visibleFriends: Friend[] = (() => {
    const talkUpRow = friends.find((f: Friend) => f.isTalkUp);
    const rest = friends.filter((f: Friend) => !f.isTalkUp);
    let filtered: Friend[];
    if (secretUnlocked) {
      filtered = rest;
    } else if (searchQuery.trim()) {
      filtered = rest.filter(
        (f: Friend) =>
          !f.isHidden &&
          f.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      filtered = rest.filter((f: Friend) => !f.isHidden);
    }
    return talkUpRow ? [talkUpRow, ...filtered] : filtered;
  })();

  const sortedFriends: Friend[] = (() => {
    const pinSet = new Set(pinnedIds);
    const talkUp = visibleFriends.find((f: Friend) => f.isTalkUp);
    const pinned = visibleFriends.filter(
      (f: Friend) => pinSet.has(f.id) && !f.isTalkUp
    );
    const unpinned = visibleFriends.filter(
      (f: Friend) => !pinSet.has(f.id) && !f.isTalkUp
    );
    return [...(talkUp ? [talkUp] : []), ...pinned, ...unpinned];
  })();

  const onFriendLongPress = (item: Friend) => {
    if (item.isTalkUp) return;
    setActionTarget(item);
  };

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

  const styles = useStyles(colors);

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
            <FlatList<FriendRequest>
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
        )}

        {/* StoryBar temporarily disabled — re-enable after fixing crash
        {!searchVisible && tab === "dm" && !!currentUserId && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <StoryBar currentUserId={currentUserId} colors={colors} />
            <View style={styles.storyDivider} />
          </Animated.View>
        )} */}

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
          <FlatList<Friend>
            data={sortedFriends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FriendRow
                item={item}
                onLongPress={() => onFriendLongPress(item)}
                isPinned={pinnedIds.includes(item.id)}
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

      <View style={styles.bottomBar} />

      <ActionModal
        friend={actionTarget}
        visible={!!actionTarget}
        onHide={tryHideChat}
        onUnhide={handleUnhideChat}
        onDelete={(f: Friend) => setDeleteTarget(f)}
        onCancel={() => setActionTarget(null)}
        onPinToggle={refreshPins}
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

const useStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    body: {
      flex: 1,
      backgroundColor: colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -24,
      paddingTop: 24,
    },
    sectionTitle: {
      fontFamily: "Outfit_700Bold",
      fontSize: 14,
      color: colors.neutral500,
      paddingHorizontal: 24,
      marginBottom: 8,
    },
    separator: {
      height: 1,
      backgroundColor: colors.separator,
      marginHorizontal: 28,
    },
    divider: {
      height: 8,
      backgroundColor: colors.neutral100,
      marginVertical: 8,
    },
    storyDivider: {
      height: 1,
      backgroundColor: colors.separator,
      marginHorizontal: 24,
      marginBottom: 8,
    },
    tabRow: {
      flexDirection: "row",
      marginHorizontal: 24,
      marginBottom: 16,
      backgroundColor: colors.neutral200,
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
    tabActive: { backgroundColor: colors.primary },
    tabText: {
      fontFamily: "Outfit_600SemiBold",
      fontSize: 14,
      color: colors.neutral500,
    },
    tabTextActive: { color: colors.black },
    listContent: { paddingHorizontal: 20, paddingBottom: 20 },
    bottomBar: {
      backgroundColor: colors.cardBackground ?? "#FFFFFF",
      height: 30,
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
    },
  });