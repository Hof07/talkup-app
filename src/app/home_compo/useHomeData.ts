// ─── useHomeData.ts ───────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Friend, FriendRequest } from "./types";
import * as api from "./api";
import * as hidden from "./Hiddenchats";

export const useHomeData = () => {
  const [friends,         setFriends]         = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [currentUser,     setCurrentUser]     = useState<any>(null);
  const [sessionData,     setSessionData]     = useState<any>(null);
  const [currentUserId,   setCurrentUserId]   = useState("");
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);

  // ── Load all data ────────────────────────────────────────────────────────────

  const loadData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
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
        api.fetchFriendsWithMessages(user.id, token),
        hidden.getHiddenIds(),
      ]);

      // Tag each friend with isHidden
      const friendsWithHidden = rawFriends.map((f) => ({
        ...f,
        isHidden: hiddenIds.includes(f.id),
      }));

      setCurrentUser(currentUser);
      setPendingRequests(pending);
      setFriends(friendsWithHidden);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Focus refresh + last_seen ─────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      loadData();
      AsyncStorage.getItem("userSession").then((s) => {
        if (!s) return;
        const session = JSON.parse(s);
        api.updateLastSeen(session.user.id, session.access_token);
      });
    }, [loadData])
  );

  // ── Friend request handlers ──────────────────────────────────────────────────

  const handleAccept = async (requestId: string) => {
    await api.acceptRequest(requestId, sessionData?.access_token);
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    loadData();
  };

  const handleReject = async (requestId: string) => {
    await api.rejectRequest(requestId, sessionData?.access_token);
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  // ── Delete friend ────────────────────────────────────────────────────────────

  const handleDeleteFriend = async (friendId: string) => {
    try {
      await api.deleteFriend(currentUserId, friendId, sessionData?.access_token);
      await hidden.unhideChat(friendId); // clean up hidden list too
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Hide / unhide chat ───────────────────────────────────────────────────────

  const handleHideChat = async (friendId: string) => {
    await hidden.hideChat(friendId);
    setFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, isHidden: true } : f))
    );
  };

  const handleUnhideChat = async (friendId: string) => {
    await hidden.unhideChat(friendId);
    setFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, isHidden: false } : f))
    );
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