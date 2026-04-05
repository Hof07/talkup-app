export interface Reaction {
  emoji: string;
  user_id: string;
}

export interface ReplyTo {
  id: string;
  content: string;
  sender_id: string;
  message_type?: "text" | "image" | "image_group" | "sticker" | "gift";
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_temp?: boolean;
  reactions?: Reaction[];
  deleted_for?: string[];
  deleted_for_everyone?: boolean;
  message_type?: "text" | "image" | "image_group" | "sticker" | "gift";
  images?: string[];
  reply_to?: ReplyTo | null;
}
