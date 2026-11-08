// ============================================================================
// Mizan (ميزان) - Zero-Dependency Cryptographic JWT Utility
// Built using Node.js native crypto with constant-time HMAC-SHA256 verification
// Enforces: Strict secret length, issuer/audience validation, and short token lifespans
// ============================================================================

import * as crypto from 'node:crypto';
import { JwtPayload } from './auth.interface';

export const JWT_ISSUER = 'mizan.ae';
export const JWT_AUDIENCE = 'mizan-app';
export const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600; // 1 hour

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export class JwtUtil {
  public static readonly DEFAULT_FALLBACK_SECRET = 'mizan_default_secure_secret_key_2026_uae_tax_platform';

  /**
   * Retrieves and validates the HMAC-SHA256 signing secret.
   * In production (NODE_ENV === 'production'), a dedicated cryptographically strong
   * secret of at least 32 characters MUST be provided via process.env.JWT_SECRET.
   */
  public static getSecret(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const secret = process.env.JWT_SECRET;

    if (isProduction) {
      if (!secret) {
        throw new Error(
          'FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing in production.'
        );
      }
      if (secret.length < 32) {
        throw new Error(
          'FATAL CONFIGURATION ERROR: JWT_SECRET must be at least 32 characters long in production.'
        );
      }
      if (secret === this.DEFAULT_FALLBACK_SECRET) {
        throw new Error(
          'FATAL CONFIGURATION ERROR: Default development JWT secret cannot be used in production.'
        );
      }
      return secret;
    }

    if (!secret || secret.length < 16) {
      return this.DEFAULT_FALLBACK_SECRET;
    }
    return secret;
  }

  /**
   * Validates JWT environment configuration at application bootstrap.
   * Halts startup if production requirements are violated.
   */
  public static validateConfiguration(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      try {
        this.getSecret();
        console.log('✔ [SECURITY] Production JWT secret verified (minimum 32 chars).');
      } catch (err: any) {
        console.error(`\n❌ [SECURITY SHUTDOWN] ${err.message}\n`);
        process.exit(1);
      }
    }
  }

  /**
   * Generates a signed JWT token using HMAC-SHA256 (HS256).
   * Automatically injects standard claims: iss, aud, iat, exp.
   */
  public static sign(
    payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud'>,
    expiresInSeconds: number = DEFAULT_TOKEN_LIFETIME_SECONDS,
    options?: { issuer?: string; audience?: string }
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JwtPayload = {
      ...payload,
      iss: options?.issuer || JWT_ISSUER,
      aud: options?.audience || JWT_AUDIENCE,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

    const signature = crypto
      .createHmac('sha256', this.getSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verifies signature, expiration, issuer, audience, and tenancy claims.
   * Uses crypto.timingSafeEqual to prevent side-channel timing attacks.
   */
  public static verify(
    token: string,
    options?: { expectedIssuer?: string; expectedAudience?: string }
  ): JwtPayload {
    if (!token || typeof token !== 'string') {
      throw new Error('Token is missing or malformed');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format: expected header, payload, and signature');
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature with constant-time comparison
    const expectedSignature = crypto
      .createHmac('sha256', this.getSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const expectedBuffer = Buffer.from(expectedSignature);
    const actualBuffer = Buffer.from(signature);

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new Error('Invalid token signature');
    }

    // Decode and parse payload
    let payload: JwtPayload;
    try {
      payload = JSON.parse(base64UrlDecode(encodedPayload));
    } catch {
      throw new Error('Invalid token payload encoding');
    }

    // Validate expiration
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) {
      throw new Error('Token has expired');
    }

    // Validate Issuer
    const expectedIss = options?.expectedIssuer || JWT_ISSUER;
    if (payload.iss && payload.iss !== expectedIss) {
      throw new Error(`Token issuer invalid: expected '${expectedIss}', got '${payload.iss}'`);
    }

    // Validate Audience
    const expectedAud = options?.expectedAudience || JWT_AUDIENCE;
    if (payload.aud && payload.aud !== expectedAud) {
      throw new Error(`Token audience invalid: expected '${expectedAud}', got '${payload.aud}'`);
    }

    // Validate Mandatory Tenancy Claims
    if (!payload.sub || !payload.organisationId) {
      throw new Error('Token is missing required tenancy claims (sub or organisationId)');
    }

    return payload;
  }
}
