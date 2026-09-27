import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE_PROVIDER } from '../database/database.module';
import * as schema from '../../db/schema';

export interface SavedJobWithSource {
  id: number;
  candidateId: number;
  jobId: number;
  createdAt: Date;
  job: (typeof schema.jobs.$inferSelect & {
    source: typeof schema.sources.$inferSelect | null;
  }) | null;
}

@Injectable()
export class SavedJobsRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async jobExists(jobId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.jobs.id })
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);
    return rows.length > 0;
  }

  async create(candidateId: number, jobId: number) {
    const [row] = await this.db
      .insert(schema.savedJobs)
      .values({ candidateId, jobId })
      .onConflictDoNothing()
      .returning();
    return row;
  }

  async findByCandidate(candidateId: number): Promise<SavedJobWithSource[]> {
    return this.db.query.savedJobs.findMany({
      where: eq(schema.savedJobs.candidateId, candidateId),
      with: { job: { with: { source: true } } },
      orderBy: (s, { desc }) => [desc(s.createdAt), desc(s.id)],
    }) as Promise<SavedJobWithSource[]>;
  }

  async findJobIds(candidateId: number): Promise<number[]> {
    const rows = await this.db
      .select({ jobId: schema.savedJobs.jobId })
      .from(schema.savedJobs)
      .where(eq(schema.savedJobs.candidateId, candidateId))
      .orderBy(asc(schema.savedJobs.createdAt));
    return rows.map((r) => r.jobId);
  }

  async delete(candidateId: number, jobId: number) {
    const deleted = await this.db
      .delete(schema.savedJobs)
      .where(
        and(
          eq(schema.savedJobs.candidateId, candidateId),
          eq(schema.savedJobs.jobId, jobId),
        ),
      )
      .returning();
    if (deleted.length === 0) {
      throw new NotFoundException('Oferta guardada no encontrada');
    }
  }
}
