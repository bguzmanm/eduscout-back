import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CandidateAuthGuard,
  getCandidateId,
} from '../auth/candidate-auth.guard';
import { SavedJobsService } from './saved-jobs.service';
import { SaveJobDto } from './dtos/saved-job.dto';

@ApiTags('saved-jobs')
@ApiBearerAuth()
@UseGuards(CandidateAuthGuard)
@Controller('saved-jobs')
export class SavedJobsController {
  constructor(private readonly savedJobsService: SavedJobsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar las ofertas guardadas por el postulante' })
  @ApiResponse({ status: 200, description: 'Listado de ofertas guardadas.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  findAll(@Req() request: Request) {
    return this.savedJobsService.findAll(getCandidateId(request));
  }

  @Get('ids')
  @ApiOperation({ summary: 'Obtener los identificadores de las ofertas guardadas' })
  @ApiResponse({ status: 200, description: 'Identificadores de ofertas guardadas.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  findJobIds(@Req() request: Request) {
    return this.savedJobsService.findJobIds(getCandidateId(request));
  }

  @Post()
  @ApiOperation({ summary: 'Guardar una oferta' })
  @ApiResponse({ status: 201, description: 'Oferta guardada con éxito.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada.' })
  save(@Req() request: Request, @Body() dto: SaveJobDto) {
    return this.savedJobsService.save(getCandidateId(request), dto.jobId);
  }

  @Delete(':jobId')
  @ApiOperation({ summary: 'Quitar una oferta de los guardados' })
  @ApiResponse({ status: 200, description: 'Oferta quitada de los guardados.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 404, description: 'Oferta no estaba guardada.' })
  remove(
    @Req() request: Request,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    return this.savedJobsService.remove(getCandidateId(request), jobId);
  }
}
