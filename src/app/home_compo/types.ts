
export const TALKUP_USER_ID = "b0709409-2f35-4e73-95d5-a7d41293a1fa";

export interface TalkUpPost {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
}

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
  // Add these for TalkUp row detection in UI
  isTalkUp?: boolean;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  sender: {
    username: string;
    avatar_url: string | null;
  };
}