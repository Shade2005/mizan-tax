// ============================================================================
// Mizan (ميزان) - Firebase Admin Authentication Service
// Verifies Firebase ID Tokens (issued to Mobile App via Email/Password & Google)
// and provisions synchronized PostgreSQL User, Organisation & Membership records.
// ============================================================================

import {
  Injectable,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserRole } from './auth.interface';

@Injectable()
export class FirebaseService {
  private static appInstance: App | null = null;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService
  ) {
    FirebaseService.initAdmin();
  }

  public static initAdmin(): App {
    if (this.appInstance) return this.appInstance;

    // Check if already initialized globally
    const apps = getApps();
    if (apps.length > 0 && apps[0]) {
      this.appInstance = apps[0];
      return this.appInstance;
    }

    // 1. Check if FIREBASE_SERVICE_ACCOUNT is provided in environment variables (for Render)
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      try {
        const parsed = JSON.parse(serviceAccountEnv);
        this.appInstance = initializeApp({
          credential: cert(parsed),
          projectId: parsed.project_id || 'mizan-tax',
        });
        console.log('✔ [Firebase Admin] Initialized using FIREBASE_SERVICE_ACCOUNT environment variable.');
        return this.appInstance;
      } catch {
        if (fs.existsSync(serviceAccountEnv)) {
          this.appInstance = initializeApp({
            credential: cert(serviceAccountEnv),
            projectId: 'mizan-tax',
          });
          console.log('✔ [Firebase Admin] Initialized using file path from FIREBASE_SERVICE_ACCOUNT.');
          return this.appInstance;
        }
      }
    }

    // 2. Check for local firebase-service-account.json in backend directory
    const candidates = [
      path.resolve(process.cwd(), 'firebase-service-account.json'),
      path.resolve(__dirname, '../../firebase-service-account.json'),
      path.resolve(__dirname, '../../../firebase-service-account.json'),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          const content = JSON.parse(fs.readFileSync(cand, 'utf8'));
          this.appInstance = initializeApp({
            credential: cert(content),
            projectId: content.project_id || 'mizan-tax',
          });
          console.log(`✔ [Firebase Admin] Initialized using local service account key at ${cand}`);
          return this.appInstance;
        } catch (err: any) {
          console.warn(`[Firebase Admin] Failed parsing ${cand}: ${err?.message}`);
        }
      }
    }

    // 3. Fallback: Initialize with projectId (can verify ID tokens via Google x509 public certificates)
    const projectId = process.env.FIREBASE_PROJECT_ID || 'mizan-tax';
    this.appInstance = initializeApp({
      projectId,
    });
    console.log(`✔ [Firebase Admin] Initialized with projectId fallback: ${projectId}`);
    return this.appInstance;
  }

  /**
   * Verifies a Firebase ID token and returns decoded token claims
   */
  public async verifyIdToken(token: string): Promise<DecodedIdToken> {
    const app = FirebaseService.initAdmin();
    try {
      return await getAuth(app).verifyIdToken(token);
    } catch (err: any) {
      throw new UnauthorizedException(
        err?.message ? `Firebase token validation failed: ${err.message}` : 'Invalid Firebase ID token'
      );
    }
  }

  /**
   * Verifies Firebase token directly and statelessly.
   * With user data stored in Cloud Firestore, Firebase-authenticated users
   * do not depend on blocking Neon PostgreSQL round-trips for OCR or AI services.
   */
  public async validateAndSyncUser(token: string): Promise<AuthenticatedUser> {
    const decoded = await this.verifyIdToken(token);
    const email = decoded.email?.trim().toLowerCase();
    const uid = decoded.uid;

    if (!email) {
      throw new UnauthorizedException('Firebase user has no verified email address associated.');
    }

    // Pure stateless session resolution from verified Firebase cryptographic claims
    return {
      userId: uid,
      organisationId: `org-${uid}`,
      role: 'ADMIN' as UserRole,
      email,
    };
  }
}
