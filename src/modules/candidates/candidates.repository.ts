import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE_PROVIDER } from '../database/database.module';
import * as schema from '../../db/schema';

type CandidateRow = typeof schema.candidates.$inferSelect;

export interface CvFile {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data: Buffer;
}

@Injectable()
export class CandidatesRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findByEmail(email: string): Promise<CandidateRow | undefined> {
    return this.db.query.candidates.findFirst({
      where: eq(schema.candidates.email, email),
    });
  }

  async findById(id: number): Promise<CandidateRow | undefined> {
    return this.db.query.candidates.findFirst({
      where: eq(schema.candidates.id, id),
    });
  }

  async findByResetTokenHash(
    resetTokenHash: string,
  ): Promise<CandidateRow | undefined> {
    return this.db.query.candidates.findFirst({
      where: eq(schema.candidates.resetTokenHash, resetTokenHash),
    });
  }

  async findByTelegramLinkToken(
    token: string,
  ): Promise<CandidateRow | undefined> {
    return this.db.query.candidates.findFirst({
      where: eq(schema.candidates.telegramLinkToken, token),
    });
  }

  async findByTelegramChatId(
    chatId: string,
  ): Promise<CandidateRow | undefined> {
    return this.db.query.candidates.findFirst({
      where: eq(schema.candidates.telegramChatId, chatId),
    });
  }

  async setTelegramLinkToken(
    id: number,
    token: string,
  ): Promise<CandidateRow> {
    return this.update(id, { telegramLinkToken: token });
  }

  async linkTelegram(id: number, chatId: string): Promise<CandidateRow> {
    return this.update(id, {
      telegramChatId: chatId,
      notifyByTelegram: true,
      telegramLinkToken: null,
    });
  }

  async unlinkTelegram(id: number): Promise<CandidateRow> {
    return this.update(id, {
      telegramChatId: null,
      notifyByTelegram: false,
    });
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<CandidateRow> {
    const [candidate] = await this.db
      .insert(schema.candidates)
      .values(data)
      .returning();
    return candidate;
  }

  async update(
    id: number,
    data: Partial<typeof schema.candidates.$inferInsert>,
  ): Promise<CandidateRow> {
    const [candidate] = await this.db
      .update(schema.candidates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.candidates.id, id))
      .returning();
    return candidate;
  }

  async saveCv(id: number, cv: CvFile): Promise<CandidateRow> {
    const [candidate] = await this.db
      .update(schema.candidates)
      .set({
        cvFileName: cv.fileName,
        cvMimeType: cv.mimeType,
        cvSizeBytes: cv.sizeBytes,
        cvData: cv.data,
        cvStatus: 'pending',
        cvUploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.candidates.id, id))
      .returning();
    return candidate;
  }
}