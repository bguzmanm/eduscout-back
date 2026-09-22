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

const SECTION_HEADINGS = [
  'funciones del puesto',
  'funciones y responsabilidades',
  'objetivo del cargo',
  'principales funciones',
  'condiciones del cargo',
  'condiciones laborales',
  'misión del cargo',
  'objetivo del puesto',
  'perfil del candidato',
  'perfil requerido',
  'perfil del cargo',
  'requisitos del cargo',
  'plazo de postulación',
  'lugar de trabajo',
  'jornada laboral',
  'cómo postular',
  'como postular',
  'remuneración',
  'conocimientos',
  'educación',
  'experiencia',
  'deseable',
  'beneficios',
  'vacantes',
  'postulación',
  'funciones',
  'misión',
  'perfil',
  'requisitos',
  'jornada',
  'ofrecemos',
].sort((a, b) => b.length - a.length);

const capitalizer = (label: string): string =>
  label.charAt(0).toUpperCase() + label.slice(1);

function breaksSortUniq(values: number[]): number[] {
  values.sort((a, b) => a - b);
  return values.filter((value, i) => i === 0 || value !== values[i - 1]);
}

function isSectionHeadingBoundary(
  text: string,
  index: number,
  label: string,
): boolean {
  let prev = index - 1;
  while (prev >= 0 && text[prev] === ' ') prev--;
  const prevChar = prev < 0 ? '\n' : text[prev];
  const atStart = prev < 0;
  const gluedAfterPunctuation =
    prevChar === '.' || prevChar === '!' || prevChar === '?';
  const afterParagraphBreak = prevChar === '\n';

  let next = index + label.length;
  const hasColon = text[next] === ':';
  if (hasColon) next++;
  const nextChar = text[next] ?? '';
  const followedByBoundary =
    nextChar === '' || nextChar === ' ' || nextChar === '\n';

  if (!followedByBoundary) return false;
  if (atStart || gluedAfterPunctuation) return true;
  // Tras un salto de párrafo solo marcamos como título si usa ":" para evitar
  // marcar frases que simplemente comienzan con la misma palabra.
  return afterParagraphBreak && hasColon;
}

/**
 * La API de Laborum entrega el detalle como texto plano sin formato: los
 * saltos de línea originales quedan colapsados a 2+ espacios y los títulos
 * de sección ("Requisitos:", "Funciones:") quedan pegados al texto anterior.
 * Esta función reconstruye párrafos y destaca los títulos de sección como
 * HTML ligero que el frontend ya sabe renderizar de forma segura.
 */
export function formatLaborumDescription(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  let text = value
    .trim()
    .replace(/\s{2,}/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
  if (!text) return null;

  // Numeración de ítems ("3. Competencias:", "2) Experiencia") como
  // separadores cuando siguen a un punto o salto de párrafo.
  text = text.replace(
    /(?<=[.!?])\s+(?=\d{1,2}[.)]\s+[A-ZÁÉÍÓÚÑ0-9"'“(])/g,
    '\n',
  );
  text = text.replace(
    /(?<=[.!?])(\d{1,2}[.)])(?=\s+[A-ZÁÉÍÓÚÑ0-9"'“(])/gi,
    '\n$1',
  );

  const lowerText = text.toLowerCase();
  const breaks: number[] = [];
  for (const label of SECTION_HEADINGS) {
    let index = lowerText.indexOf(label);
    while (index !== -1) {
      if (isSectionHeadingBoundary(text, index, label)) breaks.push(index);
      index = lowerText.indexOf(label, index + label.length);
    }
  }
  breaksSortUniq(breaks);

  // Marca los encabezados detectados con un carácter centinela para poder
  // distinguir, al armar párrafos, los que nacen de un título real de los que
  // simplemente empiezan con la misma palabra tras un salto de línea.
  const HEADING_MARK = '\u0001';
  for (const boundary of [...breaks].reverse()) {
    const prefix = text[boundary - 1] === '\n' ? HEADING_MARK : `\n${HEADING_MARK}`;
    text = `${text.slice(0, boundary)}${prefix}${text.slice(boundary)}`;
  }

  const blocks: string[] = [];
  let firstParagraph = true;
  for (const raw of text.split('\n')) {
    let paragraph = raw;
    const fromHeadingMark = paragraph.startsWith(HEADING_MARK);
    if (fromHeadingMark) paragraph = paragraph.slice(1);
    paragraph = paragraph.trim();
    if (!paragraph) continue;

    const isFirst = firstParagraph;
    firstParagraph = false;

    const lower = paragraph.toLowerCase();
    const heading = SECTION_HEADINGS.find((label) =>
      lower.startsWith(label),
    );
    if (!heading) {
      blocks.push(`<p>${paragraph}</p>`);
      continue;
    }

    let after = heading.length;
    let hasColon = false;
    if (paragraph[after] === ':') {
      hasColon = true;
      after++;
    }
    if (paragraph[after] === ' ') after++;
    const rest = paragraph.slice(after).trim();

    // Solo destacamos como título si usa ":" o si nace de un encabezado
    // real (pegado tras un punto o al inicio de la descripción).
    if (!hasColon && !fromHeadingMark && !isFirst) {
      blocks.push(`<p>${paragraph}</p>`);
      continue;
    }

    const title = `<strong>${capitalizer(heading)}${hasColon ? ':' : '.'}</strong>`;
    blocks.push(rest ? `<p>${title} ${rest}</p>` : `<p>${title}</p>`);
  }

  return blocks.join('\n');
}

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
      description: formatLaborumDescription(aviso.detalle),
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