import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsRepository } from './alerts.repository';
import { AlertMatchingService } from './alert-matching.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsRepository, AlertMatchingService],
  exports: [AlertMatchingService],
})
export class AlertsModule {}