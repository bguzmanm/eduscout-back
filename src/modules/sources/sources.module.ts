import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { SourcesService } from './services/sources.service';
import { SourcesController } from './controllers/sources.controller';
import { SourcesRepository } from './repositories/sources.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SourcesController],
  providers: [SourcesService, SourcesRepository],
  exports: [SourcesService, SourcesRepository],
})
export class SourcesModule {}
