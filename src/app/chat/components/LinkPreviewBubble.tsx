import React from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { ChatTheme } from "../../../lib/themes";

/* ───────────── LINK DETECTION ───────────── */

const URL_REGEX =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) ?? [];
}

export function hasLinks(text: string): boolean {
  return URL_REGEX.test(text);
}

/* ───────────── PLATFORM DETECTION ───────────── */

interface PlatformInfo {
  id: string;
  label: string;
  gradient: [string, string];
  iconBg: string;
  textColor: string;
  subtitleColor: string;
}

function detectPlatform(url: string): PlatformInfo {
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com") || lower.includes("instagr.am")) {
    return {
      id: "instagram",
      label: "Instagram",
      gradient: ["#833AB4", "#E1306C"],
      iconBg: "#C13584",
      textColor: "#FFFFFF",
      subtitleColor: "rgba(255,255,255,0.7)",
    };
  }
  if (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("youtube.com/shorts")
  ) {
    return {
      id: "youtube",
      label: "YouTube",
      gradient: ["#FF0000", "#CC0000"],
      iconBg: "#FF0000",
      textColor: "#FFFFFF",
      subtitleColor: "rgba(255,255,255,0.7)",
    };
  }
  if (
    lower.includes("twitter.com") ||
    lower.includes("x.com") ||
    lower.includes("t.co")
  ) {
    return {
      id: "twitter",
      label: "𝕏 / Twitter",
      gradient: ["#1A1A2E", "#0F0F1A"],
      iconBg: "#000000",
      textColor: "#FFFFFF",
      subtitleColor: "rgba(255,255,255,0.65)",
    };
  }
  if (lower.includes("spotify.com") || lower.includes("open.spotify")) {
    return {
      id: "spotify",
      label: "Spotify",
      gradient: ["#1DB954", "#148A3C"],
      iconBg: "#1DB954",
      textColor: "#FFFFFF",
      subtitleColor: "rgba(255,255,255,0.7)",
    };
  }
  if (lower.includes("github.com")) {
    return {
      id: "github",
      label: "GitHub",
      gradient: ["#24292E", "#1A1E22"],
      iconBg: "#24292E",
      textColor: "#FFFFFF",
      subtitleColor: "rgba(255,255,255,0.65)",
    };
  }
  if (
    lower.includes("linkedin.com") ||
    lower.includes("lnkd.in")
  ) {
    return {
      id: "linkedin",
      label: "LinkedIn",
      gradient: ["#0077B5", "#005E93"],
      iconBg: "#0077B5",
      textColor: "#FFFFFF",
      subtitleColor: "rgba(255,255,255,0.7)",
    };
  }
  return {
    id: "generic",
    label: "Link",
    gradient: ["#6366F1", "#4F46E5"],
    iconBg: "#6366F1",
    textColor: "#FFFFFF",
    subtitleColor: "rgba(255,255,255,0.7)",
  };
}

/* ───────────── SVG ICONS (inline, no external deps) ───────────── */

function InstagramIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="ig" x1="0" y1="24" x2="24" y2="0">
          <Stop offset="0" stopColor="#FFDC80" />
          <Stop offset="0.25" stopColor="#F77737" />
          <Stop offset="0.5" stopColor="#E1306C" />
          <Stop offset="0.75" stopColor="#833AB4" />
          <Stop offset="1" stopColor="#5B51D8" />
        </LinearGradient>
      </Defs>
      <Rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#ig)" strokeWidth="2" />
      <Circle cx="12" cy="12" r="5" stroke="url(#ig)" strokeWidth="2" />
      <Circle cx="18" cy="6" r="1.5" fill="url(#ig)" />
    </Svg>
  );
}

function YouTubeIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"
        fill="#FF0000"
      />
      <Path d="M9.75 15.02l5.75-3.27-5.75-3.27v6.54z" fill="#FFFFFF" />
    </Svg>
  );
}

function TwitterIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function SpotifyIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="#1DB954" />
      <Path
        d="M16.5 16.18c-.2 0-.36-.07-.53-.18-2.07-1.24-4.67-1.52-7.73-.83-.22.05-.47.1-.6.1-.38 0-.63-.28-.63-.6 0-.38.2-.6.55-.68 3.4-.77 6.33-.44 8.68.94.27.16.42.37.42.68 0 .33-.25.57-.16.57zM17.8 13.32c-.25 0-.43-.08-.62-.2-2.37-1.42-5.97-2.05-8.76-1.12-.18.06-.3.1-.5.1-.47 0-.84-.37-.84-.83 0-.47.23-.75.66-.88 1.2-.38 2.45-.58 4.08-.58 2.4 0 4.72.6 6.53 1.7.34.2.5.47.5.85 0 .47-.35.83-.84.83h.02-.23zM6.27 8.77c-.22 0-.37-.06-.55-.14-.46-.25-.6-.67-.37-1.12C7.05 4.72 11.27 4 14.33 4c1.87 0 3.87.3 5.57 1 .5.2.72.55.58 1.04-.14.47-.5.7-.98.52-1.5-.58-3.3-.85-5.2-.85-2.73 0-6.28.62-7.58 3.04-.14.26-.3.42-.58.42l.13-.4z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function GitHubIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function LinkedInIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function GenericLinkIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function getPlatformIcon(id: string) {
  switch (id) {
    case "instagram":
      return <InstagramIcon />;
    case "youtube":
      return <YouTubeIcon />;
    case "twitter":
      return <TwitterIcon />;
    case "spotify":
      return <SpotifyIcon />;
    case "github":
      return <GitHubIcon />;
    case "linkedin":
      return <LinkedInIcon />;
    default:
      return <GenericLinkIcon />;
  }
}

/* ───────────── clean URL for display ───────────── */

function cleanUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function getPath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    if (path === "/" || path === "") return "";
    // Trim to max 40 chars
    const trimmed = path.length > 45 ? path.slice(0, 42) + "..." : path;
    return trimmed;
  } catch {
    return "";
  }
}

/* ───────────── MAIN COMPONENT ───────────── */

export interface LinkPreviewBubbleProps {
  url: string;
  isMine: boolean;
  theme: ChatTheme;
}

export function LinkPreviewBubble({ url, isMine, theme }: LinkPreviewBubbleProps) {
  const platform = detectPlatform(url);
  const displayUrl = cleanUrl(url);
  const path = getPath(url);

  const handlePress = () => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={[
        ls.card,
        {
          backgroundColor: platform.gradient[0],
          borderColor: platform.gradient[1] + "30",
        },
      ]}
    >
      {/* Subtle gradient overlay */}
      <View
        style={[
          ls.gradientOverlay,
          { backgroundColor: platform.gradient[1], opacity: 0.25 },
        ]}
      />

      <View style={ls.row}>
        {/* Icon circle */}
        <View style={[ls.iconCircle, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          {getPlatformIcon(platform.id)}
        </View>

        {/* Text content */}
        <View style={ls.textContainer}>
          <Text style={[ls.platformLabel, { color: platform.textColor }]}>
            {platform.label}
          </Text>
          <Text
            style={[ls.urlText, { color: platform.subtitleColor }]}
            numberOfLines={2}
          >
            {path || displayUrl}
          </Text>
        </View>

        {/* Arrow indicator */}
        <View style={ls.arrowContainer}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M7 17L17 7M17 7H7M17 7V17"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ───────────── HELPER: Render text with inline links ───────────── */

export interface RichTextProps {
  text: string;
  textStyle: any;
  linkColor?: string;
}

export function RichText({ text, textStyle, linkColor = "#4FC3F7" }: RichTextProps) {
  // Reset global regex lastIndex
  URL_REGEX.lastIndex = 0;

  const parts: { type: "text" | "link"; value: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Create a fresh regex for iteration to avoid lastIndex issues
  const regex = new RegExp(URL_REGEX.source, "gi");

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", value: match[0] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <Text style={textStyle}>{text}</Text>;
  }

  return (
    <Text style={textStyle}>
      {parts.map((p, i) =>
        p.type === "link" ? (
          <Text
            key={i}
            style={{ color: linkColor, textDecorationLine: "underline" }}
            onPress={() => Linking.openURL(p.value).catch(() => {})}
          >
            {p.value}
          </Text>
        ) : (
          <Text key={i}>{p.value}</Text>
        ),
      )}
    </Text>
  );
}

/* ───────────── STYLES ───────────── */

const ls = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 6,
    marginBottom: 2,
    borderWidth: 1,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  platformLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  urlText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11.5,
    lineHeight: 16,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default LinkPreviewBubble;
