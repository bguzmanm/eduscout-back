import axios from 'axios';
import { Logger } from '@nestjs/common';
import type { ScraperAdapter, RawJob } from './base.interface';
import {
  BROWSER_HEADERS,
  extractNuxtOfferCards,
  parseNuxtData,
} from './nuxt.parser';

const BASE_URL = 'https://santotomas.trabajando.cl';
const LISTING_URL = `${BASE_URL}/`;
const DETAIL_URL = (id: number): string => `${BASE_URL}/api/ofertas/${id}`;

interface OfferDetail {
  slug?: unknown;
  nombreCargo?: unknown;
  nombreEmpresaFantasia?: unknown;
  nombreArea?: unknown;
  nombreJornada?: unknown;
  descripcionOferta?: unknown;
  requisitosMinimos?: unknown;
  fechaPublicacionFormatoIngles?: unknown;
  fechaExpiracionFormatoIngles?: unknown;
  sueldo?: unknown;
  sueldoDesde?: unknown;
  sueldoHasta?: unknown;
  mostrarSueldo?: unknown;
  ubicacion?: Record<string, unknown>;
}

export class SantoTomasAdapter implements ScraperAdapter {
  sourceSlug = 'santo-tomas';
  sourceName = 'IP Santo Tomás';
  private readonly logger = new Logger('SantoTomasAdapter');

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    try {
      const { data: html } = await axios.get<string>(LISTING_URL, {
        timeout: 20000,
        headers: BROWSER_HEADERS,
      });

      const cards = extractNuxtOfferCards(parseNuxtData(html));

      for (const card of cards) {
        try {
          const detail = await this.fetchDetail(card.id);
          const job = this.mapDetail(detail);
          if (job) jobs.push(job);
        } catch (error) {
          this.logger.error(
            `Error al obtener detalle ${card.id}: ${(error as Error).message}`,
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

  private async fetchDetail(id: number): Promise<OfferDetail> {
    const { data } = await axios.get<OfferDetail>(DETAIL_URL(id), {
      timeout: 20000,
      headers: BROWSER_HEADERS,
    });
    return data;
  }

  private mapDetail(detail: OfferDetail): RawJob | null {
    const slug = String(detail.slug ?? '');
    if (!slug) return null;

    const ubicacion = detail.ubicacion ?? {};
    const comuna = String(ubicacion.nombreComuna ?? '');
    const regionName = String(ubicacion.nombreRegion ?? '');

    return {
      externalId: slug,
      title: String(detail.nombreCargo ?? ''),
      company: String(detail.nombreEmpresaFantasia ?? '') || this.sourceName,
      department: String(detail.nombreArea ?? '') || null,
      location: comuna && regionName ? `${comuna}, ${regionName}` : null,
      region: regionName || null,
      jobType: String(detail.nombreJornada ?? '') || null,
      description: String(detail.descripcionOferta ?? '') || null,
      requirements: String(detail.requisitosMinimos ?? '') || null,
      salaryRange: this.extractSalaryRange(detail),
      publishedAt: detail.fechaPublicacionFormatoIngles
        ? new Date(String(detail.fechaPublicacionFormatoIngles))
        : null,
      deadline: detail.fechaExpiracionFormatoIngles
        ? new Date(String(detail.fechaExpiracionFormatoIngles))
        : null,
      applyUrl: `${BASE_URL}/trabajo/${slug}`,
    };
  }

  private extractSalaryRange(detail: OfferDetail): string | null {
    if (!detail.mostrarSueldo) return null;

    const sueldoDesde = Number(detail.sueldoDesde ?? 0);
    const sueldoHasta = Number(detail.sueldoHasta ?? 0);
    const sueldo = Number(detail.sueldo ?? 0);

    if (sueldoDesde > 0 && sueldoHasta > 0) {
      return `$${sueldoDesde.toLocaleString('es-CL')} - $${sueldoHasta.toLocaleString('es-CL')}`;
    }
    if (sueldo > 0) {
      return `$${sueldo.toLocaleString('es-CL')}`;
    }
    return null;
  }
}