import { Injectable, NotFoundException } from '@nestjs/common';
import { SavedJobsRepository } from './saved-jobs.repository';
import type { SavedJobWithSource } from './saved-jobs.repository';

@Injectable()
export class SavedJobsService {
  constructor(private readonly savedJobsRepository: SavedJobsRepository) {}

  async save(candidateId: number, jobId: number) {
    if (!(await this.savedJobsRepository.jobExists(jobId))) {
      throw new NotFoundException('Oferta no encontrada');
    }
    const row = await this.savedJobsRepository.create(candidateId, jobId);
    return { jobId, saved: true, created: Boolean(row) };
  }

  async remove(candidateId: number, jobId: number) {
    await this.savedJobsRepository.delete(candidateId, jobId);
    return { message: 'Oferta eliminada de tus guardados' };
  }

  async findAll(candidateId: number) {
    const rows = await this.savedJobsRepository.findByCandidate(candidateId);
    return rows.map((row) => ({
      id: row.id,
      savedAt: row.createdAt.toISOString(),
      job: flattenJob(row),
    }));
  }

  async findJobIds(candidateId: number) {
    return { jobIds: await this.savedJobsRepository.findJobIds(candidateId) };
  }
}

function flattenJob(row: SavedJobWithSource): Record<string, unknown> | null {
  if (!row.job) return null;
  const { source, ...job } = row.job;
  return {
    ...job,
    sourceName: source?.name ?? 'Desconocida',
    sourceSlug: source?.slug ?? 'desconocido',
    sourceLogoUrl: source?.logoUrl ?? null,
  };
}
