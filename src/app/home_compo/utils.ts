export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

export const formatLastSeen = (isoString: string | null | undefined): string => {
  if (!isoString) return "last seen recently";
  const diffMins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `last seen ${diffMins}m ago`;
  if (diffHours < 24) return `last seen ${diffHours}h ago`;
  if (diffDays === 1) return "last seen yesterday";
  return `last seen ${diffDays}d ago`;
};

export const isOnline = (isoString: string | null | undefined): boolean => {
  if (!isoString) return false;
  return Date.now() - new Date(isoString).getTime() < 120_000;
};