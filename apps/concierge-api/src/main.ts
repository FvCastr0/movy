import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // OWASP A05: Security Headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
  app.use(helmet());

  // OWASP A04: Payload Size Limits against DoS / memory exhaustion
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));

  // OWASP A05: Explicit Origin Allowlist for CORS (never wildcard '*' with credentials)
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3003'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Concierge-Internal-Key',
    ],
  });

  app.setGlobalPrefix('api/v1');

  // OWASP A03: Strict Schema Validation & Mass Assignment Prevention
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OWASP A05: Prevent stack trace & internal Prisma error leakage
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.PORT || 3002);
  await app.listen(port);
}
bootstrap();
