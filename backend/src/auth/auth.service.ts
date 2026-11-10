// ============================================================================
// Mizan (ميزان) - Authentication & Token Service
// Manages JWT issuance, verification, user registration, and tenant resolution
// ============================================================================

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  Optional,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  AuthSuccessResponse,
  UserProfileResponse,
  UserRole,
} from './auth.interface';
import { JwtUtil, DEFAULT_TOKEN_LIFETIME_SECONDS } from './jwt.util';
import { PasswordUtil } from './password.util';
import { PrismaService } from '../prisma/prisma.service';

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  organisationName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService
  ) {}

  private getPrisma(): PrismaService {
    if (!this.prisma) {
      throw new Error('PrismaService is required for database authentication operations.');
    }
    return this.prisma;
  }

  /**
   * Signs a JWT with the user's identity and organization boundary
   */
  public generateToken(user: AuthenticatedUser, expiresInSeconds?: number): string {
    return JwtUtil.sign(
      {
        sub: user.userId,
        organisationId: user.organisationId,
        role: user.role,
        email: user.email,
      },
      expiresInSeconds || DEFAULT_TOKEN_LIFETIME_SECONDS
    );
  }

  /**
   * Validates a raw JWT string and returns the verified user context
   */
  public validateToken(token: string): AuthenticatedUser {
    try {
      const payload = JwtUtil.verify(token);
      return {
        userId: payload.sub,
        organisationId: payload.organisationId,
        role: payload.role as UserRole,
        email: payload.email,
      };
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Invalid authentication token');
    }
  }

  /**
   * Registers a new production user, their default organization, and an ADMIN membership
   */
  public async register(dto: RegisterDto): Promise<AuthSuccessResponse> {
    const email = dto.email?.trim().toLowerCase();
    const fullName = dto.fullName?.trim();
    const password = dto.password;

    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }
    if (!fullName || fullName.length < 2) {
      throw new BadRequestException('Full name must be at least 2 characters');
    }
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const prisma = this.getPrisma();
    // Check for existing user with this email
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const phone = dto.phone?.trim() || null;
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        throw new ConflictException('An account with this phone number already exists');
      }
    }

    // Securely hash password using scrypt with cryptographically random salt
    const passwordHash = await PasswordUtil.hash(password);
    const orgName = dto.organisationName?.trim() || `${fullName}'s Business`;

    // Atomically create Organisation, User, and Membership
    let result: { user: any; organisation: any; membership: any };
    try {
      result = await prisma.$transaction(async (tx) => {
        const organisation = await tx.organisation.create({
          data: {
            name: orgName,
            legalName: orgName,
          },
        });

        const user = await tx.user.create({
          data: {
            email,
            fullName,
            phone,
            passwordHash,
            isActive: true,
          },
        });

        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            organisationId: organisation.id,
            role: 'ADMIN',
          },
        });

        return { user, organisation, membership };
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const targets = err?.meta?.target || [];
        if (targets.includes('phone')) {
          throw new ConflictException('An account with this phone number already exists');
        }
        throw new ConflictException('An account with this email address already exists');
      }
      throw err;
    }

    const authenticatedUser: AuthenticatedUser = {
      userId: result.user.id,
      organisationId: result.organisation.id,
      role: 'ADMIN',
      email: result.user.email,
    };

    const token = this.generateToken(authenticatedUser);

    return {
      accessToken: token,
      expiresIn: DEFAULT_TOKEN_LIFETIME_SECONDS,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        phone: result.user.phone,
      },
      organisation: {
        id: result.organisation.id,
        name: result.organisation.name,
        role: 'ADMIN',
      },
    };
  }

  /**
   * Authenticates user credentials and returns signed session token
   */
  public async login(dto: LoginDto): Promise<AuthSuccessResponse> {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const prisma = this.getPrisma();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organisation: true,
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await PasswordUtil.verify(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('This account has been deactivated. Please contact support.');
    }

    // Determine active organisation from memberships (or create a default one if none exists)
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

    const role = (activeMembership.role || 'ADMIN') as UserRole;
    const organisationId = activeMembership.organisationId;

    const authenticatedUser: AuthenticatedUser = {
      userId: user.id,
      organisationId,
      role,
      email: user.email,
    };

    const token = this.generateToken(authenticatedUser);

    return {
      accessToken: token,
      expiresIn: DEFAULT_TOKEN_LIFETIME_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
      },
      organisation: {
        id: organisationId,
        name: activeMembership.organisation.name,
        role,
      },
    };
  }

  /**
   * Retrieves complete user profile and organisations
   */
  public async getUserProfile(currentUser: AuthenticatedUser): Promise<UserProfileResponse> {
    const prisma = this.getPrisma();
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        include: {
          memberships: {
            include: {
              organisation: true,
            },
          },
        },
      });
    } catch (dbErr: any) {
      console.warn('PostgreSQL profile lookup notice (stateless fallback):', dbErr?.message || dbErr);
    }

    if (!user) {
      // Fallback if demo user without DB row
      return {
        authenticated: true,
        user: {
          id: currentUser.userId,
          email: currentUser.email,
          fullName: currentUser.email.split('@')[0],
          phone: null,
          avatarUrl: null,
          isBiometricOn: false,
          createdAt: new Date().toISOString(),
        },
        activeOrganisation: {
          id: currentUser.organisationId,
          name: 'Demo Organisation',
          role: currentUser.role,
        },
        organisations: [
          {
            id: currentUser.organisationId,
            name: 'Demo Organisation',
            role: currentUser.role,
          },
        ],
      };
    }

    const orgs = user.memberships.map((m) => ({
      id: m.organisationId,
      name: m.organisation.name,
      role: m.role as UserRole,
    }));

    const activeOrg =
      orgs.find((o) => o.id === currentUser.organisationId) ||
      orgs[0] || {
        id: currentUser.organisationId,
        name: 'Default Organisation',
        role: currentUser.role,
      };

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isBiometricOn: user.isBiometricOn,
        createdAt: user.createdAt.toISOString(),
      },
      activeOrganisation: activeOrg,
      organisations: orgs,
    };
  }

  /**
   * Pre-configured test/demo users for multi-tenant isolation testing & local development
   */
  public getDemoUsers(): Record<string, AuthenticatedUser> {
    return {
      'user-a': {
        userId: 'usr-org-a-101',
        organisationId: 'org-a-flexflow',
        role: 'ADMIN',
        email: 'hamza@flexflow.ae',
      },
      'user-b': {
        userId: 'usr-org-b-202',
        organisationId: 'org-b-competitor',
        role: 'ADMIN',
        email: 'tariq@skyline.ae',
      },
      superadmin: {
        userId: 'usr-super-999',
        organisationId: 'org-platform-super',
        role: 'SUPERADMIN',
        email: 'compliance@mizan.ae',
      },
    };
  }

  /**
   * Issue a demo token for quick sandbox authentication.
   * Gated strictly: Forbidden in production environments unless explicitly enabled by ENABLE_DEMO_AUTH=true.
   */
  public issueDemoToken(userKey: 'user-a' | 'user-b' | 'superadmin' = 'user-a'): {
    accessToken: string;
    user: AuthenticatedUser;
    expiresIn: number;
  } {
    const isProduction = process.env.NODE_ENV === 'production';
    const enableDemoAuth = process.env.ENABLE_DEMO_AUTH === 'true';

    if (isProduction && !enableDemoAuth) {
      throw new ForbiddenException(
        'Demo authentication endpoint is strictly disabled in production environments. Authenticate using enterprise credentials.'
      );
    }

    const demoUsers = this.getDemoUsers();
    if (!demoUsers[userKey]) {
      throw new BadRequestException(
        `Invalid user key '${userKey}'. Permitted sandbox identities: user-a, user-b, superadmin.`
      );
    }

    const user = demoUsers[userKey];
    const token = this.generateToken(user, 3600);

    return {
      accessToken: token,
      user,
      expiresIn: 3600,
    };
  }
}
