import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { AuthController } from './auth.controller';
import { RateLimiterService } from '../security/rate-limiter';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RateLimiterService],
  exports: [AuthService, AuthGuard, RateLimiterService],
})
export class AuthModule {}
