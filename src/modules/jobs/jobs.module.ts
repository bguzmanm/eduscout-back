import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { JobsService } from './services/jobs.service';
import { JobsController } from './controllers/jobs.controller';
import { JobsRepository } from './repositories/jobs.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [JobsController],
  providers: [JobsService, JobsRepository],
  exports: [JobsService, JobsRepository],
})
export class JobsModule {}
