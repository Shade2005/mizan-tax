// ============================================================================
// Mizan (ميزان) - Authentication & Identity Interfaces
// ============================================================================

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'ACCOUNTANT' | 'BOOKKEEPER' | 'VIEWER';

export interface AuthenticatedUser {
  userId: string;
  organisationId: string;
  role: UserRole;
  email: string;
}

export interface JwtPayload {
  sub: string;             // User ID
  organisationId: string;  // Multi-tenant organisation boundary
  role: UserRole;
  email: string;
  iss?: string;            // Issuer (e.g. 'mizan.ae')
  aud?: string;            // Audience (e.g. 'mizan-app')
  iat: number;             // Issued at (seconds)
  exp: number;             // Expiry (seconds)
}

export interface AuthSuccessResponse {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
  };
  organisation: {
    id: string;
    name: string;
    role: UserRole;
  };
}

export interface UserProfileResponse {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    avatarUrl?: string | null;
    isBiometricOn?: boolean;
    createdAt: string;
  };
  activeOrganisation: {
    id: string;
    name: string;
    role: UserRole;
  };
  organisations: Array<{
    id: string;
    name: string;
    role: UserRole;
  }>;
}
