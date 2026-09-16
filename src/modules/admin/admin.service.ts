import { Injectable } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { CandidateStatsDto } from './dtos/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async getCandidateStats(): Promise<CandidateStatsDto> {
    const raw = await this.adminRepository.getCandidateStats();

    const candidatesWithAlerts = raw.alertsPerCandidate.length;
    const fewAlerts = raw.alertsPerCandidate.filter(
      (row) => row.alertCount >= 1 && row.alertCount <= 2,
    ).length;
    const manyAlerts = raw.alertsPerCandidate.filter(
      (row) => row.alertCount >= 3,
    ).length;

    const avgAlertsPerCandidate =
      candidatesWithAlerts > 0
        ? Math.round((raw.totalAlerts / candidatesWithAlerts) * 10) / 10
        : 0;

    return {
      totalCandidates: raw.totalCandidates,
      candidatesWithCv: raw.candidatesWithCv,
      candidatesWithPhone: raw.candidatesWithPhone,
      candidatesWithCvAndPhone: raw.candidatesWithCvAndPhone,
      candidatesWithAlerts,
      totalAlerts: raw.totalAlerts,
      activeAlerts: raw.activeAlerts,
      inactiveAlerts: raw.totalAlerts - raw.activeAlerts,
      totalAlertMatches: raw.totalAlertMatches,
      avgAlertsPerCandidate,
      registeredLast7d: raw.registeredLast7d,
      registeredLast30d: raw.registeredLast30d,
      alertsDistribution: {
        noAlerts: raw.totalCandidates - candidatesWithAlerts,
        fewAlerts,
        manyAlerts,
      },
    };
  }
}