import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_PROVIDER } from '../../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../../db/schema';
import { and, eq, ilike, gte, count, isNotNull, SQL } from 'drizzle-orm';

type JobWithSource = typeof schema.jobs.$inferSelect & {
  source: typeof schema.sources.$inferSelect | null;
};

export interface JobsFilters {
  q?: string;
  sourceSlug?: string;
  region?: string;
  jobType?: string;
  fromDate?: string;
  category?: string;
}

@Injectable()
export class JobsRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(
    filters: JobsFilters,
    page = 1,
    limit = 20,
  ): Promise<{ items: JobWithSource[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const offset = (page - 1) * limit;
    const conditions = this.buildFilterConditions(filters);

    if (conditions.length === 0) {
      const items = await this.db.query.jobs.findMany({
        limit,
        offset,
        orderBy: (j, { desc }) => [desc(j.publishedAt)],
        with: { source: true },
      });
      const [{ count: total }] = await this.db
        .select({ count: count() })
        .from(schema.jobs)
        .where(eq(schema.jobs.isActive, true));
      return {
        items,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    }

    const where = and(eq(schema.jobs.isActive, true), ...conditions);
    const [results, [{ count: total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.jobs)
        .leftJoin(
          schema.sources,
          eq(schema.jobs.sourceId, schema.sources.id),
        )
        .where(where)
        .orderBy(schema.jobs.publishedAt)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(schema.jobs)
        .leftJoin(
          schema.sources,
          eq(schema.jobs.sourceId, schema.sources.id),
        )
        .where(where),
    ]);

    return {
      items: results.map((r) => ({ ...r.jobs, source: (r as any).sources })),
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  async findById(id: number) {
    return this.db.query.jobs.findFirst({
      where: eq(schema.jobs.id, id),
      with: { source: true },
    });
  }

  async upsert(sourceId: number, externalId: string, data: Partial<typeof schema.jobs.$inferInsert>) {
    const existing = await this.db.query.jobs.findFirst({
      where: and(
        eq(schema.jobs.sourceId, sourceId),
        eq(schema.jobs.externalId, externalId),
      ),
    });

    if (existing) {
      const [updated] = await this.db
        .update(schema.jobs)
        .set({ ...data, scrapedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.jobs.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(schema.jobs)
      .values({ sourceId, externalId, ...data } as typeof schema.jobs.$inferInsert)
      .returning();
    return created;
  }

  async getStats() {
    const totalResult = await this.db
      .select({ count: count() })
      .from(schema.jobs)
      .where(eq(schema.jobs.isActive, true));

    const bySource = await this.db
      .select({
        source: schema.sources.slug,
        count: count(),
      })
      .from(schema.jobs)
      .leftJoin(schema.sources, eq(schema.jobs.sourceId, schema.sources.id))
      .where(eq(schema.jobs.isActive, true))
      .groupBy(schema.sources.slug);

    const byRegion = await this.db
      .select({
        region: schema.jobs.region,
        count: count(),
      })
      .from(schema.jobs)
      .where(
        and(eq(schema.jobs.isActive, true), isNotNull(schema.jobs.region)),
      )
      .groupBy(schema.jobs.region);

    return {
      totalActive: Number(totalResult[0]?.count ?? 0),
      bySource: bySource.map((r) => ({
        source: r.source ?? 'desconocido',
        count: Number(r.count),
      })),
      byRegion: byRegion.map((r) => ({
        region: r.region ?? 'desconocido',
        count: Number(r.count),
      })),
    };
  }

  private buildFilterConditions(filters: JobsFilters): SQL[] {
    const conditions: SQL[] = [];

    if (filters.q) {
      const pattern = `%${filters.q}%`;
      conditions.push(
        ilike(schema.jobs.title, pattern),
      );
    }

    if (filters.sourceSlug) {
      conditions.push(eq(schema.sources.slug, filters.sourceSlug));
    }

    if (filters.category) {
      conditions.push(eq(schema.sources.category, filters.category));
    }

    if (filters.region) {
      conditions.push(ilike(schema.jobs.region!, `%${filters.region}%`));
    }

    if (filters.jobType) {
      conditions.push(ilike(schema.jobs.jobType, `%${filters.jobType}%`));
    }

    if (filters.fromDate) {
      conditions.push(gte(schema.jobs.publishedAt, new Date(filters.fromDate)));
    }

    return conditions;
  }
}
