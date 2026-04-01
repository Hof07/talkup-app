// ─── types.ts ────────────────────────────────────────────────────────────────

export type Tab = "dm" | "group";

export interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
  last_seen?: string | null;
  isHidden?: boolean;   
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  sender: {
    username: string;
    avatar_url: string | null;
  };
}