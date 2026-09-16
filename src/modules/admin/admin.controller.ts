import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiWrappedResponse } from '../../common/decorators/api-wrapped-response.decorator';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminService } from './admin.service';
import { CandidateStatsDto } from './dtos/admin.dto';

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
}