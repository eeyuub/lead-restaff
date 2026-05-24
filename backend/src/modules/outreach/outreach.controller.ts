import { Body, Controller, Param, Post } from '@nestjs/common';
import { OutreachService } from './outreach.service';
import { GenerateMessageDto, LogMessageDto, MarkRespondedDto, SaveMessageDto } from './dto';

@Controller('leads/:leadId/outreach')
export class OutreachController {
  constructor(private service: OutreachService) {}

  /** Generate (AI). Returns body + promptUsed; doesn't save yet. */
  @Post('generate')
  generate(@Param('leadId') leadId: string, @Body() dto: GenerateMessageDto) {
    return this.service.generate(leadId, dto);
  }

  /** Save a draft (after generate, or for templates). */
  @Post('drafts')
  saveDraft(@Param('leadId') leadId: string, @Body() dto: SaveMessageDto) {
    return this.service.saveDraft(leadId, dto);
  }

  /** Send a previously-saved draft via WhatsApp. */
  @Post('messages/:messageId/send')
  send(@Param('messageId') messageId: string) {
    return this.service.send(messageId);
  }

  /** Manually log an inbound or out-of-band outbound message on the lead timeline. */
  @Post('messages/log')
  log(@Param('leadId') leadId: string, @Body() dto: LogMessageDto) {
    return this.service.logMessage(leadId, dto);
  }

  /** Manually mark a sent message as having received a reply. */
  @Post('messages/:messageId/responded')
  markResponded(@Param('messageId') messageId: string, @Body() dto: MarkRespondedDto) {
    return this.service.markResponded(messageId, dto.note);
  }
}
