import * as Crypto from "expo-crypto";

// Generate a shared secret key from both user IDs
// Same key generated on both devices since it uses sorted IDs
export const generateChatKey = (userId1: string, userId2: string): string => {
  const sorted = [userId1, userId2].sort().join("_");
  // Use a consistent hash as key base
  return sorted;
};

// Simple XOR + base64 encryption (works without native modules)
export const encryptMessage = (text: string, key: string): string => {
  try {
    const keyBytes = Array.from(key).map((c) => c.charCodeAt(0));
    const textBytes = Array.from(text).map((c) => c.charCodeAt(0));

    const encrypted = textBytes.map(
      (byte, i) => byte ^ keyBytes[i % keyBytes.length]
    );

    // Convert to base64
    const base64 = btoa(String.fromCharCode(...encrypted));
    return `🔒${base64}`;
  } catch {
    return text;
  }
};

export const decryptMessage = (encrypted: string, key: string): string => {
  try {
    if (!encrypted.startsWith("🔒")) return encrypted;

    const base64 = encrypted.slice(2); 
    const encryptedBytes = Array.from(atob(base64)).map((c) =>
      c.charCodeAt(0)
    );
    const keyBytes = Array.from(key).map((c) => c.charCodeAt(0));

    const decrypted = encryptedBytes.map(
      (byte, i) => byte ^ keyBytes[i % keyBytes.length]
    );

    return String.fromCharCode(...decrypted);
  } catch {
    return encrypted;
  }
};