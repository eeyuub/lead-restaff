import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ScrapeJobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApifyService } from '../apify/apify.service';
import { LeadNormalizerService } from '../apify/lead-normalizer.service';
import { buildSearchQueries, CITY_ZONES, SEARCH_CATEGORIES } from '../../config/zones';
import { CreateScrapeJobDto, SaveTemplateDto } from './dto';

const STAR_MAP: Record<string, string> = {
  '2': 'two',
  '2.5': 'twoAndHalf',
  '3': 'three',
  '3.5': 'threeAndHalf',
  '4': 'four',
  '4.5': 'fourAndHalf',
  '5': 'five',
};
function ratingToApify(minRating?: number): string | undefined {
  if (!minRating) return undefined;
  const rounded = (Math.round(minRating * 2) / 2).toFixed(minRating % 1 === 0 ? 0 : 1);
  return STAR_MAP[rounded];
}

@Injectable()
export class ScrapeJobsService {
  private readonly logger = new Logger(ScrapeJobsService.name);

  constructor(
    private prisma: PrismaService,
    private apify: ApifyService,
    private normalizer: LeadNormalizerService,
  ) {}

  async create(dto: CreateScrapeJobDto) {
    const queries = buildSearchQueries(dto.cities, dto.categories, {
      zones: dto.zones,
      customQueries: dto.customQueries,
    });
    if (queries.length === 0) {
      throw new BadRequestException('No search queries — pick cities/zones/categories or add custom queries.');
    }
    this.logger.log(`Creating scrape job: ${queries.length} queries`);

    const estimatedPlaces = queries.length * dto.perZoneLimit;
    const estimatedCost = estimatedPlaces * 0.0075;

    const options = {
      zones: dto.zones ?? null,
      customQueries: dto.customQueries ?? null,
      language: dto.language ?? 'fr',
      minRating: dto.minRating ?? null,
      minReviews: dto.minReviews ?? null,
      skipClosedPlaces: dto.skipClosedPlaces ?? true,
      scrapeContacts: dto.scrapeContacts ?? true,
    };

    const job = await this.prisma.scrapeJob.create({
      data: {
        status: ScrapeJobStatus.PENDING,
        cities: dto.cities,
        categories: dto.categories,
        zonesUsed: queries,
        perZoneLimit: dto.perZoneLimit,
        options: options as unknown as Prisma.InputJsonValue,
      },
    });

    try {
      const result = await this.apify.startRun(
        {
          searchStringsArray: queries,
          language: options.language,
          maxCrawledPlacesPerSearch: dto.perZoneLimit,
          scrapeContacts: options.scrapeContacts,
          skipClosedPlaces: options.skipClosedPlaces,
          placeMinimumStars: ratingToApify(options.minRating ?? undefined),
          countryCode: 'ma',
        },
        job.id,
      );

      await this.prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: ScrapeJobStatus.RUNNING,
          apifyRunId: result.runId,
          apifyDatasetId: result.defaultDatasetId,
          startedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to start Apify run: ${err.message}`);
      await this.prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: ScrapeJobStatus.FAILED,
          errorMessage: err.message,
          finishedAt: new Date(),
        },
      });
      throw err;
    }

    return { ...job, estimatedPlaces, estimatedCost };
  }

  async list() {
    return this.prisma.scrapeJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async get(id: string) {
    const job = await this.prisma.scrapeJob.findUnique({
      where: { id },
      include: { _count: { select: { leads: true } } },
    });
    if (!job) throw new NotFoundException(`ScrapeJob ${id} not found`);
    return job;
  }

  getCityZones() {
    return CITY_ZONES;
  }

  async ingest(id: string) {
    const job = await this.prisma.scrapeJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`ScrapeJob ${id} not found`);

    if (job.status === ScrapeJobStatus.SUCCEEDED) {
      throw new ConflictException(
        `Job already ingested (scraped=${job.totalScraped} new=${job.totalIngested} dup=${job.totalDuplicates})`,
      );
    }
    if (!job.apifyRunId || !job.apifyDatasetId) {
      throw new BadRequestException('Job has no Apify run/dataset');
    }

    const runStatus = await this.apify.getRunStatus(job.apifyRunId);
    if (runStatus !== 'SUCCEEDED') {
      throw new ConflictException(`Apify run status is ${runStatus}, not SUCCEEDED yet`);
    }

    const items = await this.apify.getDatasetItems(job.apifyDatasetId);
    const minReviews = (job.options as any)?.minReviews ?? 0;

    let ingested = 0;
    let duplicates = 0;
    let filtered = 0;
    for (const raw of items) {
      const norm = this.normalizer.normalize(raw);
      if (!norm) continue;
      if (minReviews > 0 && (norm.data.reviewsCount ?? 0) < minReviews) {
        filtered++;
        continue;
      }

      const existing = await this.prisma.lead.findUnique({
        where: { placeId: norm.placeId },
      });
      if (existing) {
        duplicates++;
        await this.prisma.lead.update({
          where: { placeId: norm.placeId },
          data: {
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
          scrapeJob: { connect: { id } },
        },
      });
      ingested++;
    }

    const updated = await this.prisma.scrapeJob.update({
      where: { id },
      data: {
        status: ScrapeJobStatus.SUCCEEDED,
        finishedAt: new Date(),
        totalScraped: items.length,
        totalIngested: ingested,
        totalDuplicates: duplicates,
      },
    });

    this.logger.log(
      `Manual ingest ${id}: scraped=${items.length} new=${ingested} dup=${duplicates} filtered=${filtered}`,
    );
    return { ...updated, filteredByMinReviews: filtered };
  }

  getCategories() {
    return [...SEARCH_CATEGORIES];
  }

  // ===== Templates =====
  listTemplates() {
    return this.prisma.scrapeTemplate.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async saveTemplate(dto: SaveTemplateDto) {
    return this.prisma.scrapeTemplate.upsert({
      where: { name: dto.name },
      update: { config: dto.config as Prisma.InputJsonValue },
      create: { name: dto.name, config: dto.config as Prisma.InputJsonValue },
    });
  }

  async deleteTemplate(id: string) {
    try {
      await this.prisma.scrapeTemplate.delete({ where: { id } });
      return { ok: true };
    } catch {
      throw new NotFoundException(`Template ${id} not found`);
    }
  }
}
