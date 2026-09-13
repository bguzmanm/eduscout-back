import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { AlertsService } from './alerts.service';
import { CreateAlertDto, UpdateAlertDto } from './dtos/alert.dto';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(CandidateAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una alerta de ofertas' })
  @ApiResponse({ status: 201, description: 'Alerta creada con éxito.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  create(@Req() request: Request, @Body() dto: CreateAlertDto) {
    return this.alertsService.create(getCandidateId(request), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar las alertas del postulante' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  findAll(@Req() request: Request) {
    return this.alertsService.findAll(getCandidateId(request));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una alerta' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada.' })
  findOne(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.alertsService.findOne(id, getCandidateId(request));
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'Obtener las ofertas que calzaron con la alerta' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada.' })
  findMatches(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.alertsService.findMatches(id, getCandidateId(request));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar criterios o estado de la alerta' })
  @ApiResponse({ status: 200, description: 'Alerta actualizada con éxito.' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada.' })
  update(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.alertsService.update(id, getCandidateId(request), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una alerta' })
  @ApiResponse({ status: 200, description: 'Alerta eliminada con éxito.' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada.' })
  remove(@Req() request: Request, @Param('id', ParseIntPipe) id: number) {
    return this.alertsService.remove(id, getCandidateId(request));
  }
}