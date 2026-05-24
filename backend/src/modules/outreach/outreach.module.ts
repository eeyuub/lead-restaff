import { Module } from '@nestjs/common';
import { OutreachController } from './outreach.controller';
import { OutreachService } from './outreach.service';
import { AiModule } from '../ai/ai.module';
import { WiiSenderModule } from '../wiisender/wiisender.module';

@Module({
  imports: [AiModule, WiiSenderModule],
  controllers: [OutreachController],
  providers: [OutreachService],
})
export class OutreachModule {}
