import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_PROVIDER } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import { and, count, eq, gte, isNotNull } from 'drizzle-orm';

export interface AlertsPerCandidate {
  candidateId: number;
  alertCount: number;
}

export interface CandidateStatsRaw {
  totalCandidates: number;
  candidatesWithCv: number;
  candidatesWithPhone: number;
  candidatesWithCvAndPhone: number;
  totalAlerts: number;
  activeAlerts: number;
  totalAlertMatches: number;
  registeredLast7d: number;
  registeredLast30d: number;
  alertsPerCandidate: AlertsPerCandidate[];
}

@Injectable()
export class AdminRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getCandidateStats(): Promise<CandidateStatsRaw> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalResult,
      cvResult,
      phoneResult,
      fullResult,
      alertsResult,
      activeAlertsResult,
      matchesResult,
      last7Result,
      last30Result,
      alertsByCandidate,
    ] = await Promise.all([
      this.db.select({ n: count() }).from(schema.candidates),
      this.db
        .select({ n: count() })
        .from(schema.candidates)
        .where(isNotNull(schema.candidates.cvData)),
      this.db
        .select({ n: count() })
        .from(schema.candidates)
        .where(isNotNull(schema.candidates.phone)),
      this.db
        .select({ n: count() })
        .from(schema.candidates)
        .where(
          and(
            isNotNull(schema.candidates.cvData),
            isNotNull(schema.candidates.phone),
          ),
        ),
      this.db.select({ n: count() }).from(schema.alerts),
      this.db
        .select({ n: count() })
        .from(schema.alerts)
        .where(eq(schema.alerts.isActive, true)),
      this.db.select({ n: count() }).from(schema.alertMatches),
      this.db
        .select({ n: count() })
        .from(schema.candidates)
        .where(gte(schema.candidates.createdAt, sevenDaysAgo)),
      this.db
        .select({ n: count() })
        .from(schema.candidates)
        .where(gte(schema.candidates.createdAt, thirtyDaysAgo)),
      this.db
        .select({
          candidateId: schema.alerts.candidateId,
          alertCount: count(),
        })
        .from(schema.alerts)
        .groupBy(schema.alerts.candidateId),
    ]);

    return {
      totalCandidates: Number(totalResult[0]?.n ?? 0),
      candidatesWithCv: Number(cvResult[0]?.n ?? 0),
      candidatesWithPhone: Number(phoneResult[0]?.n ?? 0),
      candidatesWithCvAndPhone: Number(fullResult[0]?.n ?? 0),
      totalAlerts: Number(alertsResult[0]?.n ?? 0),
      activeAlerts: Number(activeAlertsResult[0]?.n ?? 0),
      totalAlertMatches: Number(matchesResult[0]?.n ?? 0),
      registeredLast7d: Number(last7Result[0]?.n ?? 0),
      registeredLast30d: Number(last30Result[0]?.n ?? 0),
      alertsPerCandidate: alertsByCandidate.map((row) => ({
        candidateId: row.candidateId,
        alertCount: Number(row.alertCount),
      })),
    };
  }
}