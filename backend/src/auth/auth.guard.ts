// ============================================================================
// Mizan (ميزان) - Global Authentication Guard
// Validates Firebase ID Tokens (with automatic User/Org synchronization in PostgreSQL)
// with backward-compatible fallback to local JWTs for test suites.
// ============================================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Public routes explicitly bypass authentication
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader) {
      throw new UnauthorizedException(
        'Missing Authorization header. Expected Bearer <token>.'
      );
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException(
        'Invalid Authorization format. Expected Bearer <token>.'
      );
    }

    const token = parts[1];

    // 1. Try Firebase ID Token verification & database synchronization
    try {
      const user = await this.firebaseService.validateAndSyncUser(token);
      request.user = user;
      return true;
    } catch (fbErr: any) {
      // 2. Fallback to local JWT (allows existing integration & test suites to pass)
      try {
        const user = this.authService.validateToken(token);
        request.user = user;
        return true;
      } catch {
        throw new UnauthorizedException(
          fbErr?.message || 'Invalid or expired authentication token.'
        );
      }
    }
  }
}
