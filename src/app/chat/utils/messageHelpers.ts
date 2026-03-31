export const isEmojiOnly = (text: string): boolean => {
  const stripped = text.trim();
  if (stripped.length === 0 || stripped.length > 12) return false;
  const emojiRegex =
    /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\s)+$/u;
  return emojiRegex.test(stripped);
};

export const formatTime = (iso: string): string => {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const isOnline = (iso: string | null | undefined): boolean =>
  iso ? new Date().getTime() - new Date(iso).getTime() < 120000 : false;

export const formatLastSeen = (iso: string | null | undefined): string => {
  if (!iso) return "last seen recently";
  const diff = Math.floor(
    (new Date().getTime() - new Date(iso).getTime()) / 60000,
  );
  if (diff < 1) return "online";
  if (diff < 60) return `last seen ${diff}m ago`;
  if (diff < 1440) return `last seen ${Math.floor(diff / 60)}h ago`;
  return "last seen yesterday";
};