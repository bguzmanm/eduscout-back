import axios from 'axios';
import * as cheerio from 'cheerio';
import { Logger } from '@nestjs/common';
import type { ScraperAdapter, RawJob } from './base.interface';
import { BROWSER_HEADERS } from './nuxt.parser';

const BASE_URL = 'https://uniacc.hiringroom.com';
const MAX_PAGES = 20;
const DOCENCIA_AREA_ID = '9';

const REGION_ALIASES: Record<string, string> = {
  'de arica y parinacota': 'Arica y Parinacota',
  tarapacá: 'Tarapacá',
  antofagasta: 'Antofagasta',
  atacama: 'Atacama',
  coquimbo: 'Coquimbo',
  valparaíso: 'Valparaíso',
  metropolitana: 'Metropolitana',
  "o'higgins": "O'Higgins",
  maule: 'Maule',
  ñuble: 'Ñuble',
  'del biobío': 'Biobío',
  'del bío bío': 'Biobío',
  biobío: 'Biobío',
  araucanía: 'Araucanía',
  'de los ríos': 'Los Ríos',
  'de los lagos': 'Los Lagos',
  aysén: 'Aysén',
  magallanes: 'Magallanes',
};

const JOB_TYPE_MAP: Record<string, string> = {
  'full-time': 'Jornada Completa',
  'part time': 'Part Time',
  'media jornada': 'Media Jornada',
};

interface HiringRoomCard {
  id: string;
  title: string;
  location: string;
  area: string;
  jobType: string;
  modality: string;
  relativeTime: string;
}

export function mapRegion(raw: string | null): string | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => s.trim());
  const candidate = parts.length > 1 ? parts[1] : parts[0];
  const key = candidate.toLowerCase();
  return REGION_ALIASES[key] ?? null;
}

export function parseRelativeDate(text: string, now = new Date()): Date | null {
  if (!text) return null;
  const match = text
    .toLowerCase()
    .trim()
    .match(/hace\s+(\d+)\s+(hora|d[íi]a|semana|mes|año)s?/i);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!amount) return null;

  const unit = match[2];
  const units: Record<string, number> = {
    hora: 1000 * 60 * 60,
    día: 1000 * 60 * 60 * 24,
    dia: 1000 * 60 * 60 * 24,
    semana: 1000 * 60 * 60 * 24 * 7,
    mes: 1000 * 60 * 60 * 24 * 30,
    año: 1000 * 60 * 60 * 24 * 365,
  };
  return new Date(now.getTime() - amount * (units[unit] ?? 0));
}

export function parseVacancyCards(htmlContent: string): HiringRoomCard[] {
  const $ = cheerio.load(htmlContent);
  const cards: HiringRoomCard[] = [];

  $('a[href^="/jobs/get_vacancy/"]').each((_, el) => {
    const $card = $(el);
    const href = $card.attr('href') ?? '';
    const id = href.split('/').pop() ?? '';

    const textOfIcon = (iconClass: string): string => {
      const icon = $card.find(`i.${iconClass}`).first();
      const p = icon.closest('p');
      if (!p.length) return '';
      return p
        .text()
        .replace(icon.text(), '')
        .trim();
    };

    cards.push({
      id,
      title: $card.find('.name__vacancy').text().trim(),
      location: textOfIcon('hr-Location-pin'),
      area: textOfIcon('hr-Work-area'),
      jobType: textOfIcon('hr-Clock'),
      modality: textOfIcon('hr-Company'),
      relativeTime: $card.find('.vacancy-time').text().trim(),
    });
  });

  return cards;
}

export function extractDetailSection(
  html: string,
  heading: string,
): string | null {
  const $ = cheerio.load(html);
  const $h = $('h6')
    .filter((_, el) => $(el).text().trim() === heading)
    .first();
  if (!$h.length) return null;
  const content = $h.nextAll('div').first();
  if (!content.length) return null;
  const text = content.text().trim();
  return text || null;
}

export class HiringRoomAdapter implements ScraperAdapter {
  sourceSlug = 'uniacc';
  sourceName = 'UNIACC';
  private readonly logger = new Logger('HiringRoomAdapter');

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    try {
      const cards = await this.fetchAllCards();

      for (const card of cards) {
        try {
          const detail = await this.fetchDetail(card.id);
          jobs.push(this.mapDetail(card, detail));
        } catch {
          jobs.push(this.mapCard(card));
        }
      }
    } catch (error) {
      this.logger.error(
        `Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private async fetchAllCards(): Promise<HiringRoomCard[]> {
    const cards: HiringRoomCard[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data } = await axios.post<{
        result: string;
        data: { htmlContent: string };
      }>(
        `${BASE_URL}/jobs/getVacanciesForPortal/${page}`,
        `typePortal=external&microSiteId=&searchAreas=["${DOCENCIA_AREA_ID}"]`,
        {
          timeout: 20000,
          headers: {
            ...BROWSER_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            Referer: `${BASE_URL}/jobs`,
          },
        },
      );

      if (data.result !== 'success' || !data.data?.htmlContent) break;
      const pageCards = parseVacancyCards(data.data.htmlContent);
      if (pageCards.length === 0) break;
      cards.push(...pageCards);
    }

    return cards;
  }

  private async fetchDetail(id: string): Promise<string> {
    const { data: html } = await axios.get<string>(
      `${BASE_URL}/jobs/get_vacancy/${id}`,
      {
        timeout: 20000,
        headers: BROWSER_HEADERS,
      },
    );
    return html;
  }

  private mapDetail(card: HiringRoomCard, detailHtml: string): RawJob {
    return {
      externalId: card.id,
      title: card.title.slice(0, 255),
      company: this.sourceName,
      department: card.area || null,
      location: this.cityLocation(card.location),
      region: mapRegion(card.location),
      jobType: this.mapJobType(card.jobType),
      description: extractDetailSection(detailHtml, 'Descripción del puesto'),
      requirements: extractDetailSection(detailHtml, 'Requisitos'),
      salaryRange: null,
      publishedAt: parseRelativeDate(card.relativeTime) ?? undefined,
      deadline: null,
      applyUrl: `${BASE_URL}/jobs/get_vacancy/${card.id}`,
    };
  }

  private mapCard(card: HiringRoomCard): RawJob {
    return {
      externalId: card.id,
      title: card.title.slice(0, 255),
      company: this.sourceName,
      department: card.area || null,
      location: this.cityLocation(card.location),
      region: mapRegion(card.location),
      jobType: this.mapJobType(card.jobType),
      description: null,
      requirements: null,
      salaryRange: null,
      publishedAt: parseRelativeDate(card.relativeTime) ?? undefined,
      deadline: null,
      applyUrl: `${BASE_URL}/jobs/get_vacancy/${card.id}`,
    };
  }

  private cityLocation(location: string): string | null {
    if (!location) return null;
    const parts = location.split(',').map((s) => s.trim());
    if (parts[parts.length - 1].toLowerCase() === 'chile') parts.pop();
    return parts.join(', ') || null;
  }

  private mapJobType(tipo: string): string | null {
    if (!tipo) return null;
    const key = tipo.toLowerCase();
    return JOB_TYPE_MAP[key] ?? tipo;
  }
}