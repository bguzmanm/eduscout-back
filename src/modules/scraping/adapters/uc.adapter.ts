import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScraperAdapter, RawJob } from './base.interface';

const BASE_URL = 'https://cargosacademicos.uc.cl';

export class UcAdapter implements ScraperAdapter {
  sourceSlug = 'uc';
  sourceName = 'Pontificia Universidad Católica de Chile';

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    try {
      const { data: html } = await axios.get<string>(BASE_URL, {
        timeout: 15000,
      });

      const $ = cheerio.load(html);

      $('.uc-card').each((_, element) => {
        const $card = $(element);

        const titleEl = $card.find('h2.h4 a');
        const title = titleEl.text().trim();
        const detailPath = titleEl.attr('href');

        if (!title || !detailPath) return;

        const unit = $card.find('.row .col:first-child p').text().trim();
        const faculty = $card.find('.row .col:last-child p').text().trim();
        const deadline = $card
          .find('.oferta-uc-icon-fecha')
          .text()
          .replace('Postulación abierta hasta el:', '')
          .trim();
        const campus = $card
          .find('.oferta-uc-icon-campus')
          .text()
          .trim();

        const fullUrl = detailPath.startsWith('http') ? detailPath : `${BASE_URL}${detailPath}`;
        const externalId = fullUrl.replace(/.*\/oferta\//, '').replace(/\/$/, '');

        jobs.push({
          externalId,
          title,
          company: this.sourceName,
          department: faculty || unit || null,
          location: campus || 'Santiago',
          region: 'Metropolitana',
          jobType: null,
          description: $card.find('.content p').text().trim() || null,
          deadline: deadline ? this.parseDate(deadline) : undefined,
          applyUrl: fullUrl,
        });
      });
    } catch (error) {
      console.error(
        `[UC] Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private parseDate(dateStr: string): Date | undefined {
    try {
      const months: Record<string, number> = {
        enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
        julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
      };
      const match = dateStr.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/i);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = months[match[2].toLowerCase()];
        const year = parseInt(match[3], 10);
        if (month !== undefined) {
          return new Date(year, month, day);
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  }
}
