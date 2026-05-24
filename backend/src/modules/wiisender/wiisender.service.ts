import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WiiSenderClient } from '@wiicode/wiisender';

export interface WiiSenderSendResult {
  messageId?: string;
  raw: unknown;
}

@Injectable()
export class WiiSenderService {
  private readonly logger = new Logger(WiiSenderService.name);
  private _client: WiiSenderClient | null = null;

  constructor(private readonly config: ConfigService) {}

  private get client(): WiiSenderClient {
    if (this._client) return this._client;
    const serverUrl = this.config.get<string>('WIISENDER_SERVER_URL');
    const apiKey = this.config.get<string>('WIISENDER_API_KEY');
    if (!serverUrl || !apiKey) {
      throw new Error('WIISENDER_SERVER_URL and WIISENDER_API_KEY must be configured');
    }
    this._client = new WiiSenderClient({ serverUrl, apiKey });
    return this._client;
  }

  /**
   * Send a WhatsApp text message via WiiSender.
   * Phone may be any format — WiiSender auto-formats to E.164.
   */
  async sendText(phone: string, text: string): Promise<WiiSenderSendResult> {
    this.logger.log(`WiiSender → ${phone}: "${text.slice(0, 60)}..."`);
    try {
      const resp = await this.client.sendText({ number: phone, text });
      return {
        messageId: resp.evolutionMessageId ?? resp.messageId,
        raw: resp,
      };
    } catch (err: any) {
      const detail = err?.response?.data || err?.message || err;
      throw new Error(`WiiSender send failed: ${JSON.stringify(detail)}`);
    }
  }

  async getStatus() {
    return this.client.getStatus();
  }

  async checkNumber(number: string) {
    return this.client.checkNumber({ number });
  }
}
