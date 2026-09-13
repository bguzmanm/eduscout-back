import { Injectable, Logger } from '@nestjs/common';
import { AlertsRepository } from './alerts.repository';

type JobForMatch = {
  id: number;
  title: string;
  company: string | null;
  department: string | null;
  description: string | null;
  requirements: string | null;
  region: string | null;
  jobType: string | null;
  source: { category: string } | null;
};

type AlertForMatch = {
  id: number;
  keywords: string[];
  regions: string[];
  jobTypes: string[];
  categories: string[];
};

export function normalizeMatchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

@Injectable()
export class AlertMatchingService {
  private readonly logger = new Logger('AlertMatchingService');

  constructor(private readonly alertsRepository: AlertsRepository) {}

  async matchNewJobs(since: Date): Promise<number> {
    const jobs = await this.alertsRepository.findNewJobs(since);
    if (jobs.length === 0) return 0;

    const alerts = await this.alertsRepository.findActiveAlerts();
    if (alerts.length === 0) return 0;

    let totalMatches = 0;

    for (const alert of alerts) {
      const jobIds = jobs
        .filter((job) => this.matches(alert, job))
        .map((job) => job.id);

      if (jobIds.length > 0) {
        const inserted = await this.alertsRepository.insertMatches(
          alert.id,
          jobIds,
        );
        totalMatches += inserted;
      }
    }

    this.logger.log(
      `${jobs.length} ofertas nuevas evaluadas, ${totalMatches} matches nuevos para ${alerts.length} alertas activas`,
    );
    return totalMatches;
  }

  private matches(alert: AlertForMatch, job: JobForMatch): boolean {
    if (alert.keywords.length > 0) {
      const haystack = normalizeMatchText(
        [
          job.title,
          job.company,
          job.department,
          job.description,
          job.requirements,
        ]
          .filter(Boolean)
          .join(' '),
      );
      const keywordFound = alert.keywords.some((keyword) =>
        haystack.includes(normalizeMatchText(keyword)),
      );
      if (!keywordFound) return false;
    }

    if (alert.regions.length > 0) {
      const region = normalizeMatchText(job.region ?? '');
      const regionFound = alert.regions.some((r) =>
        region.includes(normalizeMatchText(r)),
      );
      if (!regionFound) return false;
    }

    if (alert.jobTypes.length > 0) {
      const jobType = normalizeMatchText(job.jobType ?? '');
      const jobTypeFound = alert.jobTypes.some((t) =>
        jobType.includes(normalizeMatchText(t)),
      );
      if (!jobTypeFound) return false;
    }

    if (alert.categories.length > 0) {
      const category = job.source?.category ?? '';
      const categoryFound = alert.categories.includes(category);
      if (!categoryFound) return false;
    }

    return true;
  }
}