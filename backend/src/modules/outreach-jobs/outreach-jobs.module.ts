import { Module } from '@nestjs/common';
import { OutreachJobsController } from './outreach-jobs.controller';
import { OutreachJobsService } from './outreach-jobs.service';
import { OutreachJobsWorker } from './outreach-jobs.worker';
import { WiiSenderModule } from '../wiisender/wiisender.module';

@Module({
  imports: [WiiSenderModule],
  controllers: [OutreachJobsController],
  providers: [OutreachJobsService, OutreachJobsWorker],
})
export class OutreachJobsModule {}
