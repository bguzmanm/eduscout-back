import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  baseUrl: text('base_url').notNull(),
  scraperType: varchar('scraper_type', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }).notNull().default(''),
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

export const jobsRelations = relations(jobs, ({ one }) => ({
  source: one(sources, {
    fields: [jobs.sourceId],
    references: [sources.id],
  }),
}));
