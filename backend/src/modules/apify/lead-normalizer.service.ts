import { Injectable } from '@nestjs/common';
import { LeadCategoryGroup, LeadPriority, Prisma } from '@prisma/client';

export interface NormalizedLead {
  placeId: string;
  data: Omit<Prisma.LeadCreateInput, 'placeId' | 'scrapeJob'>;
}

@Injectable()
export class LeadNormalizerService {
  /**
   * Normalize one raw Apify item. Returns null if it has no usable identifier
   * (no placeId AND no name) — those are noise.
   */
  normalize(raw: any, expectedCity?: string): NormalizedLead | null {
    const placeId = this.extractPlaceId(raw);
    if (!placeId) return null;
    if (!raw.title) return null;

    const emails: string[] = Array.isArray(raw.emails) ? raw.emails.filter(Boolean) : [];
    const instagrams: string[] = Array.isArray(raw.instagrams) ? raw.instagrams : [];
    const facebooks: string[] = Array.isArray(raw.facebooks) ? raw.facebooks : [];

    const subCategory: string | undefined = raw.categoryName || (raw.categories?.[0] ?? undefined);
    const categoryGroup = this.classifyCategory(subCategory);

    const phone: string | undefined = raw.phoneUnformatted || undefined;
    const website: string | undefined = raw.website || undefined;
    const instagram = instagrams[0];
    const facebook = facebooks[0];

    const rating: number | undefined = typeof raw.totalScore === 'number' ? raw.totalScore : undefined;
    const reviewsCount: number | undefined = typeof raw.reviewsCount === 'number' ? raw.reviewsCount : undefined;

    const score = this.computeScore({
      hasEmail: emails.length > 0,
      hasPhone: !!phone,
      hasWebsite: !!website,
      hasSocial: !!(instagram || facebook),
      reviewsCount,
      rating,
    });
    const priority = this.scoreToPriority(score);

    // Normalize city. Apify sometimes returns lowercase, sometimes mixed.
    let city = (raw.city || expectedCity || '').trim();
    if (city) city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();

    return {
      placeId,
      data: {
        name: raw.title,
        categoryGroup,
        subCategory: subCategory ?? null,
        city,
        neighborhood: raw.neighborhood || null,
        address: raw.address || null,
        phone: phone ?? null,
        emailPrimary: emails[0] ?? null,
        emails,
        website: website ?? null,
        instagram: instagram ?? null,
        facebook: facebook ?? null,
        rating: rating ?? null,
        reviewsCount: reviewsCount ?? null,
        lat: raw.location?.lat ?? null,
        lng: raw.location?.lng ?? null,
        qualityScore: score,
        priority,
        rawData: raw,
      },
    };
  }

  /**
   * Apify gives a maps URL like:
   *   https://www.google.com/maps/search/?api=1&query=...&query_place_id=ChIJ...
   * The placeId is the only stable dedup key Google exposes.
   */
  private extractPlaceId(raw: any): string | null {
    const url: string | undefined = raw.url;
    if (!url) return null;
    const m = url.match(/query_place_id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  private classifyCategory(sub?: string): LeadCategoryGroup {
    if (!sub) return LeadCategoryGroup.OTHER;
    const s = sub.toLowerCase();
    if (s.includes('hotel') || s.includes('resort') || s.includes('apartment') || s.includes('vacation')) {
      return LeadCategoryGroup.HOTEL;
    }
    if (s.includes('coffee') || s.includes('cafe') || s.includes('espresso') || s.includes('tea house')) {
      return LeadCategoryGroup.CAFE;
    }
    if (
      s.includes('restaurant') ||
      s.includes('sushi') ||
      s.includes('brunch') ||
      s.includes('breakfast') ||
      s.includes('fast food') ||
      s.includes('seafood') ||
      s.includes('asian') ||
      s.includes('arab') ||
      s.includes('moroccan') ||
      s.includes('mediterranean') ||
      s.includes('halal') ||
      s.includes('barbecue') ||
      s.includes('pizza') ||
      s.includes('burger') ||
      s.includes('grill')
    ) {
      return LeadCategoryGroup.RESTAURANT;
    }
    return LeadCategoryGroup.OTHER;
  }

  private computeScore(p: {
    hasEmail: boolean;
    hasPhone: boolean;
    hasWebsite: boolean;
    hasSocial: boolean;
    reviewsCount?: number;
    rating?: number;
  }): number {
    let s = 0;
    if (p.hasEmail) s += 3;
    if (p.hasPhone) s += 2;
    if (p.hasWebsite) s += 1;
    if (p.hasSocial) s += 1;
    if (p.reviewsCount && p.reviewsCount >= 100) s += 1;
    if (p.rating && p.rating >= 4.0) s += 1;
    return s;
  }

  private scoreToPriority(score: number): LeadPriority {
    if (score >= 7) return LeadPriority.A;
    if (score >= 5) return LeadPriority.B;
    if (score >= 3) return LeadPriority.C;
    return LeadPriority.D;
  }
}
