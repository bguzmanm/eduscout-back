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
    return this.alertsRepository.findMatches(alertId, candidateId);
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