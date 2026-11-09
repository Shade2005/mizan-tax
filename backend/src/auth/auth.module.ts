import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { AuthController } from './auth.controller';
import { FirebaseService } from './firebase.service';
import { RateLimiterService } from '../security/rate-limiter';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, FirebaseService, RateLimiterService],
  exports: [AuthService, AuthGuard, FirebaseService, RateLimiterService],
})
export class AuthModule {}
