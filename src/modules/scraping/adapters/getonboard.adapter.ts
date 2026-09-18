import { Logger } from '@nestjs/common';
import axios from 'axios';
import type { RawJob, ScraperAdapter } from './base.interface';
import { BROWSER_HEADERS } from './nuxt.parser';

const API_BASE = 'https://www.getonbrd.com/api/v0';
const PAGE_SIZE = 120;

const CITY_REGION_MAP: Record<number, { city: string; region: string }> = {
  1: { city: 'Santiago', region: 'Metropolitana de Santiago' },
  4: { city: 'Viña del Mar', region: 'Valparaíso' },
  13: { city: 'Puerto Montt', region: 'Los Lagos' },
  283: { city: 'Temuco', region: 'La Araucanía' },
};

interface GobJobSearchResponse {
  data?: GobJob[];
  meta?: { page?: number; total_pages?: number };
}

export interface GobJob {
  id: string;
  attributes: {
    title: string;
    description?: string | null;
    functions?: string | null;
    desirable?: string | null;
    published_at?: number | null;
    location_cities?: { data?: { id?: number }[] };
  };
  links?: { public_url?: string };
}

export function getOnBoardCompanyFilter(companyId: string): string {
  return JSON.stringify([companyId]);
}

export function extractSede(title: string): string | null {
  const match = title.match(
    /\b(Sede|Campus)\s+[A-Za-zÁÉÍÓÚÜáéíóúüñÑ]+(?:\s+[A-Za-zÁÉÍÓÚÜáéíóúüñÑ]+)*/,
  );
  return match ? match[0] : null;
}

export function regionFromCityId(cityId: number): string | null {
  return CITY_REGION_MAP[cityId]?.region ?? null;
}

export function cityNameFromId(cityId: number): string | null {
  return CITY_REGION_MAP[cityId]?.city ?? null;
}

export function mapGobJobToRawJob(
  job: GobJob,
  sourceName: string,
): RawJob {
  const { attributes } = job;
  const firstCityId = attributes.location_cities?.data?.[0]?.id;
  const sede = extractSede(attributes.title);

  const requirements = [attributes.functions, attributes.desirable]
    .filter((part): part is string => !!part)
    .join('\n\n');

  return {
    externalId: job.id,
    title: attributes.title,
    company: sourceName,
    department: null,
    location:
      sede ?? (firstCityId !== undefined ? cityNameFromId(firstCityId) : null),
    region: firstCityId !== undefined ? regionFromCityId(firstCityId) : null,
    jobType: null,
    description: attributes.description ?? null,
    requirements: requirements || null,
    salaryRange: null,
    publishedAt: attributes.published_at
      ? new Date(attributes.published_at * 1000)
      : undefined,
    deadline: undefined,
    applyUrl: job.links?.public_url ?? `https://www.getonbrd.com/jobs/${job.id}`,
  };
}

export class GetOnBoardAdapter implements ScraperAdapter {
  sourceSlug: string;
  sourceName: string;
  private readonly companyId: string;
  private readonly logger = new Logger('GetOnBoardAdapter');

  constructor(slug: string, name: string, companyId = 'duoc-uc-cl') {
    this.sourceSlug = slug;
    this.sourceName = name;
    this.companyId = companyId;
  }

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    let page = 1;
    let totalPages = 1;

    try {
      do {
        const { data } = await axios.get<GobJobSearchResponse>(
          `${API_BASE}/search/jobs`,
          {
            timeout: 20000,
            headers: { ...BROWSER_HEADERS, Accept: 'application/json' },
            params: {
              companies: getOnBoardCompanyFilter(this.companyId),
              country_code: 'CL',
              per_page: PAGE_SIZE,
              page,
            },
          },
        );

        totalPages = data.meta?.total_pages ?? 1;
        for (const job of data.data ?? []) {
          jobs.push(mapGobJobToRawJob(job, this.sourceName));
        }
        page += 1;
      } while (page <= totalPages);
    } catch (error) {
      this.logger.error(
        `Error al consultar Get On Board: ${(error as Error).message}`,
      );
    }

    return jobs;
  }
}