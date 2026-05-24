import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOutreachJobDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  leadIds!: string[];

  @IsOptional()
  @IsEnum(['WHATSAPP', 'EMAIL'])
  channel?: 'WHATSAPP' | 'EMAIL';

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  /** Milliseconds between sends. Min 2s, max 5min. */
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(300_000)
  throttleMs?: number;

  /** Skip leads with status DO_NOT_CONTACT or REJECTED. Default true. */
  @IsOptional()
  skipUncontactable?: boolean;

  /** Auto-start when created. Default true. */
  @IsOptional()
  autoStart?: boolean;
}
