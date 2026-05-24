import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateMessageDto {
  @IsOptional()
  @IsEnum(['fr', 'en', 'darija'])
  language?: 'fr' | 'en' | 'darija';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customInstructions?: string;
}

export class SaveMessageDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsString()
  promptUsed?: string;

  @IsOptional()
  @IsEnum(['TEMPLATE', 'AI'])
  generatedBy?: 'TEMPLATE' | 'AI' = 'TEMPLATE';
}

export class SendMessageDto {
  @IsString()
  outreachMessageId!: string;
}

export class MarkRespondedDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class LogMessageDto {
  @IsEnum(['INBOUND', 'OUTBOUND'])
  direction!: 'INBOUND' | 'OUTBOUND';

  @IsOptional()
  @IsEnum(['WHATSAPP', 'EMAIL'])
  channel?: 'WHATSAPP' | 'EMAIL';

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  replyToId?: string;
}
