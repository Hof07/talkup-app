// ─── useHomeData.ts ───────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from "react";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Friend, FriendRequest, TALKUP_USER_ID } from "./types";
import * as api from "./api";
import * as hidden from "./Hiddenchats";

// ── AsyncStorage cache keys ──────────────────────────────────────────────────
const CACHE_FRIENDS = "cache_friends_list";
const CACHE_REQUESTS = "cache_pending_requests";
const CACHE_USER = "cache_current_user";

export const useHomeData = () => {
  const [friends,         setFriends]         = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [currentUser,     setCurrentUser]     = useState<any>(null);
  const [sessionData,     setSessionData]     = useState<any>(null);
  const [currentUserId,   setCurrentUserId]   = useState("");
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const cacheLoaded = useRef(false);

  // ── Load cached data from AsyncStorage (instant, no network) ──────────────
  const loadFromCache = useCallback(async () => {
    try {
      const [friendsStr, requestsStr, userStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_FRIENDS),
        AsyncStorage.getItem(CACHE_REQUESTS),
        AsyncStorage.getItem(CACHE_USER),
      ]);

      if (friendsStr) {
        const cached: Friend[] = JSON.parse(friendsStr);
        setFriends(cached);
      }
      if (requestsStr) {
        const cached: FriendRequest[] = JSON.parse(requestsStr);
        setPendingRequests(cached);
      }
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
      cacheLoaded.current = true;
    } catch (e) {
      console.warn("[useHomeData] cache load failed:", e);
    }
  }, []);

  // ── Save data to AsyncStorage cache ───────────────────────────────────────
  const saveToCache = useCallback(
    async (friends: Friend[], requests: FriendRequest[], user: any) => {
      try {
        await Promise.all([
          AsyncStorage.setItem(CACHE_FRIENDS, JSON.stringify(friends)),
          AsyncStorage.setItem(CACHE_REQUESTS, JSON.stringify(requests)),
          AsyncStorage.setItem(CACHE_USER, JSON.stringify(user)),
        ]);
      } catch (e) {
        console.warn("[useHomeData] cache save failed:", e);
      }
    },
    []
  );

  // ── Load all data from server ─────────────────────────────────────────────

  const loadData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : (cacheLoaded.current ? null : setLoading(true));
    try {
      const sessionStr = await AsyncStorage.getItem("userSession");
      if (!sessionStr) { router.replace("/signin"); return; }

      const session                       = JSON.parse(sessionStr);
      const { access_token: token, user } = session;

      setSessionData(session);
      setCurrentUserId(user.id);

      const [currentUser, pending, rawFriends, hiddenIds] = await Promise.all([
        api.fetchCurrentUser(user.id, token),
        api.fetchPendingRequests(user.id, token),
        api.fetchFriendsWithMessages(user.id, token),  // TalkUp already injected at [0]
        hidden.getHiddenIds(),
      ]);

      // Tag hidden — but never tag TalkUp as hidden
      const friendsWithHidden = rawFriends.map((f) => ({
        ...f,
        isHidden: f.isTalkUp ? false : hiddenIds.includes(f.id),
      }));

      setCurrentUser(currentUser);
      setPendingRequests(pending);
      setFriends(friendsWithHidden);

      // Save to cache for offline access
      await saveToCache(friendsWithHidden, pending, currentUser);
    } catch (e) {
      console.warn("[useHomeData] network fetch failed (offline?):", e);
      // If network fails and we haven't loaded cache yet, load it now
      if (!cacheLoaded.current) {
        await loadFromCache();
      }
      // Also set userId from session if possible
      try {
        const sessionStr = await AsyncStorage.getItem("userSession");
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          setSessionData(session);
          setCurrentUserId(session.user?.id || "");
        }
      } catch {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadFromCache, saveToCache]);

  // ── Focus refresh ─────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      // Load cached data instantly (no waiting for network)
      if (!cacheLoaded.current) {
        loadFromCache().then(() => setLoading(false));
      }

      // Also get userId from session immediately for routing
      AsyncStorage.getItem("userSession").then((s) => {
        if (!s) return;
        const session = JSON.parse(s);
        setSessionData(session);
        setCurrentUserId(session.user?.id || "");
        // Update last seen (fire-and-forget, won't fail if offline)
        api.updateLastSeen(session.user.id, session.access_token).catch(() => {});
      });

      // Then fetch fresh data from server in background
      loadData();
    }, [loadData, loadFromCache])
  );

  // ── Friend request handlers ──────────────────────────────────────────────

  const handleAccept = async (requestId: string) => {
    await api.acceptRequest(requestId, sessionData?.access_token);
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    loadData();
  };

  const handleReject = async (requestId: string) => {
    await api.rejectRequest(requestId, sessionData?.access_token);
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  // ── Delete friend — TalkUp cannot be deleted ─────────────────────────────

  const handleDeleteFriend = async (friendId: string) => {
    if (friendId === TALKUP_USER_ID) return;   // guard
    try {
      await api.deleteFriend(currentUserId, friendId, sessionData?.access_token);
      await hidden.unhideChat(friendId);
      setFriends((prev) => {
        const updated = prev.filter((f) => f.id !== friendId);
        // Also update cache
        AsyncStorage.setItem(CACHE_FRIENDS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ── Hide / unhide — TalkUp cannot be hidden ──────────────────────────────

  const handleHideChat = async (friendId: string) => {
    if (friendId === TALKUP_USER_ID) return;   // guard
    await hidden.hideChat(friendId);
    setFriends((prev) => {
      const updated = prev.map((f) => (f.id === friendId ? { ...f, isHidden: true } : f));
      AsyncStorage.setItem(CACHE_FRIENDS, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const handleUnhideChat = async (friendId: string) => {
    await hidden.unhideChat(friendId);
    setFriends((prev) => {
      const updated = prev.map((f) => (f.id === friendId ? { ...f, isHidden: false } : f));
      AsyncStorage.setItem(CACHE_FRIENDS, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  return {
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
  };
};