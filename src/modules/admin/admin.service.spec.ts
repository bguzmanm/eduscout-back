import { describe, expect, it } from 'bun:test';
import { AdminService } from './admin.service';
import type { AdminRepository, CandidateStatsRaw } from './admin.repository';

function makeRepository(
  overrides: Partial<CandidateStatsRaw> = {},
  listCandidates?: AdminRepository['listCandidates'],
  listAlertsByCandidate?: AdminRepository['listAlertsByCandidate'],
): AdminRepository {
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
      registrationsBySource: [
        { source: 'google', count: 10 },
        { source: 'sin dato', count: 6 },
      ],
      ...overrides,
    }),
    listCandidates,
    listAlertsByCandidate,
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
    expect(stats.registrationsBySource).toEqual([
      { source: 'google', count: 10 },
      { source: 'sin dato', count: 6 },
    ]);
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

  it('delega el listado de postulantes al repositorio con los filtros', async () => {
    const paged = {
      items: [
        {
          id: 1,
          name: 'María Fernanda Rojas',
          email: 'maria@mail.com',
          phone: null,
          cvFileName: 'cv.pdf',
          cvStatus: 'pending',
          cvUploadedAt: '2026-09-15T10:00:00.000Z',
          notifyByEmail: true,
          notifyByTelegram: true,
          telegramLinked: true,
          alertCount: 2,
          activeAlertCount: 1,
          matchCount: 5,
          createdAt: '2026-09-10T20:15:00.000Z',
          updatedAt: '2026-09-15T10:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    const repo = makeRepository(
      {},
      async (filters, page, limit) => {
        expect(filters).toEqual({
          q: 'maría',
          hasCv: true,
          alertState: 'active',
        });
        expect(page).toBe(2);
        expect(limit).toBe(10);
        return paged;
      },
    );
    const service = new AdminService(repo);

    const result = await service.listCandidates({
      q: 'maría',
      hasCv: true,
      alertState: 'active',
      page: 2,
      limit: 10,
    } as never);

    expect(result).toEqual(paged);
  });

  it('omite el filtro de estado cuando es "all"', async () => {
    const repo = makeRepository({}, async (filters) => {
      expect(filters.alertState).toBeUndefined();
      return {
        items: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    });
    const service = new AdminService(repo);

    await service.listCandidates({ alertState: 'all' } as never);
  });

  it('devuelve las alertas configuradas por un postulante', async () => {
    const alerts = [
      {
        id: 5,
        name: 'Docencia en la RM',
        keywords: ['profesor'],
        regions: ['Metropolitana'],
        jobTypes: [],
        categories: [],
        isActive: true,
        matchCount: 4,
        createdAt: '2026-09-10T20:15:00.000Z',
        updatedAt: '2026-09-12T09:00:00.000Z',
      },
    ];
    const repo = makeRepository({}, undefined, async (candidateId) => {
      expect(candidateId).toBe(7);
      return alerts;
    });
    const service = new AdminService(repo);

    const result = await service.listCandidateAlerts(7);

    expect(result).toEqual({ items: alerts });
  });
});