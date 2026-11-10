// ============================================================================
// Mizan (ميزان) - Authentication Controller
// Production User Registration, Login, Token Issuance, and Identity Resolution
// Gated against brute-force attacks with sliding-window rate limiting
// ============================================================================

import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { AuthenticatedUser } from './auth.interface';
import { RateLimiterService } from '../security/rate-limiter';

export class RegisterRequestDto {
  @ApiProperty({ example: 'ahmed.almansoori@example.ae', description: 'User corporate or professional email' })
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @ApiProperty({ example: 'SecurePass2026!', minLength: 8, description: 'User password (minimum 8 characters)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @ApiProperty({ example: 'Ahmed Al Mansoori', description: 'User legal full name' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;

  @ApiProperty({ example: '+971501234567', required: false, description: 'UAE mobile phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Al Mansoori General Trading LLC', required: false, description: 'Company or Organisation name' })
  @IsOptional()
  @IsString()
  organisationName?: string;
}

export class LoginRequestDto {
  @ApiProperty({ example: 'ahmed.almansoori@example.ae', description: 'Registered user email' })
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @ApiProperty({ example: 'SecurePass2026!', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}

export class DemoTokenRequestDto {
  @ApiProperty({
    description: 'Sandbox user key for multi-tenant simulation',
    enum: ['user-a', 'user-b', 'superadmin'],
    default: 'user-a',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['user-a', 'user-b', 'superadmin'], {
    message: "userKey must be one of: 'user-a', 'user-b', 'superadmin'",
  })
  userKey?: 'user-a' | 'user-b' | 'superadmin';
}

@ApiTags('Authentication & Identity')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(RateLimiterService) private readonly rateLimiter: RateLimiterService
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Public Health check and environment probe' })
  healthCheck() {
    let dbHost = null;
    try {
      if (process.env.DATABASE_URL) {
        const u = new URL(process.env.DATABASE_URL);
        dbHost = u.host;
      }
    } catch {}

    return {
      status: 'ok',
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseHost: dbHost,
      hasDirectUrl: !!process.env.DATABASE_URL_UNPOOLED,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
      nodeEnv: process.env.NODE_ENV || 'development',
      version: '1.0.4',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user, organisation, and admin membership',
    description: 'Creates a production user record with a salted scrypt password hash, initializes their default organisation, and returns an authenticated JWT.',
  })
  @ApiResponse({ status: 201, description: 'Account successfully registered and authenticated.' })
  @ApiResponse({ status: 400, description: 'Validation failed or missing fields.' })
  @ApiResponse({ status: 409, description: 'Email address already registered.' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts.' })
  async register(@Body() body: RegisterRequestDto, @Req() req: any) {
    const clientIp = req?.ip || req?.headers?.['x-forwarded-for'] || 'client';
    // Limit to 5 registrations per 10 minutes per IP
    await this.rateLimiter.enforce(clientIp, 'auth:register', 5, 600);

    return this.authService.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with email and password',
    description: 'Verifies user password against the salted scrypt hash and returns an authenticated JWT with active tenant claims.',
  })
  @ApiResponse({ status: 200, description: 'Authentication successful. Returns JWT token and profile.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  @ApiResponse({ status: 429, description: 'Too many failed login attempts. Rate limited.' })
  async login(@Body() body: LoginRequestDto, @Req() req: any) {
    const clientIp = req?.ip || req?.headers?.['x-forwarded-for'] || 'client';
    // Limit to 5 login attempts per minute per IP to prevent brute-forcing
    await this.rateLimiter.enforce(clientIp, 'auth:login', 5, 60);

    return this.authService.login(body);
  }

  @Public()
  @Post('demo-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue a signed JWT token for User A (FlexFlow) or User B (Competitor)',
    description:
      'Generates signed HS256 JWT tokens with organization tenancy claims for testing multi-tenant isolation. Strictly disabled in production environments.',
  })
  @ApiResponse({ status: 200, description: 'Signed JWT token with user tenancy payload.' })
  @ApiResponse({ status: 403, description: 'Forbidden in production environments.' })
  @ApiResponse({ status: 429, description: 'Too many token requests. Rate limited.' })
  async issueDemoToken(@Body() body: DemoTokenRequestDto, @Req() req: any) {
    const clientIp = req?.ip || req?.headers?.['x-forwarded-for'] || 'demo-client';
    await this.rateLimiter.enforce(clientIp, 'auth:demo-token', 10, 60);

    return this.authService.issueDemoToken(body?.userKey || 'user-a');
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile & organisations' })
  @ApiResponse({ status: 200, description: 'Current authenticated identity, user details, and active organisation.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: missing or invalid JWT.' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getUserProfile(user);
  }

  @Post('sync')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync Firebase authenticated user with PostgreSQL and return profile' })
  @ApiResponse({ status: 200, description: 'User synced successfully.' })
  async syncFirebaseUser(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getUserProfile(user);
  }
}
