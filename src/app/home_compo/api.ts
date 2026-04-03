// ─── api.ts ──────────────────────────────────────────────────────────────────

import { Friend, FriendRequest, TALKUP_USER_ID } from "./types";
import { formatTime } from "./utils";
import {
  decryptMessage,
  encryptMessage,
  generateChatKey,
} from "../../lib/crypto";

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

// ── Upload image to Supabase Storage ─────────────────────────────────────────
// Make sure you have a "broadcasts" bucket in Supabase Storage set to PUBLIC.

export const uploadBroadcastImage = async (
  uri: string,
  token: string,
): Promise<string> => {
  const filename = `broadcast_${Date.now()}.jpg`;
  const storageUrl = `${BASE}/storage/v1/object/broadcasts/${filename}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const uploadRes = await fetch(storageUrl, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: blob,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Image upload failed: ${err}`);
  }

  return `${BASE}/storage/v1/object/public/broadcasts/${filename}`;
};

export const fetchStats = async (
  token: string
): Promise<{
  totalMessages: number;
  totalUsers: number;
  broadcastsSent: number;
}> => {

  const res = await fetch(`${BASE}/rest/v1/rpc/get_stats`, {
    method: "POST",
    headers: {
      ...headers(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      talkup_id: TALKUP_USER_ID,
    }),
  });

  const data = await res.json();

  return {
    totalMessages: data.totalMessages || 0,
    totalUsers: data.totalUsers || 0,
    broadcastsSent: data.broadcastsSent || 0,
  };
};
// ── TalkUp row builder ────────────────────────────────────────────────────────

const buildTalkUpRow = async (
  userId: string,
  token: string,
): Promise<Friend> => {
  const [msgRes, unreadRes] = await Promise.all([
    fetch(
      `${BASE}/rest/v1/messages?or=(and(sender_id.eq.${TALKUP_USER_ID},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${TALKUP_USER_ID}))&order=created_at.desc&limit=1&select=content,created_at`,
      { headers: headers(token) },
    ),
    fetch(
      `${BASE}/rest/v1/messages?sender_id=eq.${TALKUP_USER_ID}&receiver_id=eq.${userId}&is_read=eq.false&select=id`,
      { headers: headers(token) },
    ),
  ]);

  const [msgs, unread] = await Promise.all([msgRes.json(), unreadRes.json()]);
  const lastMsg = msgs[0];
  const chatKey = generateChatKey(userId, TALKUP_USER_ID);
  const decrypted = lastMsg?.content
    ? decryptMessage(lastMsg.content, chatKey)
    : "";

  return {
    id: TALKUP_USER_ID,
    username: "TalkUp",
    avatar_url: null,
    last_message: decrypted || "Updates, news & announcements",
    last_message_time: lastMsg?.created_at
      ? formatTime(lastMsg.created_at)
      : "",
    unread_count: unread?.length ?? 0,
    last_seen: null,
    isTalkUp: true,
    isHidden: false,
  };
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

  const [talkUpRow, friendsData] = await Promise.all([
    buildTalkUpRow(userId, token),
    (async () => {
      if (!friendships?.length) return [];
      const friendIds = friendships.map((f: any) =>
        f.sender_id === userId ? f.receiver_id : f.sender_id,
      );
      const fRes = await fetch(
        `${BASE}/rest/v1/users?id=in.(${friendIds.join(",")})&select=id,username,avatar_url,last_seen`,
        { headers: headers(token) },
      );
      return fRes.json() as Promise<Friend[]>;
    })(),
  ]);

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

  const sorted = enriched.sort((a, b) => (a.last_message_time ? -1 : 1));
  return [talkUpRow, ...sorted];
};

// ── Broadcast — text + optional image ────────────────────────────────────────
// When image included, message is stored as: "IMAGE::<url>::<text>"

export const broadcastMessage = async (
  message: string,
  token: string,
  imageUrl?: string | null,
  onProgress?: (sent: number, total: number) => void,
): Promise<void> => {
  const res = await fetch(
    `${BASE}/rest/v1/users?id=neq.${TALKUP_USER_ID}&select=id`,
    { headers: headers(token) },
  );
  const users: { id: string }[] = await res.json();
  const total = users.length;
  const BATCH = 10;
  let sent = 0;

  const fullMessage = imageUrl ? `IMAGE::${imageUrl}::${message}` : message;

  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    await Promise.all(
      batch.map((user) => {
        const chatKey = generateChatKey(TALKUP_USER_ID, user.id);
        const encrypted = encryptMessage(fullMessage, chatKey);
        return fetch(`${BASE}/rest/v1/messages`, {
          method: "POST",
          headers: { ...jsonHeaders(token), Prefer: "return=minimal" },
          body: JSON.stringify({
            sender_id: TALKUP_USER_ID,
            receiver_id: user.id,
            content: encrypted,
            is_read: false,
            created_at: new Date().toISOString(),
          }),
        });
      }),
    );
    sent += batch.length;
    onProgress?.(sent, total);
  }
};

// ── Broadcast history ─────────────────────────────────────────────────────────

export const fetchBroadcastHistory = async (
  token: string,
  limit = 20,
): Promise<
  { content: string; created_at: string; id: string; imageUrl?: string }[]
> => {
  const res = await fetch(
    `${BASE}/rest/v1/messages?sender_id=eq.${TALKUP_USER_ID}&order=created_at.desc&limit=${limit}&select=id,content,created_at,receiver_id`,
    { headers: headers(token) },
  );
  const rows = await res.json();

  const seen = new Set<string>();
  const result: any[] = [];

  for (const row of rows) {
    const chatKey = generateChatKey(TALKUP_USER_ID, row.receiver_id);
    const decrypted = decryptMessage(row.content, chatKey);

    let content = decrypted;
    let imageUrl: string | undefined;

    if (decrypted.startsWith("IMAGE::")) {
      const parts = decrypted.split("::");
      imageUrl = parts[1];
      content = parts[2] ?? "";
    }

    const key = content + (imageUrl ?? "");
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        id: row.id,
        created_at: row.created_at,
        content,
        imageUrl,
      });
    }
  }

  return result;
};
