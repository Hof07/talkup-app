import CryptoJS from "crypto-js";

export const generateChatKey = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join("_");
};


export const encryptMessage = (text: string, key: string): string => {
  if (!text) return "";
  try {
    const hash = CryptoJS.SHA256(key);
    
    const iv = CryptoJS.enc.Hex.parse(hash.toString().substring(0, 32));

    const encrypted = CryptoJS.AES.encrypt(text, hash, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return `🛡️${encrypted.toString()}`;
  } catch (e) {
    console.error("Encryption failed:", e);
    return text;
  }
};


export const decryptMessage = (encrypted: string, key: string): string => {
  if (!encrypted) return "";

  try {
    if (encrypted.startsWith("🛡️")) {
      const cipherText = encrypted.slice("🛡️".length);

      const hash = CryptoJS.SHA256(key);
      const iv = CryptoJS.enc.Hex.parse(hash.toString().substring(0, 32));

      const bytes = CryptoJS.AES.decrypt(cipherText, hash, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      return decryptedText || "🔒 Decryption Failed";
    }
         if (encrypted.startsWith("🔒")) {
      try {
        const base64 = encrypted.slice("🔒".length); 
        const decoded = typeof atob !== "undefined" ? atob(base64) : "";
        if (!decoded) return encrypted;

        const encryptedBytes = Array.from(decoded).map((c) => c.charCodeAt(0));
        const keyBytes = Array.from(key).map((c) => c.charCodeAt(0));
        const decrypted = encryptedBytes.map(
          (byte, i) => byte ^ keyBytes[i % keyBytes.length]
        );

        return String.fromCharCode(...decrypted);
      } catch {
        return encrypted;
      }
    }

    return encrypted;
  } catch (error) {
    return encrypted;
  }
};