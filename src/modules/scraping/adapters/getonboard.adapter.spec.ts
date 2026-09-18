import { describe, expect, it } from 'bun:test';
import {
  cityNameFromId,
  extractSede,
  getOnBoardCompanyFilter,
  mapGobJobToRawJob,
  regionFromCityId,
  type GobJob,
} from './getonboard.adapter';

const duocFixture: GobJob = {
  id: 'docente-desarrollo-moviles-sede-puerto-montt-duoc-uc-puerto-montt-b3af',
  attributes: {
    title: 'Docente Desarrollo Móviles Sede Puerto Montt',
    description: '<p>Es <strong>requisito</strong> contar con:</p><ul><li>Ingeniería en Informática</li></ul>',
    functions: '<p>Duoc UC <strong>Sede Puerto Montt</strong>, Escuela de Informática.</p>',
    desirable: '<p>Se valora magíster.</p>',
    published_at: 1781283972,
    location_cities: { data: [{ id: 13 }] },
  },
  links: {
    public_url: 'https://www.getonbrd.com/jobs/docente-desarrollo-moviles-sede-puerto-montt-duoc-uc-puerto-montt-b3af',
  },
};

describe('getOnBoardCompanyFilter', () => {
  it('serializa el filtro de compañía como arreglo JSON', () => {
    expect(getOnBoardCompanyFilter('duoc-uc-cl')).toBe('["duoc-uc-cl"]');
  });
});

describe('extractSede', () => {
  it('extrae la sede del título cuando existe', () => {
    expect(
      extractSede('Docente Desarrollo Móviles Sede Puerto Montt'),
    ).toBe('Sede Puerto Montt');
    expect(
      extractSede('Docente Big Data e Inteligencia Campus Villarrica'),
    ).toBe('Campus Villarrica');
  });

  it('devuelve null si no hay sede ni campus', () => {
    expect(extractSede('Docente, Instalaciones y Soporte de Telecomunic. Maipú')).toBeNull();
  });
});

describe('regionFromCityId / cityNameFromId', () => {
  it('mapea ids de ciudad conocidos de Duoc UC', () => {
    expect(regionFromCityId(1)).toBe('Metropolitana de Santiago');
    expect(regionFromCityId(13)).toBe('Los Lagos');
    expect(regionFromCityId(4)).toBe('Valparaíso');
    expect(regionFromCityId(283)).toBe('La Araucanía');
    expect(cityNameFromId(1)).toBe('Santiago');
    expect(cityNameFromId(13)).toBe('Puerto Montt');
  });

  it('devuelve null para ids desconocidos', () => {
    expect(regionFromCityId(9999)).toBeNull();
    expect(cityNameFromId(9999)).toBeNull();
  });
});

describe('mapGobJobToRawJob', () => {
  it('mapea una oferta de Get On Board a RawJob', () => {
    const job = mapGobJobToRawJob(duocFixture, 'Duoc UC');

    expect(job).toMatchObject({
      externalId: duocFixture.id,
      title: 'Docente Desarrollo Móviles Sede Puerto Montt',
      company: 'Duoc UC',
      location: 'Sede Puerto Montt',
      region: 'Los Lagos',
      salaryRange: null,
    });
    expect(job.description).toBe(duocFixture.attributes.description);
    expect(job.requirements).toContain('Escuela de Informática');
    expect(job.requirements).toContain('magíster');
    expect(job.publishedAt?.toISOString()).toBe('2026-06-12T17:06:12.000Z');
    expect(job.applyUrl).toBe(duocFixture.links?.public_url ?? '');
  });

  it('combina funciones y deseable como requisitos separados', () => {
    const job = mapGobJobToRawJob(duocFixture, 'Duoc UC');
    expect(job.requirements?.split('\n\n').filter(Boolean)).toHaveLength(2);
  });

  it('usa la ciudad como location cuando no hay sede en el título', () => {
    const sinSede: GobJob = {
      id: 'docente-instalaciones-maipu-duoc-uc-santiago',
      attributes: {
        title: 'Docente, Instalaciones y Soporte de Telecomunic. Maipú',
        description: null,
        functions: null,
        desirable: null,
        location_cities: { data: [{ id: 1 }] },
      },
      links: { public_url: 'https://www.getonbrd.com/jobs/docente-instalaciones-maipu-duoc-uc-santiago' },
    };
    const job = mapGobJobToRawJob(sinSede, 'Duoc UC');
    expect(job.location).toBe('Santiago');
    expect(job.region).toBe('Metropolitana de Santiago');
  });

  it('descarta requisitos cuando no existen y usa el id como applyUrl de respaldo', () => {
    const minimal: GobJob = {
      id: 'docente-minimo-duoc-uc-santiago',
      attributes: {
        title: 'Docente Mínimo',
        description: null,
        functions: null,
        desirable: null,
      },
    };
    const job = mapGobJobToRawJob(minimal, 'Duoc UC');
    expect(job.requirements).toBeNull();
    expect(job.location).toBeNull();
    expect(job.publishedAt).toBeUndefined();
    expect(job.applyUrl).toBe('https://www.getonbrd.com/jobs/docente-minimo-duoc-uc-santiago');
  });
});