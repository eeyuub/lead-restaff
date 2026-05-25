import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScrapeJobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { ApifyService } from './apify.service';
import { LeadNormalizerService } from './lead-normalizer.service';

@Controller('apify')
export class ApifyWebhookController {
  private readonly logger = new Logger(ApifyWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private apify: ApifyService,
    private normalizer: LeadNormalizerService,
    private config: ConfigService,
  ) {}

  /**
   * Apify calls this URL when a run completes (success or failure).
   * Secret is sent in `x-apify-secret` header (avoids leaking in access logs).
   * Query-param fallback kept for backward-compat with already-registered runs.
   */
  @Public()
  @Post('webhook')
  async onWebhook(
    @Headers('x-apify-secret') secretHeader: string | undefined,
    @Query('secret') secretQuery: string | undefined,
    @Query('scrapeJobId') scrapeJobId: string,
    @Body() body: any,
  ) {
    const provided = secretHeader || secretQuery;
    if (provided !== this.config.get<string>('APIFY_WEBHOOK_SECRET')) {
      this.logger.warn('Apify webhook rejected: bad secret');
      throw new BadRequestException('Invalid secret');
    }
    if (!scrapeJobId) throw new BadRequestException('Missing scrapeJobId');

    const eventType: string = body?.eventType;
    const runData = body?.resource;
    this.logger.log(`Webhook ${eventType} for scrapeJob=${scrapeJobId} run=${runData?.id}`);

    const job = await this.prisma.scrapeJob.findUnique({ where: { id: scrapeJobId } });
    if (!job) {
      this.logger.warn(`Unknown scrapeJobId: ${scrapeJobId}`);
      return { ok: true, ignored: true };
    }

    if (eventType !== 'ACTOR.RUN.SUCCEEDED') {
      // Failure / abort / timeout — record and return.
      await this.prisma.scrapeJob.update({
        where: { id: scrapeJobId },
        data: {
          status: this.mapFailureStatus(eventType),
          finishedAt: new Date(),
          errorMessage: `Apify event: ${eventType}`,
          apifyDatasetId: runData?.defaultDatasetId ?? null,
        },
      });
      return { ok: true };
    }

    // Success — fetch dataset, normalize, upsert.
    const datasetId = runData.defaultDatasetId;
    let items: any[];
    try {
      items = await this.apify.getDatasetItems(datasetId);
    } catch (err: any) {
      this.logger.error(`Failed to fetch dataset ${datasetId}: ${err.message}`);
      await this.prisma.scrapeJob.update({
        where: { id: scrapeJobId },
        data: {
          status: ScrapeJobStatus.FAILED,
          finishedAt: new Date(),
          errorMessage: `Dataset fetch failed: ${err.message}`,
          apifyDatasetId: datasetId,
        },
      });
      return { ok: false };
    }

    let ingested = 0;
    let duplicates = 0;
    for (const raw of items) {
      const norm = this.normalizer.normalize(raw);
      if (!norm) continue;

      // upsert by placeId. If already exists, we don't overwrite outreach status
      // but we do refresh contact info in case it improved.
      const existing = await this.prisma.lead.findUnique({
        where: { placeId: norm.placeId },
      });
      if (existing) {
        duplicates++;
        await this.prisma.lead.update({
          where: { placeId: norm.placeId },
          data: {
            // refresh contact info only — leave status/notes alone
            phone: norm.data.phone ?? existing.phone,
            emailPrimary: norm.data.emailPrimary ?? existing.emailPrimary,
            emails: (norm.data.emails as string[] | undefined)?.length
              ? (norm.data.emails as string[])
              : existing.emails,
            website: norm.data.website ?? existing.website,
            instagram: norm.data.instagram ?? existing.instagram,
            facebook: norm.data.facebook ?? existing.facebook,
            rating: norm.data.rating ?? existing.rating,
            reviewsCount: norm.data.reviewsCount ?? existing.reviewsCount,
          },
        });
        continue;
      }

      await this.prisma.lead.create({
        data: {
          placeId: norm.placeId,
          ...norm.data,
          scrapeJob: { connect: { id: scrapeJobId } },
        },
      });
      ingested++;
    }

    await this.prisma.scrapeJob.update({
      where: { id: scrapeJobId },
      data: {
        status: ScrapeJobStatus.SUCCEEDED,
        finishedAt: new Date(),
        totalScraped: items.length,
        totalIngested: ingested,
        totalDuplicates: duplicates,
        apifyDatasetId: datasetId,
      },
    });

    this.logger.log(
      `Ingest complete: scraped=${items.length} new=${ingested} duplicates=${duplicates}`,
    );
    return { ok: true, scraped: items.length, ingested, duplicates };
  }

  private mapFailureStatus(eventType: string): ScrapeJobStatus {
    if (eventType === 'ACTOR.RUN.ABORTED') return ScrapeJobStatus.ABORTED;
    return ScrapeJobStatus.FAILED;
  }
}
