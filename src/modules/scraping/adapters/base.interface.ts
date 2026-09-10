export interface RawJob {
  externalId: string;
  title: string;
  company?: string | null;
  department?: string | null;
  location?: string | null;
  region?: string | null;
  jobType?: string | null;
  description?: string | null;
  requirements?: string | null;
  salaryRange?: string | null;
  publishedAt?: Date | null;
  deadline?: Date | null;
  applyUrl: string;
}

export interface ScraperAdapter {
  sourceSlug: string;
  sourceName: string;
  fetchListings(): Promise<RawJob[]>;
}
