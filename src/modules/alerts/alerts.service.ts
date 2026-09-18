import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertsRepository } from './alerts.repository';
import { AlertMatchingService } from './alert-matching.service';

@Injectable()
export class AlertsService {
  constructor(
    private readonly alertsRepository: AlertsRepository,
    private readonly alertMatchingService: AlertMatchingService,
  ) {}

  async create(candidateId: number, dto: AlertCreateInput) {
    const alert = await this.alertsRepository.create(candidateId, dto);
    const matchCount = await this.alertMatchingService.matchAlert(alert);
    await this.alertsRepository.markNotifiedByAlert(alert.id);
    return { ...alert, matchCount };
  }

  async findAll(candidateId: number) {
    return this.alertsRepository.findByCandidate(candidateId);
  }

  async findOne(alertId: number, candidateId: number) {
    return this.alertsRepository.findForCandidate(alertId, candidateId);
  }

  async update(alertId: number, candidateId: number, dto: AlertUpdateInput) {
    const updated = await this.alertsRepository.update(alertId, candidateId, dto);
    if (updated.isActive) {
      await this.alertMatchingService.replaceAlertMatches(updated);
    }
    return this.alertsRepository.findForCandidate(alertId, candidateId);
  }

  async remove(alertId: number, candidateId: number) {
    const ok = await this.alertsRepository.delete(alertId, candidateId);
    if (!ok) {
      throw new NotFoundException('Alerta no encontrada');
    }
    return { message: 'Alerta eliminada con éxito' };
  }

  async findMatches(alertId: number, candidateId: number) {
    const matches = await this.alertsRepository.findMatches(alertId, candidateId);
    return matches.map((match) => {
      const job = match.job as unknown as
        | (Record<string, unknown> & {
            source?: {
              name?: string;
              slug?: string;
              logoUrl?: string | null;
            } | null;
          })
        | null
        | undefined;
      return {
        ...match,
        job: job
          ? {
              ...job,
              sourceName: job.source?.name ?? 'Desconocida',
              sourceSlug: job.source?.slug ?? 'desconocido',
              sourceLogoUrl: job.source?.logoUrl ?? null,
            }
          : null,
      };
    });
  }
}

export interface AlertCreateInput {
  name: string;
  keywords?: string[];
  regions?: string[];
  jobTypes?: string[];
  categories?: string[];
}

export interface AlertUpdateInput {
  name?: string;
  keywords?: string[];
  regions?: string[];
  jobTypes?: string[];
  categories?: string[];
  isActive?: boolean;
}