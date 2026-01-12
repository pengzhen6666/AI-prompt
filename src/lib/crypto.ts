/**
 * Crypto utility for AES-GCM encryption/decryption
 * Used for securing sensitive AI request data
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // Standard 12 bytes for GCM

/**
 * Derives a CryptoKey from a raw string password
 */
async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);

  // Use SHA-256 to ensure we have a 32-byte key for AES-256
  const hash = await crypto.subtle.digest("SHA-256", passwordBuffer);

  return await crypto.subtle.importKey(
    "raw",
    hash,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Helper to convert Uint8Array to Base64 in a stack-safe way
 */
function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

/**
 * Helper to convert Base64 to Uint8Array in a stack-safe way
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypts a string using a password
 * Returns Base64(IV + Ciphertext + Tag)
 */
export async function encryptData(
  data: string,
  password: string
): Promise<string> {
  if (!password) throw new Error("Encryption key is missing");

  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    enc.encode(data)
  );

  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);

  return uint8ArrayToBase64(combined);
}

/**
 * Decrypts a Base64 string (IV + Ciphertext + Tag) using a password
 */
export async function decryptData(
  base64Data: string,
  password: string
): Promise<string> {
  if (!password) throw new Error("Encryption key is missing");

  const combined = base64ToUint8Array(base64Data);

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const key = await deriveKey(password);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}
