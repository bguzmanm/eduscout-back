import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
  jsonb,
  customType,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType() {
    return 'bytea';
  },
});

export interface ScrapingRunSource {
  slug: string;
  name: string;
  status: 'ok' | 'error';
  newCount: number;
  updatedCount: number;
  errorCount: number;
  errors: string[];
  durationMs: number;
}

export const scrapingRuns = pgTable('scraping_runs', {
  id: serial('id').primaryKey(),
  startedAt: timestamp('started_at').notNull(),
  finishedAt: timestamp('finished_at'),
  status: varchar('status', { length: 20 }).notNull().default('running'),
  totalNew: integer('total_new').default(0).notNull(),
  totalUpdated: integer('total_updated').default(0).notNull(),
  totalErrors: integer('total_errors').default(0).notNull(),
  durationMs: integer('duration_ms'),
  perSource: jsonb('per_source').$type<ScrapingRunSource[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  baseUrl: text('base_url').notNull(),
  scraperType: varchar('scraper_type', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }).notNull().default(''),
  logoUrl: varchar('logo_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  lastScraped: timestamp('last_scraped'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sourcesRelations = relations(sources, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobs = pgTable(
  'jobs',
  {
    id: serial('id').primaryKey(),
    sourceId: integer('source_id')
      .references(() => sources.id)
      .notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    title: text('title').notNull(),
    company: varchar('company', { length: 255 }),
    department: varchar('department', { length: 255 }),
    location: text('location'),
    region: varchar('region', { length: 100 }),
    jobType: varchar('job_type', { length: 100 }),
    description: text('description'),
    requirements: text('requirements'),
    salaryRange: varchar('salary_range', { length: 100 }),
    publishedAt: timestamp('published_at'),
    deadline: timestamp('deadline'),
    applyUrl: text('apply_url').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    scrapedAt: timestamp('scraped_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [unique('jobs_source_external_id_unique').on(t.sourceId, t.externalId)],
);

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  source: one(sources, {
    fields: [jobs.sourceId],
    references: [sources.id],
  }),
  alertMatches: many(alertMatches),
}));

export const candidates = pgTable('candidates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  cvFileName: varchar('cv_file_name', { length: 255 }),
  cvMimeType: varchar('cv_mime_type', { length: 100 }),
  cvSizeBytes: integer('cv_size_bytes'),
  cvData: bytea('cv_data'),
  cvStatus: varchar('cv_status', { length: 20 }).notNull().default('pending'),
  cvUploadedAt: timestamp('cv_uploaded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const candidatesRelations = relations(candidates, ({ many }) => ({
  alerts: many(alerts),
}));

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id')
    .references(() => candidates.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  keywords: jsonb('keywords').$type<string[]>().notNull().default([]),
  regions: jsonb('regions').$type<string[]>().notNull().default([]),
  jobTypes: jsonb('job_types').$type<string[]>().notNull().default([]),
  categories: jsonb('categories').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  candidate: one(candidates, {
    fields: [alerts.candidateId],
    references: [candidates.id],
  }),
  matches: many(alertMatches),
}));

export const alertMatches = pgTable(
  'alert_matches',
  {
    id: serial('id').primaryKey(),
    alertId: integer('alert_id')
      .references(() => alerts.id, { onDelete: 'cascade' })
      .notNull(),
    jobId: integer('job_id')
      .references(() => jobs.id, { onDelete: 'cascade' })
      .notNull(),
    matchedAt: timestamp('matched_at').defaultNow().notNull(),
  },
  (t) => [unique('alert_matches_alert_job_unique').on(t.alertId, t.jobId)],
);

export const alertMatchesRelations = relations(alertMatches, ({ one }) => ({
  alert: one(alerts, {
    fields: [alertMatches.alertId],
    references: [alerts.id],
  }),
  job: one(jobs, {
    fields: [alertMatches.jobId],
    references: [jobs.id],
  }),
}));
