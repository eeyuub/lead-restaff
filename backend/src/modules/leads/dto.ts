import { LeadCategoryGroup, LeadPriority, LeadStatus, RejectionReason } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListLeadsQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(LeadCategoryGroup)
  categoryGroup?: LeadCategoryGroup;

  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 50;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(RejectionReason)
  rejectionReason?: RejectionReason;

  @IsOptional()
  @IsString()
  rejectionNote?: string;

  @IsOptional()
  @IsString()
  statusNote?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
