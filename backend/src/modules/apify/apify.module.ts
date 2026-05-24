import { Module } from '@nestjs/common';
import { ApifyService } from './apify.service';
import { ApifyWebhookController } from './apify-webhook.controller';
import { LeadNormalizerService } from './lead-normalizer.service';

@Module({
  controllers: [ApifyWebhookController],
  providers: [ApifyService, LeadNormalizerService],
  exports: [ApifyService, LeadNormalizerService],
})
export class ApifyModule {}
