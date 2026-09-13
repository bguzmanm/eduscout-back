import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SourcesModule } from '../sources/sources.module';
import { JobsModule } from '../jobs/jobs.module';
import { AuthModule } from '../auth/auth.module';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { ScrapingScheduler } from './scraping.scheduler';

@Module({
  imports: [DatabaseModule, SourcesModule, JobsModule, AuthModule],
  controllers: [ScrapingController],
  providers: [ScrapingService, ScrapingScheduler],
})
export class ScrapingModule {}
