// ─── talkupApi.ts ─────────────────────────────────────────────────────────────
//
// All API calls specifically for the TalkUp root account feature.
// Posts are fetched from talkup_posts table — not from messages.

import { TalkUpPost, TALKUP_USER_ID } from "./types";

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

// ── Fetch posts ───────────────────────────────────────────────────────────────

export const fetchTalkUpPosts = async (
  token: string,
): Promise<TalkUpPost[]> => {
  const res = await fetch(
    `${BASE}/rest/v1/talkup_posts?order=is_pinned.desc,created_at.desc&limit=50`,
    { headers: headers(token) },
  );
  return res.json();
};

export const fetchLatestPost = async (
  token: string,
): Promise<TalkUpPost | null> => {
  const res = await fetch(
    `${BASE}/rest/v1/talkup_posts?order=created_at.desc&limit=1`,
    { headers: headers(token) },
  );
  const data = await res.json();
  return data[0] ?? null;
};

// ── Unread count ──────────────────────────────────────────────────────────────
// Returns how many posts the user hasn't marked as read yet.

export const fetchUnreadPostCount = async (
  userId: string,
  token: string,
): Promise<number> => {
  // All post IDs
  const postsRes = await fetch(`${BASE}/rest/v1/talkup_posts?select=id`, {
    headers: headers(token),
  });
  const posts: { id: string }[] = await postsRes.json();
  if (!posts.length) return 0;

  // IDs this user has read
  const readsRes = await fetch(
    `${BASE}/rest/v1/talkup_reads?user_id=eq.${userId}&select=post_id`,
    { headers: headers(token) },
  );
  const reads: { post_id: string }[] = await readsRes.json();
  const readIds = new Set(reads.map((r) => r.post_id));

  return posts.filter((p) => !readIds.has(p.id)).length;
};

// ── Mark post as read ─────────────────────────────────────────────────────────

export const markPostRead = async (
  userId: string,
  postId: string,
  token: string,
): Promise<void> => {
  await fetch(`${BASE}/rest/v1/talkup_reads`, {
    method: "POST",
    headers: {
      ...jsonHeaders(token),
      Prefer: "return=minimal,resolution=ignore-duplicates",
    },
    body: JSON.stringify({ user_id: userId, post_id: postId }),
  });
};

export const markAllPostsRead = async (
  userId: string,
  token: string,
): Promise<void> => {
  const postsRes = await fetch(`${BASE}/rest/v1/talkup_posts?select=id`, {
    headers: headers(token),
  });
  const posts: { id: string }[] = await postsRes.json();

  await Promise.all(posts.map((p) => markPostRead(userId, p.id, token)));
};

// ── TalkUp "friend" row data ──────────────────────────────────────────────────
// Builds the Friend-shaped object for TalkUp so it slots into the normal list.

export const buildTalkUpRow = async (userId: string, token: string) => {
  const [latest, unread] = await Promise.all([
    fetchLatestPost(token),
    fetchUnreadPostCount(userId, token),
  ]);

  return {
    id: TALKUP_USER_ID,
    username: "TalkUp",
    avatar_url: null, // swap with your logo URL
    last_message: latest?.title ?? "Welcome to TalkUp!",
    last_message_time: latest?.created_at
      ? formatTalkUpTime(latest.created_at)
      : "",
    unread_count: unread,
    last_seen: null,
    isTalkUp: true,
    isHidden: false,
  };
};

const formatTalkUpTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffH = (now.getTime() - date.getTime()) / 3_600_000;

  if (diffH < 24) {
    let h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
