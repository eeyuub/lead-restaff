import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface ApifyRunInput {
  searchStringsArray: string[];
  language?: string;
  maxCrawledPlacesPerSearch: number;
  scrapeContacts: boolean;
  skipClosedPlaces: boolean;
  /** Apify placeMinimumStars: "", "two", "twoAndHalf", ... — we pass numeric and let actor coerce. */
  placeMinimumStars?: string;
  countryCode?: string;
}

export interface ApifyRunStartResult {
  runId: string;
  defaultDatasetId: string;
}

@Injectable()
export class ApifyService {
  private readonly logger = new Logger(ApifyService.name);
  private readonly http: AxiosInstance;
  private readonly token: string;
  private readonly actorId: string;
  private readonly webhookSecret: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>('APIFY_TOKEN')!;
    this.actorId = config.get<string>('APIFY_ACTOR_ID')!;
    this.webhookSecret = config.get<string>('APIFY_WEBHOOK_SECRET')!;
    this.publicUrl = config.get<string>('PUBLIC_URL')!;
    this.http = axios.create({
      baseURL: 'https://api.apify.com/v2',
      headers: { Authorization: `Bearer ${this.token}` },
      timeout: 30000,
    });
  }

  /**
   * Start an Apify run and register a webhook for completion.
   * Returns runId immediately — caller should persist it and wait for the webhook.
   */
  async startRun(input: ApifyRunInput, scrapeJobId: string): Promise<ApifyRunStartResult> {
    const isPublic = /^https?:\/\//.test(this.publicUrl)
      && !/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(this.publicUrl);

    let url = `/acts/${this.actorId}/runs`;
    if (isPublic) {
      const webhookUrl = `${this.publicUrl}/apify/webhook?secret=${this.webhookSecret}&scrapeJobId=${scrapeJobId}`;
      const webhooks = [
        {
          eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED', 'ACTOR.RUN.TIMED_OUT'],
          requestUrl: webhookUrl,
        },
      ];
      const webhooksParam = Buffer.from(JSON.stringify(webhooks)).toString('base64');
      url += `?webhooks=${webhooksParam}`;
    } else {
      this.logger.warn(
        `PUBLIC_URL "${this.publicUrl}" is not public — skipping webhook. Run results will not auto-ingest.`,
      );
    }

    this.logger.log(
      `Starting Apify run: ${input.searchStringsArray.length} queries, ${input.maxCrawledPlacesPerSearch}/query`,
    );

    try {
      const resp = await this.http.post(url, input);
      return {
        runId: resp.data.data.id,
        defaultDatasetId: resp.data.data.defaultDatasetId,
      };
    } catch (err: any) {
      this.logger.error(
        `Apify error body: ${JSON.stringify(err?.response?.data)} | input: ${JSON.stringify(input)} | actor: ${this.actorId}`,
      );
      throw err;
    }
  }

  /**
   * Fetch dataset items from a completed run. Used by the webhook handler.
   * Pages through results since datasets can be large.
   */
  async getDatasetItems(datasetId: string): Promise<any[]> {
    const all: any[] = [];
    const limit = 1000;
    let offset = 0;
    while (true) {
      const resp = await this.http.get(`/datasets/${datasetId}/items`, {
        params: { format: 'json', limit, offset, clean: true },
      });
      const batch = resp.data as any[];
      all.push(...batch);
      if (batch.length < limit) break;
      offset += limit;
    }
    this.logger.log(`Fetched ${all.length} items from dataset ${datasetId}`);
    return all;
  }

  async getRunStatus(runId: string): Promise<string> {
    const resp = await this.http.get(`/actor-runs/${runId}`);
    return resp.data.data.status;
  }
}
