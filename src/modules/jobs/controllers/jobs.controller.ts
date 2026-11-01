import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { JobsService } from '../services/jobs.service';
import { JobLocationsController as LocationsController, AddressLocationDto } from './job-locations.controller';
import { JobExtendedResponseDtoWithSource, SearchJobsDto } from '../dtos/job.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly locationsController: LocationsController,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las ofertas' })
  @ApiQuery({ name: 'q', required: false, description: 'Término de búsqueda' })
  @ApiQuery({
    name: 'source',
    required: false,
    description: 'Filtro por slug de fuente',
  })
  @ApiQuery({
    name: 'region',
    required: false,
    description: 'Filtro por región',
  })
  @ApiQuery({
    name: 'jobType',
    required: false,
    description: 'Filtro por tipo de jornada',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtro por tipo de institución (ej. universidad_publica)',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Publicadas desde esta fecha (ISO 8601)',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiWrappedResponse(
    JobsPageResponseDto,
    200,
    'Lista de ofertas devuelta con éxito.',
  )
  async findAll(@Query() query: SearchJobsDto) {
    return this.jobsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de ofertas' })
  @ApiWrappedResponse(
    JobStatsResponseDto,
    200,
    'Estadísticas de ofertas devueltas con éxito.',
  )
  async getStats() {
    return this.jobsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una oferta por ID' })
  @ApiWrappedResponse(JobResponseDto, 200, 'Oferta encontrada.')
  @ApiResponse({ status: 404, description: 'Oferta no encontrada.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.findOne(id);
  }

  @Get(':id/extended')
  @ApiOperation({ summary: 'Obtener oferta ampliada con JSON-LD (address y baseSalary)' })
  @ApiWrappedResponse(JobExtendedResponseDtoWithSource, 200, 'Oferta ampliada encontrada.')
  @ApiResponse({ status: 404, description: 'Oferta no encontrada.' })
  async getExtended(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.getExtended(id);
  }

  @Get(':id/locations')
  @ApiOperation({ summary: 'Obtener dirección de la oferta' })
  @ApiWrappedResponse(
    AddressLocationDto,
    200,
    'Dirección devuelta (puede ser null si no está disponible).',
  )
  async getLocations(@Param('id', ParseIntPipe) id: number) {
    return this.locationsController.getJobLocations(id);
  }
}
}
