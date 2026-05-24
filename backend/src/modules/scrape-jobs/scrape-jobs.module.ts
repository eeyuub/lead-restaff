import { Module } from '@nestjs/common';
import { ScrapeJobsController } from './scrape-jobs.controller';
import { ScrapeJobsService } from './scrape-jobs.service';
import { ApifyModule } from '../apify/apify.module';

@Module({
  imports: [ApifyModule],
  controllers: [ScrapeJobsController],
  providers: [ScrapeJobsService],
})
export class ScrapeJobsModule {}
