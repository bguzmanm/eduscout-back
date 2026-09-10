import { Controller, Post, Query } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('scraping')
@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('run')
  @ApiOperation({ summary: 'Ejecutar scraping manualmente' })
  @ApiQuery({
    name: 'source',
    required: false,
    description: 'Slug de la fuente específica (opcional)',
  })
  async run(@Query('source') sourceSlug?: string) {
    return this.scrapingService.runScraping(sourceSlug);
  }
}
