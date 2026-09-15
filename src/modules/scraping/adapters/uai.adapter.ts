import axios from 'axios';
import { Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { ScraperAdapter, RawJob } from './base.interface';

const PAGE_URL =
  'https://www.uai.cl/ingenieria-y-ciencias/academicos/concursos-academicos';

export class UaiAdapter implements ScraperAdapter {
  sourceSlug = 'uai';
  sourceName = 'Universidad Adolfo Ibañez';
  private readonly logger = new Logger('UaiAdapter');

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    try {
      const { data: html } = await axios.get<string>(PAGE_URL, {
        timeout: 15000,
      });

      const $ = cheerio.load(html);

      $('[data-module="new-containers-BannerContainer"]').each(
        (_, element) => {
          const $banner = $(element);

          const title = $banner.find('h2, h3').first().text().trim();
          if (!title) return;

          const deadlineText = $banner.find('p, span').first().text().trim();
          const deadline = this.extractDeadline(deadlineText);

          const content = $banner.find('div').last().text().trim();

          const link = $banner.find('a[href]').attr('href');
          const applyUrl = link?.startsWith('http')
            ? link
            : `https://www.uai.cl${link}`;

          const externalId = this.slugify(title);

          jobs.push({
            externalId,
            title,
            company: this.sourceName,
            department: 'Ingeniería y Ciencias',
            location: 'Santiago, Vitacura',
            region: 'Metropolitana',
            jobType: null,
            description: content || null,
            deadline,
            applyUrl: applyUrl || PAGE_URL,
          });
        },
      );
    } catch (error) {
      this.logger.error(
        `Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private extractDeadline(text: string): Date | undefined {
    const months: Record<string, number> = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    };
    const match = text.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/i);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = months[match[2].toLowerCase()];
      const year = parseInt(match[3], 10);
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
    return undefined;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 255);
  }
}
