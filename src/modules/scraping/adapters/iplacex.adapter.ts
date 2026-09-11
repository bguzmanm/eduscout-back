import axios from 'axios';
import type { ScraperAdapter, RawJob } from './base.interface';

const API_BASE = 'https://iplacex-desarrollo-p3asqz2yga-tl.a.run.app';
const APPLY_BASE = 'https://convocatoriasdocentes.iplacex.cl/';

interface IplacexConvocatoria {
  id: string;
  modalidad: string;
  sede: string;
  escuela: string;
  gradoAcademico: string;
  aniosExperienciaDocencia: string;
  aniosExperienciaLaboral: string;
  otrosRequisitos: string;
  cursosInteres: string;
  periodo: string;
  nombreConvocatoria: string;
  descConvocatoria: string;
  fechaInicio: string;
  fechaTermino: string;
  carrerasRequeridas: string;
  finalizado: boolean;
}

interface IplacexResponse {
  Listaconvocatorias: IplacexConvocatoria[];
}

const REGION_MAP: Record<string, string> = {
  copiapó: 'Atacama',
  'viña del mar': 'Valparaíso',
  santiago: 'Metropolitana',
  concepción: 'Biobío',
  talca: 'Maule',
  'a distancia': 'Metropolitana',
};

export class IplacexAdapter implements ScraperAdapter {
  sourceSlug = 'iplacex';
  sourceName = 'Instituto Profesional Iplacex';

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    try {
      const { data } = await axios.get<IplacexResponse>(
        `${API_BASE}/api/convocatorias/getList`,
        { timeout: 20000 },
      );

      const now = new Date();

      const active = data.Listaconvocatorias.filter(
        (c) =>
          !c.finalizado &&
          (!c.fechaTermino || new Date(c.fechaTermino) > now),
      );

      for (const item of active) {
        const requirements = this.buildRequirements(item);

        jobs.push({
          externalId: item.id,
          title: item.nombreConvocatoria,
          company: this.sourceName,
          department: item.escuela || null,
          location: item.sede || null,
          region: this.mapRegion(item.sede),
          jobType: this.mapModalidad(item.modalidad),
          description: item.descConvocatoria || null,
          requirements,
          salaryRange: null,
          publishedAt: item.fechaInicio
            ? new Date(item.fechaInicio)
            : null,
          deadline: item.fechaTermino
            ? new Date(item.fechaTermino)
            : null,
          applyUrl: APPLY_BASE,
        });
      }
    } catch (error) {
      console.error(
        `[Iplacex] Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private buildRequirements(item: IplacexConvocatoria): string {
    const partes: string[] = [];

    if (item.gradoAcademico) {
      partes.push(`Grado académico: ${item.gradoAcademico}`);
    }

    if (item.carrerasRequeridas) {
      const carreras = item.carrerasRequeridas
        .split('#')
        .map((c) => c.trim())
        .filter(Boolean);
      if (carreras.length > 0) {
        partes.push(`Carreras requeridas: ${carreras.join(', ')}`);
      }
    }

    if (item.aniosExperienciaDocencia) {
      partes.push(
        `Experiencia en docencia: ${item.aniosExperienciaDocencia} años`,
      );
    }

    if (item.aniosExperienciaLaboral) {
      partes.push(
        `Experiencia laboral: ${item.aniosExperienciaLaboral} años`,
      );
    }

    if (item.otrosRequisitos) {
      partes.push(`Otros requisitos: ${item.otrosRequisitos}`);
    }

    return partes.join('\n');
  }

  private mapRegion(sede: string): string | null {
    const lower = (sede || '').toLowerCase().trim();
    for (const [key, region] of Object.entries(REGION_MAP)) {
      if (lower.includes(key)) return region;
    }
    return null;
  }

  private mapModalidad(modalidad: string): string | null {
    const lower = (modalidad || '').toLowerCase();
    if (lower.includes('a distancia')) return 'Teletrabajo';
    if (lower.includes('semi')) return 'Mixta';
    return null;
  }
}