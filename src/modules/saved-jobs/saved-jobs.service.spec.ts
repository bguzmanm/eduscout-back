import { describe, expect, it } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import { SavedJobsService } from './saved-jobs.service';
import type { SavedJobsRepository } from './saved-jobs.repository';

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    sourceId: 1,
    externalId: 'ext-7',
    title: 'Profesor de Historia',
    company: null,
    department: null,
    location: 'Santiago',
    region: 'Metropolitana',
    jobType: 'Jornada completa',
    description: null,
    requirements: null,
    salaryRange: null,
    publishedAt: null,
    deadline: null,
    applyUrl: 'https://ejemplo.cl/postular',
    isActive: true,
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildService(repo: Record<string, unknown>) {
  return new SavedJobsService(repo as unknown as SavedJobsRepository);
}

describe('SavedJobsService', () => {
  it('guarda la oferta y reporta que fue creada', async () => {
    const calls: { candidateId: number; jobId: number }[] = [];
    const service = buildService({
      jobExists: async () => true,
      create: async (candidateId: number, jobId: number) => {
        calls.push({ candidateId, jobId });
        return { id: 1, candidateId, jobId, createdAt: new Date() };
      },
    });

    const result = await service.save(3, 7);

    expect(result).toEqual({ jobId: 7, saved: true, created: true });
    expect(calls).toEqual([{ candidateId: 3, jobId: 7 }]);
  });

  it('es idempotente: si ya estaba guardada no vuelve a insertar', async () => {
    let created = 0;
    const service = buildService({
      jobExists: async () => true,
      create: async () => {
        created += 1;
        return undefined;
      },
    });

    const result = await service.save(3, 7);

    expect(result).toEqual({ jobId: 7, saved: true, created: false });
    expect(created).toBe(1);
  });

  it('rechaza guardar una oferta inexistente', async () => {
    const service = buildService({
      jobExists: async () => false,
      create: async () => undefined,
    });

    expect(service.save(3, 999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aplana la fuente dentro de la oferta guardada', async () => {
    const service = buildService({
      findByCandidate: async () => [
        {
          id: 5,
          candidateId: 3,
          jobId: 7,
          createdAt: new Date('2026-01-02T03:04:05.000Z'),
          job: makeJob({
            source: { id: 1, name: 'Universidad de Chile', slug: 'uchile', logoUrl: null },
          }),
        },
      ],
    });

    const [saved] = await service.findAll(3);

    expect(saved.id).toBe(5);
    expect(saved.savedAt).toBe('2026-01-02T03:04:05.000Z');
    expect(saved.job).toMatchObject({
      id: 7,
      title: 'Profesor de Historia',
      sourceName: 'Universidad de Chile',
      sourceSlug: 'uchile',
      sourceLogoUrl: null,
    });
    expect(saved.job).not.toHaveProperty('source');
  });

  it('devuelve null cuando la oferta guardada ya no existe', async () => {
    const service = buildService({
      findByCandidate: async () => [
        { id: 5, candidateId: 3, jobId: 7, createdAt: new Date(), job: null },
      ],
    });

    const [saved] = await service.findAll(3);

    expect(saved.job).toBeNull();
  });

  it('quita la oferta de los guardados', async () => {
    const removed: { candidateId: number; jobId: number }[] = [];
    const service = buildService({
      delete: async (candidateId: number, jobId: number) => {
        removed.push({ candidateId, jobId });
      },
    });

    const result = await service.remove(3, 7);

    expect(removed).toEqual([{ candidateId: 3, jobId: 7 }]);
    expect(result.message).toBe('Oferta eliminada de tus guardados');
  });
});
