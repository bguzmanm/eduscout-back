import { Controller, Post, Query, Get, UseGuards } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@ApiTags('scraping')
@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('run')
  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Ejecutar scraping manualmente' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiQuery({
    name: 'source',
    required: false,
    description: 'Slug de la fuente específica (opcional)',
  })
  async run(@Query('source') sourceSlug?: string) {
    return this.scrapingService.runScraping(sourceSlug);
  }

  @Get('report')
  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Obtener el último informe de scraping' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async getLatestReport() {
    return this.scrapingService.getLatestReport();
  }

  @Get('reports')
  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Obtener historial de informes de scraping' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de informes a devolver (máx. 50)',
  })
  async getRecentReports(@Query('limit') limit?: string) {
    return this.scrapingService.getRecentReports(limit ? Number(limit) : 10);
  }
}