import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // Boot-time guard: refuse to start with a weak / missing API key.
  const key = process.env.INTERNAL_API_KEY;
  if (!key || key.length < 32) {
    // eslint-disable-next-line no-console
    console.error(
      '[FATAL] INTERNAL_API_KEY missing or shorter than 32 chars. ' +
        'Generate one with: openssl rand -hex 32',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Standard security headers (X-Content-Type-Options, HSTS, X-Frame-Options, …).
  app.use(helmet());

  // Limit request body size — cheap DoS mitigation.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // CORS — explicit whitelist from CORS_ORIGIN (comma-separated).
  const corsEnv = process.env.CORS_ORIGIN?.trim();
  const allowed = corsEnv
    ? corsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:5173', 'http://localhost:5174'];

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl, server-to-server, Apify webhook
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-api-key'],
  });
  Logger.log(
    `CORS allowed origins: ${allowed.join(', ') || '(none — set CORS_ORIGIN)'}`,
    'Bootstrap',
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter — generic messages in prod, full detail in logs.
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Restaff Leads API listening on :${port}`, 'Bootstrap');
}
bootstrap();
