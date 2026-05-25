import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { IsString, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';

class LoginDto {
  @IsString()
  @MinLength(8)
  key!: string;
}

/**
 * Tiny login endpoint. Validates supplied key against INTERNAL_API_KEY.
 * On success returns the key — frontend stores it and sends it as `x-api-key`
 * on every subsequent request, re-validated server-side by ApiKeyGuard.
 *
 * Rate-limited: 5 attempts per minute per IP.
 */
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private config: ConfigService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = clientIp(req);
    const expected = this.config.get<string>('INTERNAL_API_KEY');
    if (!expected) throw new UnauthorizedException('Server not configured');

    if (!safeEqual(dto.key, expected)) {
      await new Promise((r) => setTimeout(r, 400));
      this.logger.warn(`Login FAIL from ${ip}`);
      throw new UnauthorizedException('Invalid key');
    }
    this.logger.log(`Login OK from ${ip}`);
    return { ok: true, token: expected };
  }

  /** Cheap probe — confirms the stored key is still valid. ApiKeyGuard runs first. */
  @Post('verify')
  @HttpCode(204)
  async verify() {
    return;
  }
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function clientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  if (Array.isArray(xff)) return xff[0];
  return req.ip ?? 'unknown';
}
