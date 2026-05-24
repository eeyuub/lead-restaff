import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  LeadStatus,
  MessageDirection,
  MessageGeneratedBy,
  OutreachChannel,
  OutreachStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { WiiSenderService } from '../wiisender/wiisender.service';
import { GenerateMessageDto, LogMessageDto, SaveMessageDto } from './dto';

@Injectable()
export class OutreachService {
  private readonly logger = new Logger(OutreachService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private wiisender: WiiSenderService,
  ) {}

  /**
   * Generate an AI-written message and persist it as the lead's latest draft.
   * Overwrites any existing DRAFT row for this lead (only one "latest" is kept).
   * SENT/RESPONDED/FAILED rows are preserved.
   */
  async generate(leadId: string, dto: GenerateMessageDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException(`Lead ${leadId} not found`);

    const generated = await this.ai.generateWhatsAppMessage(lead, {
      language: dto.language,
      customInstructions: dto.customInstructions,
    });

    const existingDraft = await this.prisma.outreachMessage.findFirst({
      where: { leadId, status: OutreachStatus.DRAFT },
      orderBy: { createdAt: 'desc' },
    });

    const saved = existingDraft
      ? await this.prisma.outreachMessage.update({
          where: { id: existingDraft.id },
          data: {
            body: generated.body,
            promptUsed: generated.promptUsed,
            generatedBy: MessageGeneratedBy.AI,
          },
        })
      : await this.prisma.outreachMessage.create({
          data: {
            leadId,
            channel: OutreachChannel.WHATSAPP,
            status: OutreachStatus.DRAFT,
            generatedBy: MessageGeneratedBy.AI,
            body: generated.body,
            promptUsed: generated.promptUsed,
          },
        });

    return { ...generated, messageId: saved.id };
  }

  /**
   * Save a draft. Only one open DRAFT per lead is kept — repeated calls
   * overwrite the previous draft body. SENT/RESPONDED rows are untouched.
   */
  async saveDraft(leadId: string, dto: SaveMessageDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException(`Lead ${leadId} not found`);

    const existingDraft = await this.prisma.outreachMessage.findFirst({
      where: { leadId, status: OutreachStatus.DRAFT },
      orderBy: { createdAt: 'desc' },
    });

    const generatedBy =
      dto.generatedBy === 'AI' ? MessageGeneratedBy.AI : MessageGeneratedBy.TEMPLATE;

    if (existingDraft) {
      return this.prisma.outreachMessage.update({
        where: { id: existingDraft.id },
        data: {
          body: dto.body,
          promptUsed: dto.promptUsed ?? existingDraft.promptUsed,
          generatedBy,
        },
      });
    }
    return this.prisma.outreachMessage.create({
      data: {
        leadId,
        channel: OutreachChannel.WHATSAPP,
        status: OutreachStatus.DRAFT,
        generatedBy,
        body: dto.body,
        promptUsed: dto.promptUsed ?? null,
      },
    });
  }

  /** Send a previously-saved draft via WiiSender. */
  async send(messageId: string) {
    const msg = await this.prisma.outreachMessage.findUnique({
      where: { id: messageId },
      include: { lead: true },
    });
    if (!msg) throw new NotFoundException(`OutreachMessage ${messageId} not found`);
    if (msg.status !== OutreachStatus.DRAFT) {
      throw new BadRequestException(`Message already ${msg.status}, cannot send again`);
    }
    if (!msg.lead.phone) {
      throw new BadRequestException('Lead has no phone number');
    }

    try {
      const result = await this.wiisender.sendText(msg.lead.phone, msg.body);
      const now = new Date();
      await this.prisma.$transaction(async (tx) => {
        await tx.outreachMessage.update({
          where: { id: messageId },
          data: {
            status: OutreachStatus.SENT,
            sentAt: now,
            evolutionMessageId: result.messageId ?? null,
            evolutionResponse: result.raw as any,
          },
        });
        await tx.lead.update({
          where: { id: msg.leadId },
          data: { lastOutboundAt: now },
        });
        if (msg.lead.status === LeadStatus.NEW) {
          await tx.lead.update({
            where: { id: msg.leadId },
            data: { status: LeadStatus.CONTACTED },
          });
          await tx.leadStatusChange.create({
            data: {
              leadId: msg.leadId,
              fromStatus: LeadStatus.NEW,
              toStatus: LeadStatus.CONTACTED,
              note: 'Auto: WhatsApp sent',
            },
          });
        }
      });
      return { ok: true };
    } catch (err: any) {
      this.logger.error(`Send failed: ${err.message}`);
      await this.prisma.outreachMessage.update({
        where: { id: messageId },
        data: {
          status: OutreachStatus.FAILED,
          errorMessage: err.message,
        },
      });
      throw err;
    }
  }

  /**
   * Log a message (inbound reply or out-of-band outbound) on a lead's timeline.
   * For inbound: sets lastInboundAt and auto-promotes CONTACTED → RESPONDED.
   * For outbound: sets lastOutboundAt.
   */
  async logMessage(leadId: string, dto: LogMessageDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException(`Lead ${leadId} not found`);

    const direction =
      dto.direction === 'INBOUND' ? MessageDirection.INBOUND : MessageDirection.OUTBOUND;
    const channel: OutreachChannel =
      dto.channel === 'EMAIL' ? OutreachChannel.EMAIL : OutreachChannel.WHATSAPP;
    const at = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.OutreachMessageUncheckedCreateInput = {
        leadId,
        direction,
        channel,
        body: dto.body,
        subject: dto.subject ?? null,
        replyToId: dto.replyToId ?? null,
        status:
          direction === MessageDirection.INBOUND ? OutreachStatus.RESPONDED : OutreachStatus.SENT,
        sentAt: direction === MessageDirection.OUTBOUND ? at : null,
        respondedAt: direction === MessageDirection.INBOUND ? at : null,
        createdAt: at,
      };
      const msg = await tx.outreachMessage.create({ data });

      if (direction === MessageDirection.INBOUND) {
        await tx.lead.update({
          where: { id: leadId },
          data: { lastInboundAt: at },
        });
        // Auto-promote CONTACTED → RESPONDED on first inbound.
        if (lead.status === LeadStatus.CONTACTED) {
          await tx.lead.update({ where: { id: leadId }, data: { status: LeadStatus.RESPONDED } });
          await tx.leadStatusChange.create({
            data: {
              leadId,
              fromStatus: LeadStatus.CONTACTED,
              toStatus: LeadStatus.RESPONDED,
              note: 'Auto: inbound reply logged',
            },
          });
        }
        // If a replyToId was given, mark that outbound message as RESPONDED.
        if (dto.replyToId) {
          await tx.outreachMessage.update({
            where: { id: dto.replyToId },
            data: { status: OutreachStatus.RESPONDED, respondedAt: at },
          });
        }
      } else {
        await tx.lead.update({
          where: { id: leadId },
          data: { lastOutboundAt: at },
        });
      }
      return msg;
    });
  }

  /** Mark a sent message as having received a response. Lead status -> RESPONDED. */
  async markResponded(messageId: string, note?: string) {
    const msg = await this.prisma.outreachMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException();
    await this.prisma.outreachMessage.update({
      where: { id: messageId },
      data: { status: OutreachStatus.RESPONDED, respondedAt: new Date() },
    });
    await this.prisma.lead.update({
      where: { id: msg.leadId },
      data: {
        status: LeadStatus.RESPONDED,
        notes: note ? `${note}\n` : undefined,
      },
    });
    return { ok: true };
  }
}
