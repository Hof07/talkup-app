import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { record } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Check mute ────────────────────────────────────────────────────────
  const { data: muteData } = await supabase
    .from("muted_chats")
    .select("muted_until")
    .eq("user_id", record.receiver_id)
    .eq("friend_id", record.sender_id)
    .single();

  if (muteData) {
    const isMuted =
      !muteData.muted_until || new Date(muteData.muted_until) > new Date();
    if (isMuted) {
      return new Response("Muted", { status: 200 });
    }
  }

  // ── Get receiver token ────────────────────────────────────────────────
  const { data: receiver } = await supabase
    .from("users")
    .select("push_token, username")
    .eq("id", record.receiver_id)
    .single();

  if (!receiver?.push_token) {
    return new Response("No token", { status: 200 });
  }

  // ── Get sender username ───────────────────────────────────────────────
  const { data: sender } = await supabase
    .from("users")
    .select("username")
    .eq("id", record.sender_id)
    .single();

  // ── Send notification ─────────────────────────────────────────────────
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: receiver.push_token,
      title: sender?.username || "New Message",
      body:
        record.message_type === "image"
          ? "📷 Sent you an image"
          : record.message_type === "sticker"
            ? "🎉 Sent you a sticker"
            : "New message",
      data: {
        senderId: record.sender_id,
        chatId: record.receiver_id,
      },
      sound: "default",
      badge: 1,
    }),
  });

  return new Response("OK", { status: 200 });
});
