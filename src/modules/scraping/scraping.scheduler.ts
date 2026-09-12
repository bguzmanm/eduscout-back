import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { ScrapingService } from './scraping.service';

@Injectable()
export class ScrapingScheduler {
  private readonly logger = new Logger('ScrapingScheduler');

  constructor(
    private readonly scrapingService: ScrapingService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 6 * * *')
  async handleCron() {
    if (
      this.configService.get<string>('SCRAPING_CRON_ENABLED', 'true') === 'false'
    ) {
      this.logger.log('Cron de scraping deshabilitado por configuración');
      return;
    }
    this.logger.log('Iniciando scraping programado (6:00 AM)...');
    try {
      const result = await this.scrapingService.runScraping();
      this.logger.log(
        `Scraping programado completado: ${result.totalScraped} ofertas`,
      );
    } catch (error) {
      this.logger.error(
        `Error en scraping programado: ${(error as Error).message}`,
      );
    }
  }
}
