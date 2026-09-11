import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_PROVIDER } from '../../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../../db/schema';
import { eq, count } from 'drizzle-orm';

@Injectable()
export class SourcesRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(source: typeof schema.sources.$inferInsert) {
    const [newSource] = await this.db
      .insert(schema.sources)
      .values(source)
      .returning();
    return newSource;
  }

  async findAll() {
    return this.db.query.sources.findMany();
  }

  async findAllWithCounts() {
    const all = await this.db.query.sources.findMany();
    const counts = await this.db
      .select({ sourceId: schema.jobs.sourceId, jobCount: count() })
      .from(schema.jobs)
      .where(eq(schema.jobs.isActive, true))
      .groupBy(schema.jobs.sourceId);

    const countBySource = new Map(
      counts.map((c) => [c.sourceId, Number(c.jobCount)]),
    );

    return all.map((source) => ({
      ...source,
      jobCount: countBySource.get(source.id) ?? 0,
    }));
  }

  async findById(id: number) {
    return this.db.query.sources.findFirst({
      where: eq(schema.sources.id, id),
    });
  }

  async findBySlug(slug: string) {
    return this.db.query.sources.findFirst({
      where: eq(schema.sources.slug, slug),
    });
  }

  async update(id: number, data: Partial<typeof schema.sources.$inferInsert>) {
    const [updated] = await this.db
      .update(schema.sources)
      .set(data)
      .where(eq(schema.sources.id, id))
      .returning();
    return updated;
  }

  async delete(id: number) {
    const [deleted] = await this.db
      .delete(schema.sources)
      .where(eq(schema.sources.id, id))
      .returning();
    return deleted;
  }
}
