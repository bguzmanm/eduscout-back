import axios from 'axios';
import { Logger } from '@nestjs/common';
import type { ScraperAdapter, RawJob } from './base.interface';

interface UchileConcurso {
  id: number;
  codigo: string;
  nombre: string;
  fecha_inicio: string;
  fecha_termino: string;
  nombre_contacto: string;
  correo_contacto: string;
  estado_concurso: string;
  id_facultad: number;
}

interface UchileFacultad {
  nombre_facultad: string;
  data: UchileConcurso[];
}

interface UchileDetalle extends UchileConcurso {
  estado: string;
  antecedentes: { id: number; nombre: string; obligatorio: string }[];
  archivos: { id: number; nombre: string; archivo: string }[];
}

const API_BASE = 'https://concurso-academico.uchile.cl/api';

export class UchileAdapter implements ScraperAdapter {
  sourceSlug = 'uchile';
  sourceName = 'Universidad de Chile';
  private readonly logger = new Logger('UchileAdapter');

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    try {
      const { data: facultades } = await axios.get<UchileFacultad[]>(
        `${API_BASE}/concursosPostulacion/`,
        { timeout: 15000 },
      );

      for (const fac of facultades) {
        for (const concurso of fac.data) {
          const detail = await this.fetchDetail(concurso.codigo);
          jobs.push({
            externalId: concurso.codigo,
            title: concurso.nombre,
            company: this.sourceName,
            department: fac.nombre_facultad,
            location: 'Santiago, Metropolitana',
            region: 'Metropolitana',
            jobType: this.extractJobType(concurso.nombre),
            description: detail?.antecedentes
              ?.map((a) => a.nombre)
              .join(', ') ?? concurso.nombre,
            requirements: detail?.archivos
              ?.map((a) => a.nombre)
              .join(', ') ?? null,
            publishedAt: concurso.fecha_inicio
              ? new Date(concurso.fecha_inicio)
              : undefined,
            deadline: concurso.fecha_termino
              ? new Date(concurso.fecha_termino)
              : undefined,
            applyUrl: `https://concurso-academico.uchile.cl/`,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private async fetchDetail(codigo: string): Promise<UchileDetalle | null> {
    try {
      const { data } = await axios.get<UchileDetalle>(
        `${API_BASE}/datosConcurso/${codigo}/`,
        { timeout: 10000 },
      );
      return data;
    } catch {
      return null;
    }
  }

  private extractJobType(nombre: string): string | null {
    if (/hora/i.test(nombre)) {
      const match = nombre.match(/(\d+)\s*hora/i);
      return match ? `${match[1]} horas` : 'Horas';
    }
    return null;
  }
}
