import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScraperAdapter, RawJob } from './base.interface';

const BASE_URL = 'https://www.ipsantotomas.cl/trabaja-con-nosotros/academicos/';

export class SantoTomasAdapter implements ScraperAdapter {
  sourceSlug = 'santo-tomas';
  sourceName = 'IP Santo Tomás';

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    try {
      const { data: html } = await axios.get<string>(BASE_URL, {
        timeout: 15000,
      });

      const $ = cheerio.load(html);

      $('table tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 4) return;

        const estamento = $(cells[0]).text().trim();
        const title = $(cells[1]).text().trim();
        const location = $(cells[2]).text().trim();
        const applyUrl = $(cells[3]).find('a').attr('href')?.trim();

        if (!title || !applyUrl) return;

        const externalId = applyUrl.replace(/.*\/trabajo\//, '').replace(/\/$/, '');

        jobs.push({
          externalId,
          title,
          company: this.sourceName,
          department: null,
          location: location || null,
          region: this.mapRegion(location),
          jobType: this.extractJobType(title),
          description: null,
          requirements: null,
          salaryRange: null,
          publishedAt: null,
          deadline: null,
          applyUrl,
        });
      });
    } catch (error) {
      console.error(
        `[SantoTomas] Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private extractJobType(title: string): string | null {
    const lower = title.toLowerCase();
    if (lower.includes('jornada completa') || lower.includes('34 horas') || lower.includes('44 horas')) {
      return 'Jornada Completa';
    }
    if (lower.includes('media jornada') || lower.includes('11 horas') || lower.includes('22 horas') || lower.includes('part time')) {
      return 'Part Time';
    }
    if (lower.includes('mixta')) {
      return 'Mixta';
    }
    return null;
  }

  private mapRegion(location: string): string | null {
    const regionMap: Record<string, string> = {
      'santiago': 'Metropolitana',
      'casa central': 'Metropolitana',
      'san joaquín': 'Metropolitana',
      'san joaquin': 'Metropolitana',
      'viña': 'Valparaíso',
      'vina': 'Valparaíso',
      'valparaíso': 'Valparaíso',
      'antofagasta': 'Antofagasta',
      'copiapó': 'Atacama',
      'copiapo': 'Atacama',
      'chillán': 'Ñuble',
      'chillan': 'Ñuble',
      'concepción': 'Biobío',
      'concepcion': 'Biobío',
      'temuco': 'Araucanía',
      'valdivia': 'Los Ríos',
      'puerto montt': 'Los Lagos',
      'punta arenas': 'Magallanes',
      'iquique': 'Tarapacá',
      'arica': 'Arica y Parinacota',
    };

    const lower = location.toLowerCase();
    for (const [key, region] of Object.entries(regionMap)) {
      if (lower.includes(key)) return region;
    }
    return null;
  }
}
