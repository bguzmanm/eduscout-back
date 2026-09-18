import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiWrappedResponse } from '../../common/decorators/api-wrapped-response.decorator';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminService } from './admin.service';
import {
  AdminCandidatesPageResponseDto,
  CandidateStatsDto,
  ListAdminCandidatesDto,
} from './dtos/admin.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats/candidates')
  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: 'Indicadores de perfiles de candidatos para el panel admin',
  })
  @ApiWrappedResponse(
    CandidateStatsDto,
    200,
    'Indicadores de candidatos devueltos con éxito.',
  )
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async getCandidateStats() {
    return this.adminService.getCandidateStats();
  }

  @Get('candidates')
  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: 'Listado paginado de postulantes con detalle de CV y alertas',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Filtro por nombre o correo del postulante',
  })
  @ApiQuery({
    name: 'hasCv',
    required: false,
    description: 'Filtro por presencia de CV (true/false)',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiWrappedResponse(
    AdminCandidatesPageResponseDto,
    200,
    'Listado de postulantes devuelto con éxito.',
  )
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async listCandidates(@Query() query: ListAdminCandidatesDto) {
    return this.adminService.listCandidates(query);
  }
}