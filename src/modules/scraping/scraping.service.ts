import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE_PROVIDER } from '../database/database.module';
import { SourcesService } from '../sources/services/sources.service';
import { JobsRepository } from '../jobs/repositories/jobs.repository';
import type { ScraperAdapter } from './adapters/base.interface';
import { BROWSER_HEADERS } from './adapters/nuxt.parser';
import { UchileAdapter } from './adapters/uchile.adapter';
import { UcAdapter } from './adapters/uc.adapter';
import { TrabajandoClAdapter } from './adapters/trabajando-cl.adapter';
import { UaiAdapter } from './adapters/uai.adapter';
import { LaborumAdapter } from './adapters/laborum.adapter';
import { SantoTomasAdapter } from './adapters/santo-tomas.adapter';
import { IplacexAdapter } from './adapters/iplacex.adapter';
import { UsmVraAdapter } from './adapters/usm-vra.adapter';
import { UvCargosAdapter } from './adapters/uv-cargos.adapter';
import { sources, scrapingRuns, type ScrapingRunSource } from '../../db/schema';
import * as schema from '../../db/schema';
import { TelegramService, type ScrapingRunReport } from './telegram.service';
import { AlertMatchingService } from '../alerts/alert-matching.service';
import { AlertNotifierService } from '../alerts/alert-notifier.service';

export interface SourceScrapeResult {
  count: number;
  newCount: number;
  updatedCount: number;
  errorCount: number;
  durationMs: number;
  status: 'ok' | 'error';
  errors: string[];
}

