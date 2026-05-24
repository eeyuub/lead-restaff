import { Module } from '@nestjs/common';
import { WiiSenderService } from './wiisender.service';

@Module({
  providers: [WiiSenderService],
  exports: [WiiSenderService],
})
export class WiiSenderModule {}
