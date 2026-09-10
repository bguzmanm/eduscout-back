import { Injectable, NotFoundException } from '@nestjs/common';
import { JobsRepository } from '../repositories/jobs.repository';
import { JobResponseDto, JobStatsResponseDto, SearchJobsDto } from '../dtos/job.dto';
import { PaginatedResult } from '../../../common/types';

@Injectable()
export class JobsService {
  constructor(private readonly jobsRepository: JobsRepository) {}

  private toDto(job: Record<string, unknown> & {
    source?: { name?: string; slug?: string } | null;
  }): JobResponseDto {
    return {
      ...job,
      sourceName: job.source?.name ?? 'Desconocida',
      sourceSlug: job.source?.slug ?? 'desconocido',
    } as unknown as JobResponseDto;
  }

  async findAll(
    query: SearchJobsDto,
  ): Promise<PaginatedResult<JobResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.jobsRepository.findAll(
      {
        q: query.q,
        sourceSlug: query.source,
        region: query.region,
        jobType: query.jobType,
        fromDate: query.fromDate,
      },
      page,
      limit,
    );
    return {
      ...result,
      items: result.items.map((item) => this.toDto(item)),
    };
  }

  async findOne(id: number): Promise<JobResponseDto> {
    const job = await this.jobsRepository.findById(id);
    if (!job) {
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);
    }
    return this.toDto(job);
  }

  async getStats(): Promise<JobStatsResponseDto> {
    return this.jobsRepository.getStats();
  }
}
