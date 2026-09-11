import axios from 'axios';
import type { ScraperAdapter, RawJob } from './base.interface';
import {
  BROWSER_HEADERS,
  extractNuxtOfferCards,
  parseNuxtData,
} from './nuxt.parser';

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
        {
          timeout: 20000,
          headers: BROWSER_HEADERS,
        },
      );

      const cards = extractNuxtOfferCards(parseNuxtData(html));

      for (const card of cards) {
        try {
          const detail = await this.fetchDetail(card.id);
          jobs.push(this.mapDetail(card, detail));
        } catch {
          jobs.push(this.mapCard(card));
        }
      }
    } catch (error) {
      console.error(
        `[${this.sourceSlug}] Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private async fetchDetail(id: number): Promise<OfferDetail> {
    const { data } = await axios.get<OfferDetail>(
      `https://${this.sourceSlug}.trabajando.cl/api/ofertas/${id}`,
      {
        timeout: 20000,
        headers: BROWSER_HEADERS,
      },
    );
    return data;
  }

  private mapDetail(
    card: {
      id: number;
      title: string;
      location: string;
      publishedAt: string;
    },
    detail: OfferDetail,
  ): RawJob {
    const ubicacion = detail.ubicacion ?? {};
    const comuna = String(ubicacion.nombreComuna ?? '');
    const regionName = String(ubicacion.nombreRegion ?? '');
    const location =
      comuna && regionName ? `${comuna}, ${regionName}` : card.location;

    return {
      externalId: String(card.id),
      title: String(detail.nombreCargo ?? card.title),
      company:
        String(detail.nombreEmpresaFantasia ?? '') || this.sourceName,
      department: String(detail.nombreArea ?? '') || null,
      location: location || null,
      region: regionName || this.extractRegion(card.location),
      jobType: String(detail.nombreJornada ?? '') || null,
      description: String(detail.descripcionOferta ?? '') || null,
      requirements: String(detail.requisitosMinimos ?? '') || null,
      salaryRange: this.extractSalaryRange(detail),
      publishedAt: detail.fechaPublicacionFormatoIngles
        ? new Date(String(detail.fechaPublicacionFormatoIngles))
        : card.publishedAt
          ? new Date(card.publishedAt)
          : undefined,
      deadline: detail.fechaExpiracionFormatoIngles
        ? new Date(String(detail.fechaExpiracionFormatoIngles))
        : undefined,
      applyUrl: `https://${this.sourceSlug}.trabajando.cl/trabajo/${card.id}`,
    };
  }

  private mapCard(card: {
    id: number;
    title: string;
    company: string;
    description: string;
    location: string;
    jobType: string;
    publishedAt: string;
  }): RawJob {
    return {
      externalId: String(card.id),
      title: card.title,
      company: card.company || this.sourceName,
      department: null,
      location: card.location || null,
      region: this.extractRegion(card.location),
      jobType: card.jobType || null,
      description: card.description || null,
      requirements: null,
      publishedAt: card.publishedAt ? new Date(card.publishedAt) : undefined,
      applyUrl: `https://${this.sourceSlug}.trabajando.cl/trabajo/${card.id}`,
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

  private extractRegion(ubicacion: string | null): string | null {
    if (!ubicacion) return null;
    const parts = ubicacion.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : null;
  }
}