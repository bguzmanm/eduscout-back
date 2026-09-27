import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { SavedJobsController } from './saved-jobs.controller';
import { SavedJobsService } from './saved-jobs.service';
import { SavedJobsRepository } from './saved-jobs.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SavedJobsController],
  providers: [SavedJobsService, SavedJobsRepository],
  exports: [SavedJobsService],
})
export class SavedJobsModule {}
