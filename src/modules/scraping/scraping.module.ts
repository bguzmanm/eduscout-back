import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SourcesModule } from '../sources/sources.module';
import { JobsModule } from '../jobs/jobs.module';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { ScrapingScheduler } from './scraping.scheduler';

@Module({
  imports: [DatabaseModule, SourcesModule, JobsModule],
  controllers: [ScrapingController],
  providers: [ScrapingService, ScrapingScheduler],
})
export class ScrapingModule {}
