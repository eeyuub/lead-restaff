import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Lead,
  LeadStatus,
  OutreachChannel,
  OutreachJobItemStatus,
  OutreachJobStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOutreachJobDto } from './dto';

/** Substitute {{name}} / {{city}} placeholders. */
export function renderBody(body: string, lead: Pick<Lead, 'name' | 'city'>): string {
  return body
    .replace(/\{\{\s*name\s*\}\}/g, lead.name)
    .replace(/\{\{\s*city\s*\}\}/g, lead.city);
}

@Injectable()
export class OutreachJobsService {
  private readonly logger = new Logger(OutreachJobsService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOutreachJobDto) {
    const channel: OutreachChannel =
      dto.channel === 'EMAIL' ? OutreachChannel.EMAIL : OutreachChannel.WHATSAPP;
    if (channel === OutreachChannel.EMAIL) {
      throw new BadRequestException('Email channel is not yet implemented');
    }

    const leads = await this.prisma.lead.findMany({
      where: { id: { in: dto.leadIds } },
      select: { id: true, name: true, city: true, phone: true, emailPrimary: true, status: true },
    });
    if (leads.length === 0) throw new BadRequestException('No leads matched the given ids');

    const skipUncontactable = dto.skipUncontactable !== false;
    const throttleMs = dto.throttleMs ?? 8000;

    const items: Prisma.OutreachJobItemCreateManyJobInput[] = leads.map((lead) => {
      const missingContact =
        channel === OutreachChannel.WHATSAPP ? !lead.phone : !lead.emailPrimary;
      const uncontactable =
        skipUncontactable &&
        (lead.status === LeadStatus.DO_NOT_CONTACT || lead.status === LeadStatus.REJECTED);
      const skip = missingContact || uncontactable;
      return {
        leadId: lead.id,
        body: renderBody(dto.body, lead),
        status: skip ? OutreachJobItemStatus.SKIPPED : OutreachJobItemStatus.PENDING,
        errorMessage: skip
          ? missingContact
            ? `Lead has no ${channel === OutreachChannel.WHATSAPP ? 'phone' : 'email'}`
            : `Lead status is ${lead.status}`
          : null,
      };
    });

    const skipped = items.filter((i) => i.status === OutreachJobItemStatus.SKIPPED).length;
    const autoStart = dto.autoStart !== false;

    const job = await this.prisma.outreachJob.create({
      data: {
        name: dto.name ?? null,
        channel,
        body: dto.body,
        throttleMs,
        total: items.length,
        skipped,
        status: autoStart ? OutreachJobStatus.RUNNING : OutreachJobStatus.QUEUED,
        startedAt: autoStart ? new Date() : null,
        items: { createMany: { data: items } },
      },
    });
    this.logger.log(
      `OutreachJob ${job.id}: total=${items.length} skipped=${skipped} throttle=${throttleMs}ms autoStart=${autoStart}`,
    );
    return job;
  }

  async list() {
    return this.prisma.outreachJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async get(id: string) {
    const job = await this.prisma.outreachJob.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: { lead: { select: { id: true, name: true, city: true, phone: true } } },
        },
      },
    });
    if (!job) throw new NotFoundException(`OutreachJob ${id} not found`);
    return job;
  }

  async start(id: string) {
    const job = await this.prisma.outreachJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException();
    if (job.status !== OutreachJobStatus.QUEUED && job.status !== OutreachJobStatus.PAUSED) {
      throw new ConflictException(`Cannot start job in status ${job.status}`);
    }
    return this.prisma.outreachJob.update({
      where: { id },
      data: { status: OutreachJobStatus.RUNNING, startedAt: job.startedAt ?? new Date() },
    });
  }

  async pause(id: string) {
    return this.transition(id, OutreachJobStatus.RUNNING, OutreachJobStatus.PAUSED);
  }

  async resume(id: string) {
    return this.transition(id, OutreachJobStatus.PAUSED, OutreachJobStatus.RUNNING);
  }

  async cancel(id: string) {
    const job = await this.prisma.outreachJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException();
    if (job.status === OutreachJobStatus.DONE || job.status === OutreachJobStatus.CANCELLED) {
      throw new ConflictException(`Job already ${job.status}`);
    }
    return this.prisma.outreachJob.update({
      where: { id },
      data: { status: OutreachJobStatus.CANCELLED, finishedAt: new Date() },
    });
  }

  private async transition(id: string, from: OutreachJobStatus, to: OutreachJobStatus) {
    const job = await this.prisma.outreachJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException();
    if (job.status !== from) {
      throw new ConflictException(`Job must be ${from}, got ${job.status}`);
    }
    return this.prisma.outreachJob.update({ where: { id }, data: { status: to } });
  }
}
