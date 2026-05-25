import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';

class LoginDto {
  @IsString()
  @MinLength(8)
  key!: string;
}

/**
 * Tiny login endpoint. Validates the supplied key against INTERNAL_API_KEY.
 * On success returns the key itself — frontend stores it and sends it as
 * `x-api-key` on every subsequent request. ApiKeyGuard then enforces it
 * on every protected route, so a faked client-side "success" can't bypass
 * server-side validation.
 */
@Controller('auth')
export class AuthController {
  constructor(private config: ConfigService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const expected = this.config.get<string>('INTERNAL_API_KEY');
    if (!expected) throw new UnauthorizedException('Server not configured');

    // Constant-time compare to defeat timing-based brute force.
    if (!safeEqual(dto.key, expected)) {
      // Small artificial delay slows brute-force attempts.
      await new Promise((r) => setTimeout(r, 400));
      throw new UnauthorizedException('Invalid key');
    }
    return { ok: true, token: expected };
  }

  /** Cheap probe used by the frontend on boot to confirm the stored key is still valid. */
  @Post('verify')
  @HttpCode(204)
  async verify() {
    // Reaching here means ApiKeyGuard already accepted the header.
    return;
  }
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
