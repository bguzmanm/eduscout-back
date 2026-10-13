import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SourcesModule } from '../sources/sources.module';
import { JobsModule } from '../jobs/jobs.module';
import { AuthModule } from '../auth/auth.module';
import { AlertsModule } from '../alerts/alerts.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { TelegramModule } from '../telegram/telegram.module';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { ScrapingScheduler } from './scraping.scheduler';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  imports: [
    DatabaseModule,
    SourcesModule,
    JobsModule,
    AuthModule,
    AlertsModule,
    CandidatesModule,
    TelegramModule,
  ],
  controllers: [ScrapingController],
  providers: [
    ScrapingService,
    ScrapingScheduler,
    TelegramBotService,
  ],
})
export class ScrapingModule {}