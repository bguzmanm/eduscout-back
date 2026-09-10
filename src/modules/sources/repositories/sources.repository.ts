import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_PROVIDER } from '../../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../../db/schema';
import { eq } from 'drizzle-orm';

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
