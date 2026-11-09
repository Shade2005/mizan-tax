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
   * Verifies Firebase token and resolves/provisions corresponding PostgreSQL User & Organisation
   */
  public async validateAndSyncUser(token: string): Promise<AuthenticatedUser> {
    const decoded = await this.verifyIdToken(token);
    const email = decoded.email?.trim().toLowerCase();
    const uid = decoded.uid;

    if (!email) {
      throw new UnauthorizedException('Firebase user has no verified email address associated.');
    }

    if (!this.prisma) {
      // In offline/test environments without Prisma
      return {
        userId: uid,
        organisationId: 'org-default',
        role: 'ADMIN' as UserRole,
        email,
      };
    }

    const prisma = this.prisma;

    // 1. Locate user by firebaseUid or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ firebaseUid: uid }, { email }],
      },
      include: {
        memberships: {
          include: {
            organisation: true,
          },
        },
      },
    });

    const displayName =
      decoded.name ||
      (decoded as any).displayName ||
      email.split('@')[0] ||
      'Taxpayer';

    if (!user) {
      // 2. First-time sign in: provision new PostgreSQL User, default Organisation, and ADMIN Membership
      const orgName = `${displayName}'s Business`;
      user = await prisma.$transaction(async (tx) => {
        const org = await tx.organisation.create({
          data: {
            name: orgName,
            legalName: orgName,
          },
        });

        const newUser = await tx.user.create({
          data: {
            email,
            fullName: displayName,
            firebaseUid: uid,
            isActive: true,
          },
        });

        await tx.membership.create({
          data: {
            userId: newUser.id,
            organisationId: org.id,
            role: 'ADMIN',
          },
        });

        return tx.user.findUnique({
          where: { id: newUser.id },
          include: {
            memberships: {
              include: {
                organisation: true,
              },
            },
          },
        });
      });
    } else if (!user.firebaseUid) {
      // 3. User existed by email, link their new firebaseUid
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid: uid },
        include: {
          memberships: {
            include: {
              organisation: true,
            },
          },
        },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Failed to provision or resolve user account.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated. Please contact support.');
    }

    let activeMembership = user.memberships[0];
    if (!activeMembership) {
      const fallbackOrg = await prisma.organisation.create({
        data: {
          name: `${user.fullName}'s Business`,
        },
      });
      activeMembership = await prisma.membership.create({
        data: {
          userId: user.id,
          organisationId: fallbackOrg.id,
          role: 'ADMIN',
        },
        include: {
          organisation: true,
        },
      });
    }

    return {
      userId: user.id,
      organisationId: activeMembership.organisationId,
      role: activeMembership.role as UserRole,
      email: user.email,
    };
  }
}
