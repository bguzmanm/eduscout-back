import axios from 'axios';
import { Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { ScraperAdapter, RawJob } from './base.interface';
import { BROWSER_HEADERS } from './nuxt.parser';

const BASE_URL = 'https://cyl.uv.cl';
const LISTING_URL = `${BASE_URL}/cargos?format=feed&type=rss`;

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

interface FeedItem {
  title: string;
  link: string;
  id: string;
  description?: string;
  pubDate?: string;
}

export class UvCargosAdapter implements ScraperAdapter {
  sourceSlug = 'uv';
  sourceName = 'Universidad de Valparaíso';
  private readonly logger = new Logger('UvCargosAdapter');

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
          this.logger.error(
            `Error al obtener detalle ${item.link}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error al scraping: ${(error as Error).message}`,
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
      const id = link.match(/\/cargos\/(\d+)/)?.[1] ?? '';

      if (!link || !id) return;

      items.push({
        title: $el.find('title').first().text().trim(),
        link,
        id,
        description: $el.find('description').first().text() || undefined,
        pubDate: $el.find('pubDate').first().text().trim(),
      });
    });

    return items;
  }

  private async fetchDetail(item: FeedItem): Promise<RawJob | null> {
    const title = item.title || '';
    if (!title) return null;

    let applyUrl: string | null = null;

    try {
      const { data: html } = await axios.get<string>(item.link, {
        timeout: 20000,
        headers: BROWSER_HEADERS,
      });
      applyUrl = this.extractPostulationUrl(html);
    } catch {
      // fallback al link de la oferta
    }

    return {
      externalId: item.id,
      title,
      company: this.sourceName,
      department: null,
      location: null,
      region: 'Valparaíso',
      jobType: null,
      description: item.description || null,
      requirements: null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      deadline: this.parseDeadline(item.description),
      applyUrl: applyUrl || item.link,
    };
  }

  private extractPostulationUrl(html: string): string | null {
    const $ = cheerio.load(html);
    const link = $('a[href]')
      .filter((_, el) => /postula/i.test($(el).text().trim()))
      .attr('href');
    if (!link) return null;
    return link.startsWith('http') ? link : `${BASE_URL}${link}`;
  }

  private parseDeadline(description?: string): Date | null {
    if (!description) return null;

    const match = description.match(
      /hasta el (?:[a-zñáéíóú]+ )?\d{1,2} de ([a-zñáéíóú]+) de (\d{4})/i,
    );
    if (!match) return null;

    const month = MONTHS[match[1].toLowerCase().trim()];
    if (month === undefined) return null;

    const day = parseInt(match[0].match(/\d{1,2}/)?.[0] ?? '', 10);
    const year = parseInt(match[2], 10);
    return new Date(year, month, day);
  }
}