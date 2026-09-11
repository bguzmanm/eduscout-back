import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import axios from 'axios';
import { DRIZZLE_PROVIDER, type DrizzleConnection } from '../database/database.module';
import { SourcesService } from '../sources/services/sources.service';
import { JobsRepository } from '../jobs/repositories/jobs.repository';
import type { ScraperAdapter, RawJob } from './adapters/base.interface';
import { BROWSER_HEADERS } from './adapters/nuxt.parser';
import { UchileAdapter } from './adapters/uchile.adapter';
import { UcAdapter } from './adapters/uc.adapter';
import { TrabajandoClAdapter } from './adapters/trabajando-cl.adapter';
import { UaiAdapter } from './adapters/uai.adapter';
import { LaborumAdapter } from './adapters/laborum.adapter';
import { SantoTomasAdapter } from './adapters/santo-tomas.adapter';
import { UsmVraAdapter } from './adapters/usm-vra.adapter';
import { UvCargosAdapter } from './adapters/uv-cargos.adapter';
import { sources } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface ScrapingResult {
  totalScraped: number;
  perSource: Record<string, { count: number; errors: string[] }>;
}

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger('ScrapingService');

  constructor(
    private readonly sourcesService: SourcesService,
    private readonly jobsRepository: JobsRepository,
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: DrizzleConnection,
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
    this.logger.log(
      `Iniciando scraping${sourceSlug ? ` para ${sourceSlug}` : ' (todas las fuentes)'}`,
    );

    const activeSources = sourceSlug
      ? [await this.sourcesService.findBySlug(sourceSlug)]
      : await this.sourcesService.findActiveSources();

    const result: ScrapingResult = {
      totalScraped: 0,
      perSource: {},
    };

    for (const source of activeSources) {
      const sourceResult = { count: 0, errors: [] as string[] };
      result.perSource[source.slug] = sourceResult;

      const adapter = this.getAdapter(
        source.scraperType,
        source.slug,
        source.name,
      );
      if (!adapter) {
        sourceResult.errors.push(
          `Tipo de scraper no soportado: ${source.scraperType}`,
        );
        continue;
      }

      try {
        this.logger.log(`Scraping ${source.name}...`);
        const rawJobs = await adapter.fetchListings();

        for (const rawJob of rawJobs) {
          try {
            await this.jobsRepository.upsert(source.id, rawJob.externalId, {
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
            });
            sourceResult.count++;
          } catch (error) {
            sourceResult.errors.push(
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
          `${source.name}: ${sourceResult.count} ofertas procesadas`,
        );
      } catch (error) {
        sourceResult.errors.push(
          `Error general en scraping: ${(error as Error).message}`,
        );
        this.logger.error(
          `Error en ${source.name}: ${(error as Error).message}`,
        );
      }

      result.totalScraped += sourceResult.count;
    }

    this.logger.log(
      `Scraping completado: ${result.totalScraped} ofertas totales`,
    );
    return result;
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
