// ============================================================================
// Mizan (ميزان) - NestJS API Server Bootstrap
// Swagger OpenAPI Documentation, Global Validation Pipe & CORS
// ============================================================================

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for mobile Expo and web clients
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Global Validation Pipe with automatic DTO stripping
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // Swagger OpenAPI Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Mizan (ميزان) - UAE Tax Intelligence API')
    .setDescription(
      'Deterministic Corporate Tax, VAT, Trade License Ingestion, and EmaraTax Readiness Engine'
    )
    .setVersion('1.0.0')
    .addTag('Businesses & Trade Licenses')
    .addTag('Tax Intelligence')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀 Mizan Tax Intelligence API running on http://localhost:${port}`);
  console.log(`📚 Swagger OpenAPI Documentation available at http://localhost:${port}/api/docs\n`);
}

bootstrap();
