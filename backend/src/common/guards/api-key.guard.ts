import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const provided = req.headers['x-api-key'];
    const expected = this.config.get<string>('INTERNAL_API_KEY');

    if (!expected) {
      // Misconfiguration — refuse all requests rather than open access.
      throw new UnauthorizedException('INTERNAL_API_KEY not configured');
    }
    if (provided !== expected) {
      throw new UnauthorizedException('Invalid or missing x-api-key header');
    }
    return true;
  }
}
