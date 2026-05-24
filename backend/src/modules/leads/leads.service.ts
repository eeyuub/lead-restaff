import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListLeadsQueryDto, UpdateLeadDto } from './dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async list(q: ListLeadsQueryDto) {
    const where: Prisma.LeadWhereInput = {};
    if (q.city) where.city = q.city;
    if (q.categoryGroup) where.categoryGroup = q.categoryGroup;
    if (q.priority) where.priority = q.priority;
    if (q.status) where.status = q.status;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { address: { contains: q.search, mode: 'insensitive' } },
        { emailPrimary: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { qualityScore: 'desc' }, { reviewsCount: 'desc' }],
        skip: q.skip ?? 0,
        take: q.take ?? 50,
        include: { _count: { select: { outreachMessages: true } } },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items, total, skip: q.skip ?? 0, take: q.take ?? 50 };
  }

  async get(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { outreachMessages: { orderBy: { createdAt: 'desc' } } },
    });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto) {
    const current = await this.prisma.lead.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`Lead ${id} not found`);

    const statusChanging = dto.status && dto.status !== current.status;

    if (statusChanging && dto.status === LeadStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('rejectionReason is required when status=REJECTED');
    }

    const data: Prisma.LeadUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status === LeadStatus.REJECTED) {
      if (dto.rejectionReason) data.rejectionReason = dto.rejectionReason;
      if (dto.rejectionNote !== undefined) data.rejectionNote = dto.rejectionNote;
    } else if (statusChanging) {
      data.rejectionReason = null;
      data.rejectionNote = null;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({ where: { id }, data });
      if (statusChanging) {
        await tx.leadStatusChange.create({
          data: {
            leadId: id,
            fromStatus: current.status,
            toStatus: dto.status!,
            reason: dto.status === LeadStatus.REJECTED ? dto.rejectionReason ?? null : null,
            note: dto.statusNote ?? null,
          },
        });
      }
      return updated;
    });
  }

  async timeline(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);

    const [messages, changes] = await Promise.all([
      this.prisma.outreachMessage.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leadStatusChange.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items = [
      ...messages.map((m) => ({ kind: 'message' as const, at: m.createdAt, data: m })),
      ...changes.map((c) => ({ kind: 'status' as const, at: c.createdAt, data: c })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    return { leadId: id, items };
  }

  async stats() {
    const [byPriority, byStatus, byCategory, byCity, total] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['priority'], _count: true }),
      this.prisma.lead.groupBy({ by: ['status'], _count: true }),
      this.prisma.lead.groupBy({ by: ['categoryGroup'], _count: true }),
      this.prisma.lead.groupBy({ by: ['city'], _count: true, orderBy: { _count: { city: 'desc' } } }),
      this.prisma.lead.count(),
    ]);
    return { total, byPriority, byStatus, byCategory, byCity };
  }
}
