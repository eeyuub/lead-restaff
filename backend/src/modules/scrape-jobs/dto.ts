import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateScrapeJobDto {
  @IsArray()
  @IsString({ each: true })
  cities!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categories!: string[];

  @IsInt()
  @Min(1)
  @Max(50)
  perZoneLimit!: number;

  /** Optional: pick specific zones instead of all zones of a city. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  zones?: string[];

  /** Optional: extra free-text Google-Maps search queries. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customQueries?: string[];

  @IsOptional()
  @IsEnum(['en', 'fr', 'ar'])
  language?: 'en' | 'fr' | 'ar';

  /** Apify placeMinimumStars (0–5). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  /** Post-ingest filter: drop leads with fewer than N reviews. */
  @IsOptional()
  @IsInt()
  @Min(0)
  minReviews?: number;

  @IsOptional()
  @IsBoolean()
  skipClosedPlaces?: boolean;

  @IsOptional()
  @IsBoolean()
  scrapeContacts?: boolean;
}

export class SaveTemplateDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  /** Stored verbatim — same shape as CreateScrapeJobDto. */
  @IsObject()
  config!: Record<string, unknown>;
}
