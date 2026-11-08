// ============================================================================
// Mizan (ميزان) - Password Hashing Utility
// Built with Node.js crypto.scrypt (constant-time, salted, collision & timing attack resistant)
// ============================================================================

import * as crypto from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export class PasswordUtil {
  /**
   * Hashes a plaintext password with a random cryptographically secure salt.
   * Format: scrypt$<N>$<r>$<p>$<salt_hex>$<key_hex>
   */
  public static async hash(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(SALT_LENGTH);
      crypto.scrypt(
        password,
        salt,
        KEY_LENGTH,
        { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 32 * 1024 * 1024 },
        (err, derivedKey) => {
          if (err) return reject(err);
          const hashString = `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
          resolve(hashString);
        }
      );
    });
  }

  /**
   * Synchronous hash for tests or deterministic seed execution
   */
  public static hashSync(password: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const derivedKey = crypto.scryptSync(
      password,
      salt,
      KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 32 * 1024 * 1024 }
    );
    return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
  }

  /**
   * Verifies plaintext password against a stored scrypt hash string in constant time
   */
  public static async verify(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash || !storedHash.startsWith('scrypt$')) {
      return false;
    }

    const parts = storedHash.split('$');
    if (parts.length !== 6) {
      return false;
    }

    const [, nStr, rStr, pStr, saltHex, originalKeyHex] = parts;
    const n = parseInt(nStr, 10);
    const r = parseInt(rStr, 10);
    const p = parseInt(pStr, 10);
    const salt = Buffer.from(saltHex, 'hex');
    const originalKey = Buffer.from(originalKeyHex, 'hex');

    return new Promise((resolve) => {
      crypto.scrypt(
        password,
        salt,
        originalKey.length,
        { N: n, r, p, maxmem: 32 * 1024 * 1024 },
        (err, derivedKey) => {
          if (err) return resolve(false);
          try {
            resolve(crypto.timingSafeEqual(originalKey, derivedKey));
          } catch {
            resolve(false);
          }
        }
      );
    });
  }

  /**
   * Synchronous verify
   */
  public static verifySync(password: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.startsWith('scrypt$')) {
      return false;
    }

    const parts = storedHash.split('$');
    if (parts.length !== 6) {
      return false;
    }

    const [, nStr, rStr, pStr, saltHex, originalKeyHex] = parts;
    const n = parseInt(nStr, 10);
    const r = parseInt(rStr, 10);
    const p = parseInt(pStr, 10);
    const salt = Buffer.from(saltHex, 'hex');
    const originalKey = Buffer.from(originalKeyHex, 'hex');

    try {
      const derivedKey = crypto.scryptSync(
        password,
        salt,
        originalKey.length,
        { N: n, r, p, maxmem: 32 * 1024 * 1024 }
      );
      return crypto.timingSafeEqual(originalKey, derivedKey);
    } catch {
      return false;
    }
  }
}
