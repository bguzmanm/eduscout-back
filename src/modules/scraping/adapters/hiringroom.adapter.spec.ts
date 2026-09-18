import { describe, expect, it } from 'bun:test';
import {
  extractDetailSection,
  mapRegion,
  parseRelativeDate,
  parseVacancyCards,
} from './hiringroom.adapter';

const cardHtml = `
<a href="/jobs/get_vacancy/69de99477da1a68b150fcdc9" class="text-decoration-none hrc-black">
    <div class="card p-3 mb-2 hoverable rounded border-0">
        <div class="card-vacancy align-items-center mb-1">
            <div class="card-body p-0 d-flex flex-column">
                <h4 class="font-black m-0 mb-2 fs-20 name__vacancy">
                    Académico/a Docente - Escuela de Negocios
                                            <i class="hr-Discapacity fs-14 hrc-black"></i>
                                    </h4>
                <p class="card-text text-truncate m-0 mb-1 fs-14 text-color">
                    <span class="font-weight-light">
                        <i class="hr-Location-pin hrc-black"></i>
                        Providencia, Metropolitana, Chile                    </span>
                </p>
                <p class="card-text text-truncate m-0 fs-14 text-color mb-2">
                    <span class="font-weight-light">
                        <i class="hr-Work-area hrc-black"></i>
                        Educación, Docencia e Investigación / Educación/Docencia                    </span>
                </p>
                <div class="vacancy-tags">
                    <p class="m-0 mr-2">
                        <span class="tag-vacancy">
                            <i class="hr-Clock mr-1 hrc-black"></i>
                            Full-time                    </span>
                    </p>
                    <p class="m-0 mr-2">
                        <span class="tag-vacancy">
                            <i class="hrc-black hr-Company mr-1"></i>
                            Presencial                    </span>
                    </p>
                </div>
                <p class="vacancy-time card-text">
                    Hace 5 meses                </p>
            </div>
        </div>
    </div>
</a>`;

const detailHtml = `
<div class="main__description bg-white p-4">
    <h6 class="commonstxt">
        <i class="commonstxt hr-File"></i>
        Descripción del puesto
    </h6>
    <div class="job-description-content"><p>En la Escuela de Negocios de UNIACC buscamos un(a) <strong>Académico(a) Docente</strong> jornada completa.</p></div>
</div>
<div>
    <h6 class="commonstxt">
        Requisitos
    </h6>
    <div class="hrc-fs-14 m-0 hrc-black job-description-content"><ul>
<li>Título profesional de Ingeniero (a) Comercial</li>
<li>Grado de Magíster (MBA)</li>
</ul></div>
</div>`;

describe('mapRegion', () => {
  it('mapea la segunda componente a una región chilena', () => {
    expect(mapRegion('Providencia, Metropolitana, Chile')).toBe('Metropolitana');
    expect(mapRegion('Concepción, Biobío, Chile')).toBe('Biobío');
    expect(mapRegion('Valparaíso, Valparaíso, Chile')).toBe('Valparaíso');
  });

  it('devuelve null si no reconoce la región', () => {
    expect(mapRegion('Santiago, Desconocida, Chile')).toBeNull();
    expect(mapRegion(null)).toBeNull();
  });
});

describe('parseRelativeDate', () => {
  const now = new Date('2026-09-18T00:00:00.000Z');

  it('parsea horas, días, meses y años relativos', () => {
    expect(parseRelativeDate('Hace 7 días', now)?.toISOString()).toBe(
      '2026-09-11T00:00:00.000Z',
    );
    expect(parseRelativeDate('Hace 5 meses', now)?.toISOString()).toBe(
      '2026-04-21T00:00:00.000Z',
    );
    expect(parseRelativeDate('Hace 2 horas', now)?.toISOString()).toBe(
      '2026-09-17T22:00:00.000Z',
    );
  });

  it('devuelve null para formatos no relativos', () => {
    expect(parseRelativeDate('')).toBeNull();
    expect(parseRelativeDate('12-03-2026')).toBeNull();
  });
});

describe('parseVacancyCards', () => {
  it('extrae id, cargo, ubicación, área, jornada y tiempo relativo', () => {
    const [card] = parseVacancyCards(cardHtml);

    expect(card).toEqual({
      id: '69de99477da1a68b150fcdc9',
      title: 'Académico/a Docente - Escuela de Negocios',
      location: 'Providencia, Metropolitana, Chile',
      area: 'Educación, Docencia e Investigación / Educación/Docencia',
      jobType: 'Full-time',
      modality: 'Presencial',
      relativeTime: 'Hace 5 meses',
    });
  });
});

describe('extractDetailSection', () => {
  it('extrae descripción y requisitos por título de sección', () => {
    expect(extractDetailSection(detailHtml, 'Descripción del puesto')).toBe(
      'En la Escuela de Negocios de UNIACC buscamos un(a) Académico(a) Docente jornada completa.',
    );
    expect(extractDetailSection(detailHtml, 'Requisitos')).toBe(
      'Título profesional de Ingeniero (a) Comercial\nGrado de Magíster (MBA)',
    );
  });

  it('devuelve null si la sección no existe', () => {
    expect(extractDetailSection(detailHtml, 'Beneficios')).toBeNull();
  });
});