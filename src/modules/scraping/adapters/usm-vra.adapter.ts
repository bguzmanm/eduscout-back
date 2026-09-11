import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScraperAdapter, RawJob } from './base.interface';
import { BROWSER_HEADERS } from './nuxt.parser';

const BASE_URL = 'https://vra.usm.cl';
const LISTING_URL = `${BASE_URL}/ofertas-laborales/feed/`;

const CAMPUS_REGION: Record<string, string> = {
  'San Joaquín': 'Metropolitana',
  Vitacura: 'Metropolitana',
  'Casa Central': 'Valparaíso',
  Valparaíso: 'Valparaíso',
};

interface FeedItem {
  title: string;
  link: string;
  id: string;
  pubDate?: string;
}

export class UsmVraAdapter implements ScraperAdapter {
  sourceSlug = 'usm';
  sourceName = 'Universidad Técnica Federico Santa María';

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    try {
      const { data: feed } = await axios.get<string>(LISTING_URL, {
        timeout: 20000,
        headers: BROWSER_HEADERS,
      });

      const items = this.parseFeed(feed);

      for (const item of items) {
        try {
          const job = await this.fetchDetail(item);
          if (job) jobs.push(job);
        } catch (error) {
          console.error(
            `[USM-VRA] Error al obtener detalle ${item.link}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      console.error(
        `[USM-VRA] Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private parseFeed(feed: string): FeedItem[] {
    const $ = cheerio.load(feed, { xmlMode: true });
    const items: FeedItem[] = [];

    $('item').each((_, el) => {
      const $el = $(el);
      const link = $el.find('link').first().text().trim();
      const guid = $el.find('guid').first().text().trim();
      const id =
        guid.match(/\bp=(\d+)\b/)?.[1] ??
        link.split('/').filter(Boolean).pop() ??
        '';

      if (!link || !id) return;

      items.push({
        title: $el.find('title').first().text().trim(),
        link,
        id,
        pubDate: $el.find('pubDate').first().text().trim(),
      });
    });

    return items;
  }

  private async fetchDetail(item: FeedItem): Promise<RawJob | null> {
    const { data: html } = await axios.get<string>(item.link, {
      timeout: 20000,
      headers: BROWSER_HEADERS,
    });

    const $ = cheerio.load(html);
    const root = $('div[data-elementor-type="single-post"]');
    if (!root.length) return null;

    const title = item.title || $('title').text().split(' - ')[0]?.trim() || '';
    if (!title) return null;

    const department = this.headingByPrefix($, 'Departamento de');
    const campus = this.iconListValue($, 'Campus');
    const jornada = this.iconListValue($, 'Tipo de jornada');
    const deadlineText = root
      .find('.elementor-icon-list-item')
      .filter((_, el) => $(el).find('i.fa-calendar-times').length > 0)
      .find('.elementor-icon-list-text')
      .first()
      .text()
      .trim();
    const envio = this.sectionByHeading($, 'Envío de antecedentes');
    const postulationUrl = envio
      ? envio.find('a[href]').attr('href') ?? null
      : null;

    return {
      externalId: item.id,
      title,
      company: this.sourceName,
      department: department || null,
      location: campus || null,
      region: this.inferRegion(campus),
      jobType: this.normalizeJobType(jornada),
      description: this.sectionByHeading($, 'Descripción')?.text().trim() || null,
      requirements:
        this.sectionByHeading($, 'Requisitos')?.text().trim() || null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      deadline: this.parseDeadline(deadlineText),
      applyUrl: postulationUrl || item.link,
    };
  }

  private headingByPrefix($: cheerio.CheerioAPI, prefix: string): string | null {
    const value = $('div[data-elementor-type="single-post"]')
      .find('.elementor-heading-title')
      .filter((_, el) => {
        const text = $(el).text().trim();
        return text.startsWith(prefix);
      })
      .first()
      .text()
      .trim();
    return value || null;
  }

  private iconListValue($: cheerio.CheerioAPI, label: string): string | null {
    const raw = $('div[data-elementor-type="single-post"]')
      .find('.elementor-icon-list-text')
      .filter((_, el) => {
        const text = $(el).text().trim();
        return text.startsWith(label);
      })
      .first()
      .text()
      .trim();
    if (!raw) return null;
    return raw.replace(new RegExp(`^${label}:?\\s*`), '').trim() || null;
  }

  private sectionByHeading(
    $: cheerio.CheerioAPI,
    headingText: string,
  ): any | null {
    const heading = $('div[data-elementor-type="single-post"]')
      .find('.elementor-heading-title')
      .filter((_, el) => $(el).text().trim() === headingText)
      .first();
    if (!heading.length) return null;

    const wrap = heading.closest(
      '.elementor-widget-wrap, [data-element_type="container"]',
    );
    const textEditor = wrap.find('.elementor-widget-text-editor').first();
    return textEditor.length ? textEditor : null;
  }

  private inferRegion(campus: string | null): string | null {
    if (!campus) return null;
    for (const [key, region] of Object.entries(CAMPUS_REGION)) {
      if (campus.includes(key)) return region;
    }
    return null;
  }

  private normalizeJobType(jornada: string | null): string | null {
    if (!jornada) return null;
    switch (jornada.toLowerCase()) {
      case 'completa':
      case 'tiempo completo':
      case 'full time':
        return 'Jornada Completa';
      case 'part time':
      case 'medio tiempo':
        return 'Part Time';
      case 'mixta':
        return 'Mixta';
      default:
        return jornada;
    }
  }

  private parseDeadline(text: string): Date | null {
    const match = text.match(/^(\d{2})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
}