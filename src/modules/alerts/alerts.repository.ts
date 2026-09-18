import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, gte, inArray, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE_PROVIDER } from '../database/database.module';
import * as schema from '../../db/schema';

export interface AlertCriteria {
  name?: string;
  keywords?: string[];
  regions?: string[];
  jobTypes?: string[];
  categories?: string[];
  isActive?: boolean;
}

@Injectable()
export class AlertsRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(
    candidateId: number,
    data: Omit<AlertCriteria, 'isActive'>,
  ) {
    const [alert] = await this.db
      .insert(schema.alerts)
      .values({
        candidateId,
        name: data.name!,
        keywords: data.keywords ?? [],
        regions: data.regions ?? [],
        jobTypes: data.jobTypes ?? [],
        categories: data.categories ?? [],
      })
      .returning();
    return alert;
  }

  async findByCandidate(candidateId: number) {
    const alerts = await this.db.query.alerts.findMany({
      where: eq(schema.alerts.candidateId, candidateId),
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    if (alerts.length === 0) return [];

    const counts = await this.db
      .select({
        alertId: schema.alertMatches.alertId,
        matchCount: count(),
      })
      .from(schema.alertMatches)
      .where(inArray(schema.alertMatches.alertId, alerts.map((a) => a.id)))
      .groupBy(schema.alertMatches.alertId);

    const countByAlert = new Map(
      counts.map((c) => [c.alertId, Number(c.matchCount)]),
    );

    return alerts.map((alert) => ({
      ...alert,
      matchCount: countByAlert.get(alert.id) ?? 0,
    }));
  }

  async findForCandidate(alertId: number, candidateId: number) {
    const alert = await this.db.query.alerts.findFirst({
      where: and(
        eq(schema.alerts.id, alertId),
        eq(schema.alerts.candidateId, candidateId),
      ),
    });
    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }

    const [countRow] = await this.db
      .select({ matchCount: count() })
      .from(schema.alertMatches)
      .where(eq(schema.alertMatches.alertId, alertId));

    return {
      ...alert,
      matchCount: Number(countRow?.matchCount ?? 0),
    };
  }

  async update(
    alertId: number,
    candidateId: number,
    data: AlertCriteria,
  ) {
    const [updated] = await this.db
      .update(schema.alerts)
      .set({
        name: data.name,
        keywords: data.keywords,
        regions: data.regions,
        jobTypes: data.jobTypes,
        categories: data.categories,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.alerts.id, alertId),
          eq(schema.alerts.candidateId, candidateId),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundException('Alerta no encontrada');
    }
    return updated;
  }

  async delete(alertId: number, candidateId: number): Promise<boolean> {
    const [deleted] = await this.db
      .delete(schema.alerts)
      .where(
        and(
          eq(schema.alerts.id, alertId),
          eq(schema.alerts.candidateId, candidateId),
        ),
      )
      .returning();
    return Boolean(deleted);
  }

  async findMatches(alertId: number, candidateId: number) {
    await this.findForCandidate(alertId, candidateId);

    return this.db.query.alertMatches.findMany({
      where: eq(schema.alertMatches.alertId, alertId),
      orderBy: (m, { desc }) => [desc(m.matchedAt)],
      with: { job: { with: { source: true } } },
    });
  }

  async findActiveAlerts() {
    return this.db.query.alerts.findMany({
      where: eq(schema.alerts.isActive, true),
    });
  }

  async findNewJobs(since: Date) {
    return this.db.query.jobs.findMany({
      where: and(
        eq(schema.jobs.isActive, true),
        gte(schema.jobs.createdAt, since),
      ),
      with: { source: true },
      orderBy: (j, { asc }) => [asc(j.id)],
    });
  }

  async findAllActiveJobs() {
    return this.db.query.jobs.findMany({
      where: eq(schema.jobs.isActive, true),
      with: { source: true },
      orderBy: (j, { asc }) => [asc(j.id)],
    });
  }

  async replaceMatches(
    alertId: number,
    jobIds: number[],
  ): Promise<number> {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(schema.alertMatches)
        .where(eq(schema.alertMatches.alertId, alertId));

      if (jobIds.length === 0) return 0;

      const inserted = await tx
        .insert(schema.alertMatches)
        .values(jobIds.map((jobId) => ({ alertId, jobId, notifiedAt: new Date() })))
        .onConflictDoNothing()
        .returning();

      return inserted.length;
    });
  }

  async insertMatches(
    alertId: number,
    jobIds: number[],
  ): Promise<number> {
    if (jobIds.length === 0) return 0;

    const inserted = await this.db
      .insert(schema.alertMatches)
      .values(jobIds.map((jobId) => ({ alertId, jobId })))
      .onConflictDoNothing()
      .returning();

    return inserted.length;
  }

  async markNotifiedByAlert(alertId: number): Promise<void> {
    await this.db
      .update(schema.alertMatches)
      .set({ notifiedAt: new Date() })
      .where(eq(schema.alertMatches.alertId, alertId));
  }

  async findUnnotifiedMatches() {
    const matches = await this.db.query.alertMatches.findMany({
      where: isNull(schema.alertMatches.notifiedAt),
      with: {
        alert: { with: { candidate: true } },
        job: { with: { source: true } },
      },
      orderBy: (m, { asc }) => [asc(m.matchedAt)],
    });

    return matches.filter((m) => m.alert.isActive);
  }

  async markNotified(matchIds: number[]): Promise<void> {
    if (matchIds.length === 0) return;
    await this.db
      .update(schema.alertMatches)
      .set({ notifiedAt: new Date() })
      .where(inArray(schema.alertMatches.id, matchIds));
  }
}