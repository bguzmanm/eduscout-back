import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsRepository } from './alerts.repository';
import { AlertMatchingService } from './alert-matching.service';
import { AlertNotifierService } from './alert-notifier.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    AlertsRepository,
    AlertMatchingService,
    AlertNotifierService,
  ],
  exports: [AlertMatchingService, AlertNotifierService],
})
export class AlertsModule {}