import axios from 'axios';
import { Logger } from '@nestjs/common';
import type { ScraperAdapter, RawJob } from './base.interface';

const BASE_URL = 'https://www.laborum.cl';
const PAGE_SIZE = 50;
const AREA_EDUCACION_DOCENCIA_INVESTIGACION = 'educacion-docencia-e-investigacion';

export function extractEmpresaId(baseUrl: string): number {
  const match = baseUrl.match(/_(\d+)\.html$/);
  return match ? Number(match[1]) : NaN;
}

interface LaborumAviso {
  id: number;
  titulo: string;
  detalle: string;
  empresa: string;
  localizacion: string;
  tipoTrabajo: string;
  modalidadTrabajo: string;
  fechaPublicacion: string;
  cantidadVacantes: number;
}

interface SearchV2Response {
  total: number;
  content: LaborumAviso[];
}

const JOB_TYPE_MAP: Record<string, string> = {
  'full-time': 'Jornada Completa',
  'part time': 'Part Time',
};

export class LaborumAdapter implements ScraperAdapter {
  sourceSlug: string;
  sourceName: string;
  private readonly logger = new Logger('LaborumAdapter');
  private readonly empresaId: number;
  private readonly profileUrl: string;

  constructor(slug: string, name: string, baseUrl: string) {
    this.sourceSlug = slug;
    this.sourceName = name;
    this.profileUrl = baseUrl;
    this.empresaId = extractEmpresaId(baseUrl);
  }

  private get requestHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': 'es-CL,es;q=0.9',
      'Referer': this.profileUrl,
      'x-site-id': 'BMCL',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    };
  }

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    if (Number.isNaN(this.empresaId)) {
      this.logger.error(
        `No fue posible extraer el ID de empresa desde: ${this.profileUrl}`,
      );
      return jobs;
    }

    try {
      const firstPage = await this.fetchPage(0);
      const total = firstPage.total;
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const avisos = firstPage.content;

      for (let page = 1; page < pages; page++) {
        const data = await this.fetchPage(page);
        avisos.push(...data.content);
      }

      for (const aviso of avisos) {
        jobs.push(this.mapAviso(aviso));
      }
    } catch (error) {
      this.logger.error(
        `Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private async fetchPage(page: number): Promise<SearchV2Response> {
    const { data } = await axios.post<SearchV2Response>(
      `${BASE_URL}/api/avisos/searchV2?page=${page}&pageSize=${PAGE_SIZE}`,
      {
        empresaId: this.empresaId,
        filtros: [{ id: 'area', value: AREA_EDUCACION_DOCENCIA_INVESTIGACION }],
        tipoDetalle: 'full',
      },
      { headers: this.requestHeaders, timeout: 20000 },
    );

    return data;
  }

  private mapAviso(aviso: LaborumAviso): RawJob {
    const [ciudad = null, provincia = null] = (aviso.localizacion || '')
      .split(',')
      .map((s) => s.trim());

    return {
      externalId: String(aviso.id),
      title: aviso.titulo.slice(0, 255),
      company: aviso.empresa || this.sourceName,
      department: null,
      location: ciudad,
      region: this.mapRegion(provincia) ?? provincia,
      jobType: this.mapJobType(aviso.tipoTrabajo),
      description: aviso.detalle || null,
      requirements: null,
      salaryRange: null,
      publishedAt: this.parseDate(aviso.fechaPublicacion),
      deadline: null,
      applyUrl: `${BASE_URL}/empleos/${aviso.id}.html`,
    };
  }

  private mapRegion(provincia: string | null): string | null {
    if (!provincia) return null;
    const lower = provincia.toLowerCase();
    if (lower.includes('metropolitana')) return 'Metropolitana';
    if (lower.startsWith('región ')) {
      return provincia.slice('región '.length).trim();
    }
    return null;
  }

  private mapJobType(tipo: string): string | null {
    if (!tipo) return null;
    const key = tipo.toLowerCase();
    return JOB_TYPE_MAP[key] ?? tipo;
  }

  private parseDate(fecha: string): Date | null {
    if (!fecha) return null;
    const [day, month, year] = fecha.split('-').map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }
}