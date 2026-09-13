import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidatesRepository } from './candidates.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CandidatesController],
  providers: [CandidatesService, CandidatesRepository],
  exports: [CandidatesService, CandidatesRepository],
})
export class CandidatesModule {}