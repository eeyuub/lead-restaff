import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // CORS: explicit whitelist from CORS_ORIGIN (comma-separated). Default in dev only.
  const corsEnv = process.env.CORS_ORIGIN?.trim();
  const allowed = corsEnv
    ? corsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:5173', 'http://localhost:5174'];

  app.enableCors({
    origin: (origin, cb) => {
      // Same-origin / curl / server-to-server requests have no Origin header — allow.
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-api-key'],
  });
  Logger.log(`CORS allowed origins: ${allowed.join(', ') || '(none — set CORS_ORIGIN)'}`, 'Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Restaff Leads API listening on :${port}`, 'Bootstrap');
}
bootstrap();
