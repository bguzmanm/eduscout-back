import type { ScraperAdapter, RawJob } from './base.interface';

export class LaborumAdapter implements ScraperAdapter {
  sourceSlug = 'ip-chile';
  sourceName = 'IP Chile';

  async fetchListings(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(
        'https://www.laborum.cl/perfiles/empresa_instituto-profesional-de-chile_12054583.html',
        { waitUntil: 'networkidle', timeout: 30000 },
      );

      await page.waitForSelector('.job-card, .offer-card, [class*="job"]', {
        timeout: 10000,
      }).catch(() => {
        // Selector not found, try alternative
      });

      const jobCards = await page.$$(
        '.job-card, .offer-card, [class*="job-item"], [class*="oferta"]',
      );

      for (const card of jobCards) {
        const title = await card
          .textContent()
          .then((t) => t?.trim().split('\n')[0]);

        if (!title) continue;

        const link = await card.$('a');
        const href = link ? await link.getAttribute('href') : null;

        const externalId = href?.match(/(\d+)\.html/)?.[1] ?? this.slugify(title);

        jobs.push({
          externalId,
          title: title.slice(0, 255),
          company: this.sourceName,
          department: null,
          location: null,
          region: null,
          jobType: null,
          description: null,
          requirements: null,
          applyUrl: href?.startsWith('http')
            ? href
            : `https://www.laborum.cl${href}`,
        });
      }

      await browser.close();
    } catch (error) {
      console.error(
        `[LABORUM] Error al scraping: ${(error as Error).message}`,
      );
    }

    return jobs;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 255);
  }
}
