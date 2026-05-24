import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ScrapeJobsModule } from './modules/scrape-jobs/scrape-jobs.module';
import { OutreachModule } from './modules/outreach/outreach.module';
import { OutreachJobsModule } from './modules/outreach-jobs/outreach-jobs.module';
import { ApifyModule } from './modules/apify/apify.module';
import { WiiSenderModule } from './modules/wiisender/wiisender.module';
import { AiModule } from './modules/ai/ai.module';
import { ApiKeyGuard } from './common/guards/api-key.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ApifyModule,
    WiiSenderModule,
    AiModule,
    LeadsModule,
    ScrapeJobsModule,
    OutreachModule,
    OutreachJobsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AppModule {}
