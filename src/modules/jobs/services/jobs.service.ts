import { Injectable, NotFoundException } from '@nestjs/common';
import { JobsRepository } from '../repositories/jobs.repository';
import { JobResponseDto, JobStatsResponseDto, SearchJobsDto } from '../dtos/job.dto';
import { PaginatedResult } from '../../../common/types';

@Injectable()
export class JobsService {
  constructor(private readonly jobsRepository: JobsRepository) {}

  private toDto(job: Record<string, unknown> & {
    source?: { name?: string; slug?: string; logoUrl?: string | null } | null;
  }): JobResponseDto {
    return this.toDtoWithExtras(job, job.source);
  }

  private toDtoWithExtras(
    job: Record<string, unknown> & {
      source?: { name?: string; slug?: string; logoUrl?: string | null } | null;
    },
  ): JobResponseDto {
    const base: JobResponseDto = {
      ...job,
      sourceName: job.source?.name ?? 'Desconocida',
      sourceSlug: job.source?.slug ?? 'desconocido',
      sourceLogoUrl: job.source?.logoUrl ?? null,
    };

    // Extract address information for JSON-LD
    const addressFields: JobResponseDto = {};

    // Extract salary information for JSON-LD
    const salaryFields: JobResponseDto = {};

    // Add ubicacion fields if available
    if (job.ubicacion) {
      addressFields.ubiDireccion = job.ubicacion.direccion || undefined;
      addressFields.ubiComuna = job.ubicacion.nombreComuna || undefined;
      addressFields.ubiCodigoPostal = job.ubicacion.codigoPostal || undefined;

      // Add expiration date if available
      if (job.ubicacion.fechaFin) {
        addressFields.ubiFechaFin = job.ubicacion.fechaFin as Date;
      }

      // Add addressLocation from subaddress if available
      if (job.addressLocation && typeof job.addressLocation === 'object') {
        const subAddress = job.addressLocation as
          | string
          | { city?: string; region?: string; streetAddress?: string; postalCode?: string };
        if (typeof subAddress === 'object' && subAddress) {
          addressFields.addressLocation = subAddress;
        }
      }
    }

    // Add sueldo fields if available
    if (job.sueldo) {
      salaryFields.sueldoBase = job.sueldo.base || undefined;

      // Also check for empresaMin field
      if (job.sueldo.empresa && job.sueldo.empresa[0]) {
        const min = Number(job.sueldo.empresa[0]);
        if (!isNaN(min)) {
          salaryFields.sueldoBase = min || undefined;
        }
      }

      // Fallback: try to parse salaryRange if sueldo is not available
      if (job.salaryRange) {
        const min = this.parseBaseSalary(job.salaryRange);
        if (min !== undefined) {
          salaryFields.sueldoBase = min;
        }
      }
    }

    // Alias for compatibility with existing code using jobType
    const typeFields: JobResponseDto = {};
    if (base.jobCategory) {
      typeFields.jobType = base.jobCategory;
    }

    return { ...base, ...addressFields, ...salaryFields, ...typeFields };
  }

  private parseBaseSalary(range: string): number | undefined {
    // Parse ranges like "30-50k" or "450.000 - 650.000 CLP"
    const matches = range.match(/\d{1,3}(?:,\d{0,2})?\s*(CLP|USD)?\b(?=.*-)/);
    if (!matches) return undefined;

    // Extract number before the range (e.g., "30" from "30-50k")
    const minMatch = range.match(/(\d{1,3}(?:,\d{0,2})?)\s*-.*$/);
    if (!minMatch) return undefined;

    const num = Number(minMatch[1].replace(',', '.'));
    if (isNaN(num)) return undefined;

    let base: number = num;

    // Convert USD to CLP if the range contains USD
    const hasUSD = /USD/i.test(range);
    if (hasUSD) {
      base = Math.round(base * 980);
    }

    return base.toLocaleString('es-CL', { minimumSignificantDigits: 2 });
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
        category: query.category,
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

    // Type assertion: findById already checked existence, so job is not null/undefined
    const jobRecord = (job!) as Record<string, unknown>;

    // Also check source exists and add it
    const source = jobRecord?.source || null;

    return this.toDtoWithExtras(jobRecord, source) as JobResponseDto;
  }

  async getStats(): Promise<JobStatsResponseDto> {
    return this.jobsRepository.getStats();
  }

  async getAddressLocation(id: number): Promise<JobResponseDto> {
    const job = await this.jobsRepository.findById(id);
    if (!job.addressLocation) {
      return job;
    }
    return this.toDto(job);
  }
}
