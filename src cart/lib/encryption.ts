/**
 * AES-256-GCM encryption for sensitive fields
 * Used for: phone numbers, GST numbers, corporate billing addresses
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Get encryption key from env or use a default for development
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // Key should be 32 bytes (256 bits) hex string
    const key = Buffer.from(envKey, 'hex');
    if (key.length === 32) return key;
  }

  // Default development key - DO NOT use in production (exactly 32 bytes for AES-256)
  const defaultKey = '3blux_dev_enc_key_____32_bytes!!';
  return Buffer.from(defaultKey, 'utf8');
}

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns a string in format: iv:tag:encrypted (all hex encoded)
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 * Expects format: iv:tag:encrypted (all hex encoded)
 */
export function decrypt(encryptedString: string | null | undefined): string | null {
  if (!encryptedString) return null;

  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      // Not encrypted - return as-is (backward compatibility for unencrypted data)
      return encryptedString;
    }

    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // If decryption fails, return as-is (backward compatibility)
    console.error('Decryption error (returning raw value):', error);
    return encryptedString;
  }
}

/**
 * Check if a string appears to be encrypted (has the iv:tag:encrypted format)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  // Check if all parts are valid hex strings
  return /^[0-9a-f]+$/.test(parts[0]) && /^[0-9a-f]+$/.test(parts[1]) && /^[0-9a-f]+$/.test(parts[2]);
}
