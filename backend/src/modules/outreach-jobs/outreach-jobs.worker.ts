import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  LeadStatus,
  MessageDirection,
  OutreachChannel,
  OutreachJobItemStatus,
  OutreachJobStatus,
  OutreachStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WiiSenderService } from '../wiisender/wiisender.service';

/**
 * Bulk-outreach worker. One tick per second. Per running job, advances at most
 * one PENDING item per tick, respecting the job's throttleMs since the last
 * attempt. Safe to crash mid-job: state lives in DB, resumes on bootstrap.
 */
@Injectable()
export class OutreachJobsWorker {
  private readonly logger = new Logger(OutreachJobsWorker.name);
  private inFlight = false;

  constructor(
    private prisma: PrismaService,
    private wiisender: WiiSenderService,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async tick() {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      const runningJobs = await this.prisma.outreachJob.findMany({
        where: { status: OutreachJobStatus.RUNNING },
        orderBy: { createdAt: 'asc' },
      });

      for (const job of runningJobs) {
        const now = Date.now();
        if (job.lastTickAt && now - job.lastTickAt.getTime() < job.throttleMs) continue;

        const item = await this.prisma.outreachJobItem.findFirst({
          where: { jobId: job.id, status: OutreachJobItemStatus.PENDING },
          orderBy: { createdAt: 'asc' },
          include: { lead: true },
        });

        if (!item) {
          // Nothing pending — finalise.
          await this.prisma.outreachJob.update({
            where: { id: job.id },
            data: { status: OutreachJobStatus.DONE, finishedAt: new Date() },
          });
          this.logger.log(`OutreachJob ${job.id} done`);
          continue;
        }

        await this.prisma.outreachJob.update({
          where: { id: job.id },
          data: { lastTickAt: new Date() },
        });

        if (job.channel === OutreachChannel.EMAIL) {
          await this.failItem(item.id, job.id, 'Email channel not implemented');
          continue;
        }

        if (!item.lead.phone) {
          await this.skipItem(item.id, job.id, 'Lead has no phone');
          continue;
        }

        try {
          const result = await this.wiisender.sendText(item.lead.phone, item.body);
          const sentAt = new Date();
          await this.prisma.$transaction(async (tx) => {
            const msg = await tx.outreachMessage.create({
              data: {
                leadId: item.leadId,
                direction: MessageDirection.OUTBOUND,
                channel: OutreachChannel.WHATSAPP,
                status: OutreachStatus.SENT,
                body: item.body,
                sentAt,
                evolutionMessageId: result.messageId ?? null,
                evolutionResponse: result.raw as any,
              },
            });
            await tx.outreachJobItem.update({
              where: { id: item.id },
              data: {
                status: OutreachJobItemStatus.SENT,
                outreachMessageId: msg.id,
                attemptedAt: sentAt,
              },
            });
            await tx.outreachJob.update({
              where: { id: job.id },
              data: { sent: { increment: 1 } },
            });
            await tx.lead.update({
              where: { id: item.leadId },
              data: { lastOutboundAt: sentAt },
            });
            if (item.lead.status === LeadStatus.NEW) {
              await tx.lead.update({
                where: { id: item.leadId },
                data: { status: LeadStatus.CONTACTED },
              });
              await tx.leadStatusChange.create({
                data: {
                  leadId: item.leadId,
                  fromStatus: LeadStatus.NEW,
                  toStatus: LeadStatus.CONTACTED,
                  note: `Auto: bulk job ${job.id}`,
                },
              });
            }
          });
        } catch (err: any) {
          await this.failItem(item.id, job.id, err?.message ?? String(err));
        }
      }
    } catch (err) {
      this.logger.error(`Worker tick failed: ${err}`);
    } finally {
      this.inFlight = false;
    }
  }

  private async failItem(itemId: string, jobId: string, message: string) {
    await this.prisma.$transaction([
      this.prisma.outreachJobItem.update({
        where: { id: itemId },
        data: {
          status: OutreachJobItemStatus.FAILED,
          attemptedAt: new Date(),
          errorMessage: message,
        },
      }),
      this.prisma.outreachJob.update({
        where: { id: jobId },
        data: { failed: { increment: 1 } },
      }),
    ]);
  }

  private async skipItem(itemId: string, jobId: string, message: string) {
    await this.prisma.$transaction([
      this.prisma.outreachJobItem.update({
        where: { id: itemId },
        data: {
          status: OutreachJobItemStatus.SKIPPED,
          attemptedAt: new Date(),
          errorMessage: message,
        },
      }),
      this.prisma.outreachJob.update({
        where: { id: jobId },
        data: { skipped: { increment: 1 } },
      }),
    ]);
  }
}
