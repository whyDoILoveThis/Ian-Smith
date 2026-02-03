import { DERIVATION_SALT } from "./constants";

// ============== E2E ENCRYPTION UTILITIES ==============

// Encode string to ArrayBuffer for crypto operations
function encodeText(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer as ArrayBuffer;
}

// Decode ArrayBuffer to string
function decodeText(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

// Convert ArrayBuffer to hex
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Convert hex to ArrayBuffer
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

// Convert ArrayBuffer to base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

// Derive an AES key from the LockBox combo
export async function deriveKeyFromCombo(
  combo: [number, number, number, number],
): Promise<CryptoKey> {
  const comboString = combo.map((n) => n.toString().padStart(4, "0")).join("-");
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encodeText(comboString),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encodeText(DERIVATION_SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// Encrypt a message using AES-256-GCM
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodeText(plaintext),
  );

  // Format: iv_hex:ciphertext_base64
  return (
    bufferToHex(iv.buffer as ArrayBuffer) + ":" + bufferToBase64(ciphertext)
  );
}

// Decrypt a message using AES-256-GCM
export async function decryptMessage(
  encrypted: string,
  key: CryptoKey,
): Promise<string> {
  const [ivHex, ciphertextB64] = encrypted.split(":");
  if (!ivHex || !ciphertextB64) {
    throw new Error("Invalid encrypted format");
  }

  const iv = hexToBuffer(ivHex);
  const ciphertext = base64ToBuffer(ciphertextB64);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return decodeText(plaintext);
}
