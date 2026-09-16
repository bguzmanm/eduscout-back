import { describe, expect, it } from 'bun:test';
import { AdminService } from './admin.service';
import type { AdminRepository, CandidateStatsRaw } from './admin.repository';

function makeRepository(overrides: Partial<CandidateStatsRaw> = {}): AdminRepository {
  return {
    getCandidateStats: async () => ({
      totalCandidates: 16,
      candidatesWithCv: 10,
      candidatesWithPhone: 8,
      candidatesWithCvAndPhone: 5,
      totalAlerts: 9,
      activeAlerts: 6,
      totalAlertMatches: 42,
      registeredLast7d: 3,
      registeredLast30d: 7,
      alertsPerCandidate: [
        { candidateId: 1, alertCount: 1 },
        { candidateId: 2, alertCount: 2 },
        { candidateId: 3, alertCount: 4 },
      ],
      ...overrides,
    }),
  } as AdminRepository;
}

describe('AdminService', () => {
  it('calcula los indicadores agregados de candidatos', async () => {
    const service = new AdminService(makeRepository());
    const stats = await service.getCandidateStats();

    expect(stats.totalCandidates).toBe(16);
    expect(stats.candidatesWithCv).toBe(10);
    expect(stats.candidatesWithPhone).toBe(8);
    expect(stats.candidatesWithCvAndPhone).toBe(5);
    expect(stats.candidatesWithAlerts).toBe(3);
    expect(stats.totalAlerts).toBe(9);
    expect(stats.activeAlerts).toBe(6);
    expect(stats.inactiveAlerts).toBe(3);
    expect(stats.totalAlertMatches).toBe(42);
    expect(stats.avgAlertsPerCandidate).toBe(3);
    expect(stats.registeredLast7d).toBe(3);
    expect(stats.registeredLast30d).toBe(7);
    expect(stats.alertsDistribution).toEqual({
      noAlerts: 13,
      fewAlerts: 2,
      manyAlerts: 1,
    });
  });

  it('responde correctamente cuando ningún candidato tiene alertas', async () => {
    const service = new AdminService(
      makeRepository({ totalAlerts: 0, activeAlerts: 0, alertsPerCandidate: [] }),
    );
    const stats = await service.getCandidateStats();

    expect(stats.candidatesWithAlerts).toBe(0);
    expect(stats.avgAlertsPerCandidate).toBe(0);
    expect(stats.alertsDistribution).toEqual({
      noAlerts: 16,
      fewAlerts: 0,
      manyAlerts: 0,
    });
  });

  it('redondea el promedio de alertas a un decimal', async () => {
    const service = new AdminService(
      makeRepository({
        totalAlerts: 5,
        alertsPerCandidate: [
          { candidateId: 1, alertCount: 2 },
          { candidateId: 2, alertCount: 3 },
        ],
      }),
    );
    const stats = await service.getCandidateStats();

    expect(stats.avgAlertsPerCandidate).toBe(2.5);
    expect(stats.candidatesWithAlerts).toBe(2);
  });
});