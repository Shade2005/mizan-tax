// ============================================================================
// Mizan (ميزان) - NestJS API Server Bootstrap
// Hardened CORS Allowlist, Global DTO Validation, and Bearer Auth OpenAPI
// ============================================================================

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JwtUtil } from './auth/jwt.util';

async function bootstrap() {
  // Enforce zero-trust cryptographic secrets check before bootstrapping services
  JwtUtil.validateConfiguration();

  const app = await NestFactory.create(AppModule);

  // Configured trusted origins allowlist (replaces wildcard '*')
  const defaultAllowedOrigins = [
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3000',
    'http://127.0.0.1:8081',
    'https://mizan.ae',
    'https://app.mizan.ae',
    'https://mizan-api-jpen.onrender.com',
  ];

  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : defaultAllowedOrigins;

  app.enableCors({
    origin: (origin, callback) => {
      // Mobile native requests do not send an Origin header; allow them
      if (!origin || configuredOrigins.includes(origin) || configuredOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin '${origin}' is not permitted by Mizan CORS policy`));
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global Validation Pipe with strict unknown property rejection
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true, // Reject unexpected fields to prevent parameter pollution
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger OpenAPI Documentation Setup with Bearer Authentication
  const config = new DocumentBuilder()
    .setTitle('Mizan (ميزان) - UAE Tax Intelligence API')
    .setDescription(
      'Deterministic Corporate Tax, VAT, Trade License Ingestion, and EmaraTax Readiness Engine'
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your signed JWT token (e.g. from POST /api/v1/auth/demo-token)',
        in: 'header',
      },
      'bearer'
    )
    .addTag('Authentication & Identity')
    .addTag('Businesses & Trade Licenses')
    .addTag('Tax Intelligence')
    .addTag('OCR & Document Recognition')
    .addTag('Invoicing & Expense Classification')
    .addTag('Grounded AI Tax Assistant')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀 Mizan Tax Intelligence API running on http://localhost:${port}`);
  console.log(`📚 Swagger OpenAPI Documentation available at http://localhost:${port}/api/docs\n`);
}

bootstrap();
