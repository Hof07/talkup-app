// ─── api.ts ──────────────────────────────────────────────────────────────────

import { Friend, FriendRequest } from "./types";
import { formatTime } from "./utils";
import { decryptMessage, generateChatKey } from "../../lib/crypto";

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const headers = (token: string) => ({
  apikey: KEY,
  Authorization: `Bearer ${token}`,
});

const jsonHeaders = (token: string) => ({
  ...headers(token),
  "Content-Type": "application/json",
  Prefer: "return=minimal",
});

// ── Current user ──────────────────────────────────────────────────────────────

export const updateLastSeen = async (
  userId: string,
  token: string,
): Promise<void> => {
  await fetch(`${BASE}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({ last_seen: new Date().toISOString() }),
  });
};

export const fetchCurrentUser = async (
  userId: string,
  token: string,
): Promise<any> => {
  const res = await fetch(`${BASE}/rest/v1/users?id=eq.${userId}&select=*`, {
    headers: headers(token),
  });
  const data = await res.json();
  return data[0] ?? null;
};

// ── Friend requests ───────────────────────────────────────────────────────────

export const fetchPendingRequests = async (
  userId: string,
  token: string,
): Promise<FriendRequest[]> => {
  const res = await fetch(
    `${BASE}/rest/v1/friend_requests?receiver_id=eq.${userId}&status=eq.pending&select=id,sender_id`,
    { headers: headers(token) },
  );
  const pending = await res.json();
  if (!pending.length) return [];

  const senderIds = pending.map((r: any) => r.sender_id).join(",");
  const sRes = await fetch(
    `${BASE}/rest/v1/users?id=in.(${senderIds})&select=id,username,avatar_url`,
    { headers: headers(token) },
  );
  const senders = await sRes.json();

  return pending.map((req: any) => ({
    ...req,
    sender: senders.find((s: any) => s.id === req.sender_id) ?? {},
  }));
};

export const acceptRequest = (id: string, token: string): Promise<Response> =>
  patchRequest(id, token, {
    status: "accepted",
    updated_at: new Date().toISOString(),
  });

export const rejectRequest = (id: string, token: string): Promise<Response> =>
  patchRequest(id, token, {
    status: "rejected",
    updated_at: new Date().toISOString(),
  });

const patchRequest = (
  id: string,
  token: string,
  body: object,
): Promise<Response> =>
  fetch(`${BASE}/rest/v1/friend_requests?id=eq.${id}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });

// ── Delete friend ─────────────────────────────────────────────────────────────

export const deleteFriend = async (
  userId: string,
  friendId: string,
  token: string,
): Promise<void> => {
  await fetch(
    `${BASE}/rest/v1/friend_requests?or=(and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId}))`,
    { method: "DELETE", headers: jsonHeaders(token) },
  );
  await fetch(
    `${BASE}/rest/v1/messages?or=(and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId}))`,
    { method: "DELETE", headers: jsonHeaders(token) },
  );
};

// ── Friends + messages ────────────────────────────────────────────────────────

export const fetchFriendsWithMessages = async (
  userId: string,
  token: string,
): Promise<Friend[]> => {
  const frRes = await fetch(
    `${BASE}/rest/v1/friend_requests?or=(and(sender_id.eq.${userId},status.eq.accepted),and(receiver_id.eq.${userId},status.eq.accepted))&select=sender_id,receiver_id`,
    { headers: headers(token) },
  );
  const friendships = await frRes.json();
  if (!friendships?.length) return [];

  const friendIds = friendships.map((f: any) =>
    f.sender_id === userId ? f.receiver_id : f.sender_id,
  );

  const fRes = await fetch(
    `${BASE}/rest/v1/users?id=in.(${friendIds.join(",")})&select=id,username,avatar_url,last_seen`,
    { headers: headers(token) },
  );
  const friendsData: Friend[] = await fRes.json();

  const enriched = await Promise.all(
    friendsData.map(async (friend) => {
      const [msgRes, unreadRes] = await Promise.all([
        fetch(
          `${BASE}/rest/v1/messages?or=(and(sender_id.eq.${userId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${userId}))&order=created_at.desc&limit=1&select=content,created_at`,
          { headers: headers(token) },
        ),
        fetch(
          `${BASE}/rest/v1/messages?sender_id=eq.${friend.id}&receiver_id=eq.${userId}&is_read=eq.false&select=id`,
          { headers: headers(token) },
        ),
      ]);

      const [msgs, unread] = await Promise.all([
        msgRes.json(),
        unreadRes.json(),
      ]);
      const lastMsg = msgs[0];
      const chatKey = generateChatKey(userId, friend.id);
      const decryptedMsg = lastMsg?.content
        ? decryptMessage(lastMsg.content, chatKey)
        : "";

      return {
        ...friend,
        last_message: decryptedMsg,
        last_message_time: lastMsg?.created_at
          ? formatTime(lastMsg.created_at)
          : "",
        unread_count: unread?.length ?? 0,
      };
    }),
  );

  return enriched.sort((a, b) => (a.last_message_time ? -1 : 1));
};
