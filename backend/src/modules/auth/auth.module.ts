import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]), // global default
  ],
  controllers: [AuthController],
})
export class AuthModule {}
