import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Lead } from '@prisma/client';

export interface GeneratedMessage {
  body: string;
  promptUsed: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly model: string;
  private _client: OpenAI | null = null;

  constructor(private config: ConfigService) {
    this.model = config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
  }

  private get client(): OpenAI {
    if (this._client) return this._client;
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this._client = new OpenAI({
      apiKey,
      baseURL: this.config.get<string>('OPENAI_BASE_URL') || undefined,
    });
    return this._client;
  }

  async generateWhatsAppMessage(
    lead: Lead,
    options?: { language?: 'fr' | 'en' | 'darija'; customInstructions?: string },
  ): Promise<GeneratedMessage> {
    const language = options?.language ?? 'fr';
    const prompt = this.buildPrompt(lead, language, options?.customInstructions);

    const resp = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (resp.choices[0]?.message?.content ?? '').trim();

    this.logger.log(`Generated message for lead=${lead.id} (${text.length} chars)`);
    return { body: text, promptUsed: prompt };
  }

  private buildPrompt(lead: Lead, language: 'fr' | 'en' | 'darija', custom?: string): string {
    const langInstr = {
      fr: 'Write the message in French.',
      en: 'Write the message in English.',
      darija: 'Write the message in Moroccan Darija using Latin script (e.g., "Salam, kifach..." style).',
    }[language];

    return `You're writing a WhatsApp outreach message for Restaff — a Moroccan hospitality job marketplace (restaff.ma) that connects restaurants/hotels with vetted staff (servers, chefs, baristas, receptionists). We're reaching out to this business as a potential employer client.

Target business:
- Name: ${lead.name}
- Type: ${lead.subCategory ?? lead.categoryGroup}
- City: ${lead.city}${lead.neighborhood ? `, ${lead.neighborhood}` : ''}
- Rating: ${lead.rating ?? 'N/A'} (${lead.reviewsCount ?? 0} reviews)
${lead.website ? `- Website: ${lead.website}` : ''}

Write a SHORT WhatsApp opener (max 4 short lines, no emojis, no aggressive sales speak). Goals:
1. Mention you noticed them specifically (e.g., the city or that they're highly rated when reviewsCount > 100 and rating >= 4.3).
2. State what Restaff does in one sentence.
3. Ask a soft question that invites a reply (e.g., do they currently struggle with staff turnover, do they hire seasonally, etc).
4. Don't use "Bonjour cher partenaire" cliches. Sound like a real person.

${langInstr}

${custom ? `Extra instructions from the operator: ${custom}` : ''}

Output ONLY the message body, nothing else. No quotes, no preamble, no "Here's your message:".`;
  }
}
