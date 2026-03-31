/**
 * stickers.ts
 *
 * Built-in sticker packs definition.
 * Add your own PNG/WebP/GIF URLs here — host them on Supabase Storage,
 * CDN, or bundle them locally with require().
 *
 * Structure:
 *   STICKER_PACKS → array of StickerPack
 *   Each pack has an id, name, cover (shown on tab), and array of Sticker
 *   Each sticker has an id and url
 *
 * To add a new pack:
 *   1. Upload images to Supabase Storage bucket "stickers" (public)
 *   2. Add a new entry to STICKER_PACKS below
 */

export interface Stickers {
  id: string;
  url: string;
  /** Optional: width/height hint so grid doesn't jump on load */
  width?: number;
  height?: number;
}

export interface StickerPack {
  id: string;
  name: string;
  /** URL of the sticker shown as the tab icon */
  cover: string;
  stickers: Stickers[];
}

// ─── PACK HELPERS ─────────────────────────────────────────────────────────────

/** Quick helper to build a sticker object */
const s = (id: string, url: string): Stickers => ({ id, url });

/**
 * Replace the URLs below with your actual hosted sticker images.
 * Using placeholder URLs here so the structure is clear.
 *
 * Recommended: Upload to Supabase Storage
 *   supabase.storage.from("stickers").getPublicUrl("pack1/s1.png")
 */

// ─── BUILT-IN PACKS ───────────────────────────────────────────────────────────

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "pack_vibes",
    name: "Vibes",
    cover: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif",
    stickers: [
      s("v1",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif"),
      s("v2",  "https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif"),
      s("v3",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif"),
      s("v4",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.gif"),
      s("v5",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.gif"),
      s("v6",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif"),
      s("v7",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f48b/512.gif"),
      s("v8",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f31f/512.gif"),
      s("v9",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4ab/512.gif"),
      s("v10", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f308/512.gif"),
      s("v11", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f381/512.gif"),
      s("v12", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f388/512.gif"),
      s('v13','https://1024terabox.com/s/1qWPR4xtZ-k49Iec0FLivgw')
    ],
  },
  {
    id: "pack_mood",
    name: "Mood",
    cover: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.gif",
    stickers: [
      s("m1",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.gif"),
      s("m2",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.gif"),
      s("m3",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/512.gif"),
      s("m4",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f97a/512.gif"),
      s("m5",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f910/512.gif"),
      s("m6",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f975/512.gif"),
      s("m7",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f976/512.gif"),
      s("m8",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.gif"),
      s("m9",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f644/512.gif"),
      s("m10", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62b/512.gif"),
      s("m11", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f924/512.gif"),
      s("m12", "https://fonts.gstatic.com/s/e/notoemoji/latest/1fae0/512.gif"),
    ],
  },
  {
    id: "pack_animals",
    name: "Animals",
    cover: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f436/512.gif",
    stickers: [
      s("a1",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f436/512.gif"),
      s("a2",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f431/512.gif"),
      s("a3",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f43c/512.gif"),
      s("a4",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f43b/512.gif"),
      s("a5",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f98a/512.gif"),
      s("a6",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f430/512.gif"),
      s("a7",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f439/512.gif"),
      s("a8",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f42f/512.gif"),
      s("a9",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f98b/512.gif"),
      s("a10", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f99c/512.gif"),
      s("a11", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f40c/512.gif"),
      s("a12", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f433/512.gif"),
    ],
  },
  {
    id: "pack_food",
    name: "Food",
    cover: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f355/512.gif",
    stickers: [
      s("f1",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f355/512.gif"),
      s("f2",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f354/512.gif"),
      s("f3",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f363/512.gif"),
      s("f4",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f370/512.gif"),
      s("f5",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f369/512.gif"),
      s("f6",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f36a/512.gif"),
      s("f7",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f382/512.gif"),
      s("f8",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f377/512.gif"),
      s("f9",  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f37a/512.gif"),
      s("f10", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f375/512.gif"),
      s("f11", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f366/512.gif"),
      s("f12", "https://fonts.gstatic.com/s/e/notoemoji/latest/1f353/512.gif"),
    ],
  },
];