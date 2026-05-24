export type Priority = 'A' | 'B' | 'C' | 'D';
export type CategoryGroup = 'HOTEL' | 'RESTAURANT' | 'CAFE' | 'OTHER';
export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'RESPONDED'
  | 'INTERESTED'
  | 'MEETING_SCHEDULED'
  | 'NEGOTIATING'
  | 'CONVERTED'
  | 'REJECTED'
  | 'DO_NOT_CONTACT';
export type RejectionReason =
  | 'PRICE'
  | 'NO_NEED'
  | 'WRONG_CONTACT'
  | 'NO_RESPONSE'
  | 'COMPETITOR'
  | 'OTHER';
export type ScrapeJobStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED';
export type OutreachStatus = 'DRAFT' | 'SENT' | 'FAILED' | 'RESPONDED';
export type MessageDirection = 'OUTBOUND' | 'INBOUND';
export type OutreachChannel = 'WHATSAPP' | 'EMAIL';
export type OutreachJobStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'DONE' | 'CANCELLED';
export type OutreachJobItemStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface Lead {
  id: string;
  placeId: string;
  name: string;
  categoryGroup: CategoryGroup;
  subCategory: string | null;
  city: string;
  neighborhood: string | null;
  address: string | null;
  phone: string | null;
  emailPrimary: string | null;
  emails: string[];
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  rating: number | null;
  reviewsCount: number | null;
  lat: number | null;
  lng: number | null;
  qualityScore: number;
  priority: Priority;
  status: LeadStatus;
  rejectionReason: RejectionReason | null;
  rejectionNote: string | null;
  lastOutboundAt: string | null;
  lastInboundAt: string | null;
  notes: string | null;
  createdAt: string;
  _count?: { outreachMessages: number };
  outreachMessages?: OutreachMessage[];
}

export interface OutreachMessage {
  id: string;
  leadId: string;
  direction: MessageDirection;
  channel: OutreachChannel;
  status: OutreachStatus;
  generatedBy: 'TEMPLATE' | 'AI' | null;
  subject: string | null;
  body: string;
  promptUsed: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  errorMessage: string | null;
  replyToId: string | null;
  createdAt: string;
}

export interface LeadStatusChange {
  id: string;
  leadId: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  reason: RejectionReason | null;
  note: string | null;
  createdAt: string;
}

export type TimelineItem =
  | { kind: 'message'; at: string; data: OutreachMessage }
  | { kind: 'status'; at: string; data: LeadStatusChange };

export interface Timeline {
  leadId: string;
  items: TimelineItem[];
}

export interface OutreachJob {
  id: string;
  name: string | null;
  channel: OutreachChannel;
  status: OutreachJobStatus;
  body: string;
  throttleMs: number;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  errorSummary: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  lastTickAt: string | null;
  items?: OutreachJobItem[];
}

export interface OutreachJobItem {
  id: string;
  jobId: string;
  leadId: string;
  body: string;
  status: OutreachJobItemStatus;
  outreachMessageId: string | null;
  errorMessage: string | null;
  attemptedAt: string | null;
  createdAt: string;
  lead?: { id: string; name: string; city: string; phone: string | null };
}

export interface ScrapeJob {
  id: string;
  apifyRunId: string | null;
  status: ScrapeJobStatus;
  cities: string[];
  categories: string[];
  zonesUsed: string[];
  perZoneLimit: number;
  totalScraped: number | null;
  totalIngested: number | null;
  totalDuplicates: number | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  estimatedPlaces?: number;
  estimatedCost?: number;
}

export interface ScrapeOptions {
  zones?: string[] | null;
  customQueries?: string[] | null;
  language?: 'en' | 'fr' | 'ar';
  minRating?: number | null;
  minReviews?: number | null;
  skipClosedPlaces?: boolean;
  scrapeContacts?: boolean;
}

export interface ScrapeTemplate {
  id: string;
  name: string;
  config: ScrapeOptions & {
    cities: string[];
    categories: string[];
    perZoneLimit: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LeadStats {
  total: number;
  byPriority: { priority: Priority; _count: number }[];
  byStatus: { status: LeadStatus; _count: number }[];
  byCategory: { categoryGroup: CategoryGroup; _count: number }[];
  byCity: { city: string; _count: number }[];
}

export const LEAD_STATUSES: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'RESPONDED',
  'INTERESTED',
  'MEETING_SCHEDULED',
  'NEGOTIATING',
  'CONVERTED',
  'REJECTED',
  'DO_NOT_CONTACT',
];

export const REJECTION_REASONS: RejectionReason[] = [
  'PRICE',
  'NO_NEED',
  'WRONG_CONTACT',
  'NO_RESPONSE',
  'COMPETITOR',
  'OTHER',
];
