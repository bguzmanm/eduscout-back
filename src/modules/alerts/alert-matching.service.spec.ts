import { describe, expect, it } from 'bun:test';
import {
  AlertMatchingService,
  normalizeMatchText,
} from './alert-matching.service';
import type { AlertsRepository } from './alerts.repository';

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: 'Docente de Matemáticas',
    company: 'Universidad X',
    department: 'Facultad de Ciencias',
    description: 'Docencia en pregrado',
    requirements: 'Magíster',
    region: 'Región Metropolitana',
    jobType: 'Jornada Completa',
    source: { category: 'universidad_publica' },
    ...overrides,
  };
}

function makeAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    keywords: ['matemáticas'],
    regions: [],
    jobTypes: [],
    categories: [],
    ...overrides,
  };
}

function makeService(repository: unknown) {
  return new AlertMatchingService(
    repository as unknown as AlertsRepository,
  );
}

describe('normalizeMatchText', () => {
  it('elimina acentos y normaliza a minúsculas', () => {
    expect(normalizeMatchText('Informática Matemáticas Áéíóú')).toBe(
      'informatica matematicas aeiou',
    );
  });
});

describe('AlertMatchingService.matchAlert', () => {
  it('matchea ofertas existentes por keyword al crear la alerta', async () => {
    const job = makeJob({ id: 5, title: 'Profesor de Informática' });
    const repo = {
      findAllActiveJobs: async () => [job],
      insertMatches: async (_alertId: number, ids: number[]) => ids.length,
    };

    const service = makeService(repo);
    const count = await service.matchAlert(
      makeAlert({ keywords: ['informática'] }),
    );

    expect(count).toBe(1);
  });

  it('matchea keywords que aparecen en la descripción', async () => {
    const job = makeJob({
      title: 'Docente de Programación',
      description: 'Se requiere manejo de informática educativa',
    });
    const repo = {
      findAllActiveJobs: async () => [job],
      insertMatches: async (_alertId: number, ids: number[]) => ids.length,
    };

    const service = makeService(repo);
    const count = await service.matchAlert(
      makeAlert({ keywords: ['informática'] }),
    );

    expect(count).toBe(1);
  });

  it('ignora mayúsculas y acentos en la keyword', async () => {
    const job = makeJob({ title: 'Profesor de Informática' });
    const repo = {
      findAllActiveJobs: async () => [job],
      insertMatches: async (_alertId: number, ids: number[]) => ids.length,
    };

    const service = makeService(repo);
    const count = await service.matchAlert(
      makeAlert({ keywords: ['INFORMATICA'] }),
    );

    expect(count).toBe(1);
  });

  it('no matchea si la keyword no aparece en la oferta', async () => {
    const repo = {
      findAllActiveJobs: async () => [makeJob()],
      insertMatches: async (_alertId: number, ids: number[]) => ids.length,
    };

    const service = makeService(repo);
    const count = await service.matchAlert(
      makeAlert({ keywords: ['informática'] }),
    );

    expect(count).toBe(0);
  });

  it('no inserta nada cuando no hay coincidencias', async () => {
    let insertCalls = 0;
    const repo = {
      findAllActiveJobs: async () => [makeJob()],
      insertMatches: async (_alertId: number, ids: number[]) => {
        insertCalls++;
        return ids.length;
      },
    };

    const service = makeService(repo);
    await service.matchAlert(makeAlert({ keywords: ['informática'] }));

    expect(insertCalls).toBe(0);
  });

  it('filtra por región', async () => {
    const repo = {
      findAllActiveJobs: async () => [makeJob()],
      insertMatches: async (_alertId: number, ids: number[]) => ids.length,
    };

    const service = makeService(repo);
    const count = await service.matchAlert(
      makeAlert({ regions: ['Biobío'] }),
    );

    expect(count).toBe(0);
  });

  it('filtra por jornada sin diferenciar acentos', async () => {
    const job = makeJob({ jobType: 'Jornada Completa' });
    const repo = {
      findAllActiveJobs: async () => [job],
      insertMatches: async (_alertId: number, ids: number[]) => ids.length,
    };

    const service = makeService(repo);
    const count = await service.matchAlert(
      makeAlert({ jobTypes: ['Jornada completa'] }),
    );

    expect(count).toBe(1);
  });

  it('filtra por categoría de fuente', async () => {
    const repo = {
      findAllActiveJobs: async () => [makeJob()],
      insertMatches: async (_alertId: number, ids: number[]) => ids.length,
    };

    const service = makeService(repo);
    const count = await service.matchAlert(
      makeAlert({ categories: ['ip_chile'] }),
    );

    expect(count).toBe(0);
  });
});

describe('AlertMatchingService.replaceAlertMatches', () => {
  it('borra los matches previos y reinserta los vigentes', async () => {
    let replacedAlertId: number | undefined;
    let replacedJobIds: number[] | undefined;

    const repo = {
      findAllActiveJobs: async () => [
        makeJob({ id: 5, title: 'Profesor de Informática' }),
        makeJob({ id: 6, title: 'Docente de Física' }),
      ],
      replaceMatches: async (alertId: number, jobIds: number[]) => {
        replacedAlertId = alertId;
        replacedJobIds = jobIds;
        return jobIds.length;
      },
    };

    const service = makeService(repo);
    const count = await service.replaceAlertMatches(
      makeAlert({ keywords: ['informática'] }),
    );

    expect(replacedAlertId).toBe(10);
    expect(replacedJobIds).toEqual([5]);
    expect(count).toBe(1);
  });
});