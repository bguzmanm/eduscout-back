import axios from 'axios';
import type { ScraperAdapter, RawJob } from './base.interface';

interface NuxtOferta {
  idOferta: number;
  nombreCargo: string;
  nombreEmpresa: string;
  descripcionOferta: string;
  ubicacion: string;
  nombreJornada: string;
  fechaPublicacion: string;
}

interface TrabajandoConfig {
  comunidad: string;
}

export class TrabajandoClAdapter implements ScraperAdapter {
  sourceSlug = '';
  sourceName = '';

  constructor(slug: string, name: string) {
    this.sourceSlug = slug;
    this.sourceName = name;
  }

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    try {
      const { data: html } = await axios.get<string>(
        `https://${this.sourceSlug}.trabajando.cl/`,
        { timeout: 20000 },
      );

      const offers = this.extractFromNuxtData(html);

      for (const offer of offers) {
        const region = this.extractRegion(offer.ubicacion);

        jobs.push({
          externalId: String(offer.idOferta),
          title: offer.nombreCargo,
          company: offer.nombreEmpresa || this.sourceName,
          department: null,
          location: offer.ubicacion || null,
          region,
          jobType: offer.nombreJornada || null,
          description: offer.descripcionOferta || null,
          requirements: null,
          publishedAt: offer.fechaPublicacion
            ? new Date(offer.fechaPublicacion)
            : undefined,
          applyUrl: `https://${this.sourceSlug}.trabajando.cl/trabajo/${offer.idOferta}`,
        });
      }
    } catch (error) {
      console.error(
        `[${this.sourceSlug}] Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private extractFromNuxtData(html: string): NuxtOferta[] {
    const offers: NuxtOferta[] = [];

    const match = html.match(
      /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!match) return offers;

    try {
      const raw = JSON.parse(match[1]) as unknown[];

      for (let i = 0; i < raw.length; i++) {
        if (raw[i] === 'idOferta') {
          const offer: Partial<NuxtOferta> = {};
          offer.idOferta = raw[i + 1] as number;

          for (let j = i + 2; j < Math.min(i + 30, raw.length); j += 2) {
            const key = raw[j];
            const val = raw[j + 1];
            if (typeof key !== 'string') continue;

            switch (key) {
              case 'nombreCargo':
                offer.nombreCargo = val as string;
                break;
              case 'nombreEmpresa':
                offer.nombreEmpresa = val as string;
                break;
              case 'descripcionOferta':
                offer.descripcionOferta = val as string;
                break;
              case 'ubicacion':
                offer.ubicacion = val as string;
                break;
              case 'nombreJornada':
                offer.nombreJornada = val as string;
                break;
              case 'fechaPublicacion':
                offer.fechaPublicacion = val as string;
                break;
            }
          }

          if (offer.idOferta && offer.nombreCargo) {
            offers.push(offer as NuxtOferta);
          }
          break;
        }
      }
    } catch {
      // Could not parse Nuxt data
    }

    return offers;
  }

  private extractRegion(ubicacion: string | null): string | null {
    if (!ubicacion) return null;
    const parts = ubicacion.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : null;
  }
}