export interface ScrapingResult {
  totalScraped: number;
  totalNew: number;
  totalUpdated: number;
  totalErrors: number;
  durationMs: number;
  status: 'completed' | 'failed';
  runId: number;
  perSource: Record<string, SourceScrapeResult>;
}

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger('ScrapingService');

  constructor(
    private readonly sourcesService: SourcesService,
    private readonly jobsRepository: JobsRepository,
    private readonly telegramService: TelegramService,
    private readonly alertMatchingService: AlertMatchingService,
    private readonly alertNotifierService: AlertNotifierService,
@Inject(DRIZZLE_PROVIDER)
  private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private getAdapter(
    scraperType: string,
    slug: string,
    name: string,
  ): ScraperAdapter | null {
    switch (scraperType) {
      case 'uchile_api':
        return new UchileAdapter();
      case 'wordpress':
        return new UcAdapter();
      case 'santo_tomas':
        return new SantoTomasAdapter();
      case 'iplacex_api':
        return new IplacexAdapter();
      case 'trabajando_cl':
        return new TrabajandoClAdapter(slug, name);
      case 'html':
        return new UaiAdapter();
      case 'laborum':
        return new LaborumAdapter();
      case 'usm_vra':
        return new UsmVraAdapter();
      case 'uv_cargos':
        return new UvCargosAdapter();
      default:
        this.logger.warn(`Tipo de scraper desconocido: ${scraperType}`);
        return null;
    }
  }

  async runScraping(sourceSlug?: string): Promise<ScrapingResult> {
    const startedAt = new Date();
    const [runRow] = await this.db
      .insert(scrapingRuns)
      .values({ startedAt, status: 'running' })
      .returning();
    const runId = runRow.id;

    const perSourceEntries: ScrapingRunSource[] = [];
    const perSource: Record<string, SourceScrapeResult> = {};
    let totalNew = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    this.logger.log(
      `Iniciando scraping${sourceSlug ? ` para ${sourceSlug}` : ' (todas las fuentes)'}`,
    );

    try {
      const activeSources = sourceSlug
        ? [await this.sourcesService.findBySlug(sourceSlug)]
        : await this.sourcesService.findActiveSources();

      for (const source of activeSources) {
        const entry = await this.scrapeSource(source);
        perSourceEntries.push(entry);
        perSource[source.slug] = {
          count: entry.newCount + entry.updatedCount,
          newCount: entry.newCount,
          updatedCount: entry.updatedCount,
          errorCount: entry.errorCount,
          durationMs: entry.durationMs,
          status: entry.status,
          errors: entry.errors,
        };
        totalNew += entry.newCount;
        totalUpdated += entry.updatedCount;
        totalErrors += entry.errorCount;
      }

      const durationMs = Date.now() - startedAt.getTime();
      const hasSources = activeSources.length > 0;
      const allFailed =
        hasSources &&
        perSourceEntries.every((s) => s.status === 'error');
      const status: 'completed' | 'failed' =
        !hasSources || allFailed ? 'failed' : 'completed';

      await this.db
        .update(scrapingRuns)
        .set({
          status,
          finishedAt: new Date(),
          totalNew,
          totalUpdated,
          totalErrors,
          durationMs,
          perSource: perSourceEntries,
        })
        .where(eq(scrapingRuns.id, runId));

      const report: ScrapingRunReport = {
        id: runId,
        status,
        startedAt: startedAt.toISOString(),
        durationMs,
        totalNew,
        totalUpdated,
        totalErrors,
        perSource: perSourceEntries,
      };
      await this.telegramService.sendReport(report);

      await this.matchAlertsForRun(startedAt);
      await this.notifyAlertsForRun();

      const totalScraped = totalNew + totalUpdated;
      this.logger.log(
        `Scraping completado: ${totalScraped} ofertas (${totalNew} nuevas, ${totalUpdated} actualizadas, ${totalErrors} errores)`,
      );

      return {
        totalScraped,
        totalNew,
        totalUpdated,
        totalErrors,
        durationMs,
        status,
        runId,
        perSource,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt.getTime();
      this.logger.error(
        `Error en scraping: ${(error as Error).message}`,
      );

      await this.db
        .update(scrapingRuns)
        .set({
          status: 'failed',
          finishedAt: new Date(),
          totalNew,
          totalUpdated,
          totalErrors,
          durationMs,
          perSource: perSourceEntries,
        })
        .where(eq(scrapingRuns.id, runId))
        .catch((saveError) => {
          this.logger.error(
            `No fue posible guardar el run ${runId}: ${(saveError as Error).message}`,
          );
        });

      const report: ScrapingRunReport = {
        id: runId,
        status: 'failed',
        startedAt: startedAt.toISOString(),
        durationMs,
        totalNew,
        totalUpdated,
        totalErrors,
        perSource: perSourceEntries,
      };
      await this.telegramService.sendReport(report);
      await this.matchAlertsForRun(startedAt);
      await this.notifyAlertsForRun();

      return {
        totalScraped: totalNew + totalUpdated,
        totalNew,
        totalUpdated,
        totalErrors,
        durationMs,
        status: 'failed',
        runId,
        perSource,
      };
    }
  }

  private async matchAlertsForRun(startedAt: Date): Promise<void> {
    try {
      const matched = await this.alertMatchingService.matchNewJobs(startedAt);
      if (matched > 0) {
        this.logger.log(`Alertas: ${matched} nuevos matches generados`);
      }
    } catch (error) {
      this.logger.error(
        `No se pudieron evaluar las alertas para este run: ${(error as Error).message}`,
      );
    }
  }

  private async notifyAlertsForRun(): Promise<void> {
    try {
      const sent = await this.alertNotifierService.notifyUnnotified();
      if (sent > 0) {
        this.logger.log(
          `Alertas: ${sent} notificaciones por correo enviadas`,
        );
      }
    } catch (error) {
      this.logger.error(
        `No se pudieron enviar las notificaciones de alertas: ${(error as Error).message}`,
      );
    }
  }

  private async scrapeSource(source: {
    id: number;
    slug: string;
    scraperType: string;
    name: string;
    logoUrl: string | null;
  }): Promise<ScrapingRunSource> {
    const startedAt = Date.now();
    const entry: ScrapingRunSource = {
      slug: source.slug,
      name: source.name,
      status: 'ok',
      newCount: 0,
      updatedCount: 0,
      errorCount: 0,
      errors: [],
      durationMs: 0,
    };

    const adapter = this.getAdapter(
      source.scraperType,
      source.slug,
      source.name,
    );
    if (!adapter) {
      entry.status = 'error';
      entry.errorCount = 1;
      entry.errors.push(
        `Tipo de scraper no soportado: ${source.scraperType}`,
      );
      entry.durationMs = Date.now() - startedAt;
      return entry;
    }

    try {
      this.logger.log(`Scraping ${source.name}...`);
      const rawJobs = await adapter.fetchListings();

      for (const rawJob of rawJobs) {
        try {
          const saved = await this.jobsRepository.upsert(
            source.id,
            rawJob.externalId,
            {
              title: rawJob.title,
              company: rawJob.company,
              department: rawJob.department,
              location: rawJob.location,
              region: rawJob.region,
              jobType: rawJob.jobType,
              description: rawJob.description,
              requirements: rawJob.requirements,
              salaryRange: rawJob.salaryRange,
              publishedAt: rawJob.publishedAt,
              deadline: rawJob.deadline,
              applyUrl: rawJob.applyUrl,
              isActive: true,
            },
          );
          if (saved.isNew) {
            entry.newCount++;
          } else {
            entry.updatedCount++;
          }
        } catch (error) {
          entry.errorCount++;
          entry.errors.push(
            `Error al guardar oferta ${rawJob.externalId}: ${(error as Error).message}`,
          );
        }
      }

      await this.db
        .update(sources)
        .set({ lastScraped: new Date() })
        .where(eq(sources.id, source.id));

      if (!source.logoUrl) {
        await this.backfillLogo(source);
      }

      this.logger.log(
        `${source.name}: ${entry.newCount} nuevas, ${entry.updatedCount} actualizadas, ${entry.errorCount} errores`,
      );
    } catch (error) {
      entry.status = 'error';
      entry.errorCount++;
      entry.errors.push(
        `Error general en scraping: ${(error as Error).message}`,
      );
      this.logger.error(
        `Error en ${source.name}: ${(error as Error).message}`,
      );
    }

    if (entry.errorCount > 0) {
      entry.status = 'error';
    }
    entry.durationMs = Date.now() - startedAt;
    return entry;
  }

  async getLatestReport() {
    return this.db.query.scrapingRuns.findFirst({
      orderBy: (runs, { desc }) => [desc(runs.id)],
    });
  }

  async getRecentReports(limit = 10) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    return this.db.query.scrapingRuns.findMany({
      orderBy: (runs, { desc }) => [desc(runs.id)],
      limit: safeLimit,
    });
  }

  private async backfillLogo(source: {
    id: number;
    slug: string;
    scraperType: string;
    name: string;
  }): Promise<void> {
    try {
      const logoUrl = await this.inferLogoUrl(source.scraperType, source.slug);
      if (!logoUrl) return;

      await this.db
        .update(sources)
        .set({ logoUrl })
        .where(eq(sources.id, source.id));
      this.logger.log(`Logo inferido para ${source.name}: ${logoUrl}`);
    } catch (error) {
      this.logger.warn(
        `No fue posible inferir logo para ${source.name}: ${(error as Error).message}`,
      );
    }
  }

  private async inferLogoUrl(
    scraperType: string,
    slug: string,
  ): Promise<string | null> {
    if (scraperType !== 'trabajando_cl' && scraperType !== 'santo_tomas') {
      return null;
    }

    const subdomain = slug.replace(/-/g, '');
    const { data } = await axios.get<{ urlLogo?: string }>(
      `https://${subdomain}.trabajando.cl/api/config/portal`,
      {
        params: { dominio: `${subdomain}.trabajando.cl` },
        timeout: 15000,
        headers: BROWSER_HEADERS,
      },
    );

    return data.urlLogo ?? null;
  }
}