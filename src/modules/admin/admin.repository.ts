import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_PROVIDER } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

export interface AlertsPerCandidate {
  candidateId: number;
  alertCount: number;
}

export interface ListCandidatesFilters {
  q?: string;
  hasCv?: boolean;
}

export interface AdminCandidateRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  cvFileName: string | null;
  cvStatus: string;
  cvUploadedAt: string | null;
  alertCount: number;
  activeAlertCount: number;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PagedCandidates {
  items: AdminCandidateRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
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

  async listCandidates(
    filters: ListCandidatesFilters,
    page = 1,
    limit = 20,
  ): Promise<PagedCandidates> {
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];

    if (filters.q) {
      const q = `%${filters.q.trim()}%`;
      conditions.push(
        or(
          ilike(schema.candidates.name, q),
          ilike(schema.candidates.email, q),
        )!,
      );
    }
    if (filters.hasCv === true) {
      conditions.push(isNotNull(schema.candidates.cvData));
    }
    if (filters.hasCv === false) {
      conditions.push(isNull(schema.candidates.cvData));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        id: schema.candidates.id,
        name: schema.candidates.name,
        email: schema.candidates.email,
        phone: schema.candidates.phone,
        cvFileName: schema.candidates.cvFileName,
        cvStatus: schema.candidates.cvStatus,
        cvUploadedAt: schema.candidates.cvUploadedAt,
        createdAt: schema.candidates.createdAt,
        updatedAt: schema.candidates.updatedAt,
        alertCount: count(sql`distinct ${schema.alerts.id}`),
        activeAlertCount: count(
          sql`distinct case when ${schema.alerts.isActive} then ${schema.alerts.id} else null end`,
        ),
        matchCount: count(sql`distinct ${schema.alertMatches.id}`),
      })
      .from(schema.candidates)
      .leftJoin(
        schema.alerts,
        eq(schema.alerts.candidateId, schema.candidates.id),
      )
      .leftJoin(
        schema.alertMatches,
        eq(schema.alertMatches.alertId, schema.alerts.id),
      )
      .where(where)
      .groupBy(
        schema.candidates.id,
        schema.candidates.name,
        schema.candidates.email,
        schema.candidates.phone,
        schema.candidates.cvFileName,
        schema.candidates.cvStatus,
        schema.candidates.cvUploadedAt,
        schema.candidates.createdAt,
        schema.candidates.updatedAt,
      )
      .orderBy(desc(schema.candidates.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count: total }] = await this.db
      .select({ count: count() })
      .from(schema.candidates)
      .where(where);

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        cvFileName: row.cvFileName,
        cvStatus: row.cvStatus,
        cvUploadedAt: row.cvUploadedAt ? row.cvUploadedAt.toISOString() : null,
        alertCount: Number(row.alertCount),
        activeAlertCount: Number(row.activeAlertCount),
        matchCount: Number(row.matchCount),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }
}