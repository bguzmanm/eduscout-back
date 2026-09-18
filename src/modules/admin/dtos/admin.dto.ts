import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import type { PaginationMeta } from '../../../common/types';

export class ListAdminCandidatesDto extends PaginationDto {
  @ApiProperty({
    required: false,
    description: 'Término para filtrar por nombre o correo del postulante',
    example: 'maría',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    required: false,
    description: 'Filtra por presencia de CV (true = con CV, false = sin CV)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasCv?: boolean;
}

export class AdminCandidateDto {
  @ApiProperty({
    description: 'Identificador del postulante',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del postulante',
    example: 'María Fernanda Rojas',
  })
  name: string;

  @ApiProperty({
    description: 'Correo del postulante',
    example: 'maria@mail.com',
  })
  email: string;

  @ApiProperty({
    description: 'Teléfono del postulante',
    example: '+56912345678',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'Nombre del archivo de CV',
    nullable: true,
  })
  cvFileName: string | null;

  @ApiProperty({
    description: 'Estado del CV (pending/approved/rejected)',
    example: 'pending',
  })
  cvStatus: string;

  @ApiProperty({
    description: 'Fecha de subida del CV',
    nullable: true,
  })
  cvUploadedAt: string | null;

  @ApiProperty({
    description: 'Total de alertas creadas por el postulante',
    example: 2,
  })
  alertCount: number;

  @ApiProperty({
    description: 'Alertas activas del postulante',
    example: 1,
  })
  activeAlertCount: number;

  @ApiProperty({
    description: 'Coincidencias generadas por las alertas del postulante',
    example: 12,
  })
  matchCount: number;

  @ApiProperty({
    description: 'Fecha y hora de registro',
    example: '2026-09-10T20:15:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Última actualización del perfil',
    example: '2026-09-15T10:00:00.000Z',
  })
  updatedAt: string;
}

@ApiExtraModels(AdminCandidateDto)
export class AdminCandidatesPageResponseDto {
  @ApiProperty({
    description: 'Postulantes de la página',
    type: 'array',
    items: { $ref: getSchemaPath(AdminCandidateDto) },
  })
  items: AdminCandidateDto[];

  @ApiProperty({
    description: 'Metadatos de paginación',
    example: { page: 1, limit: 20, total: 42, totalPages: 3 },
  })
  meta: PaginationMeta;
}

export class AlertsDistributionDto {
  @ApiProperty({
    description: 'Candidatos sin alertas',
    example: 10,
  })
  noAlerts: number;

  @ApiProperty({
    description: 'Candidatos con 1 a 2 alertas',
    example: 4,
  })
  fewAlerts: number;

  @ApiProperty({
    description: 'Candidatos con 3 o más alertas',
    example: 2,
  })
  manyAlerts: number;
}

export class CandidateStatsDto {
  @ApiProperty({
    description: 'Total de perfiles de candidatos creados',
    example: 42,
  })
  totalCandidates: number;

  @ApiProperty({
    description: 'Candidatos que han subido un CV',
    example: 25,
  })
  candidatesWithCv: number;

  @ApiProperty({
    description: 'Candidatos con teléfono registrado',
    example: 30,
  })
  candidatesWithPhone: number;

  @ApiProperty({
    description: 'Candidatos con CV y teléfono registrados (perfil completo)',
    example: 20,
  })
  candidatesWithCvAndPhone: number;

  @ApiProperty({
    description: 'Candidatos con al menos una alerta creada',
    example: 18,
  })
  candidatesWithAlerts: number;

  @ApiProperty({
    description: 'Total de alertas creadas',
    example: 35,
  })
  totalAlerts: number;

  @ApiProperty({
    description: 'Alertas activas',
    example: 28,
  })
  activeAlerts: number;

  @ApiProperty({
    description: 'Alertas pausadas o inactivas',
    example: 7,
  })
  inactiveAlerts: number;

  @ApiProperty({
    description: 'Coincidencias generadas entre alertas y ofertas',
    example: 120,
  })
  totalAlertMatches: number;

  @ApiProperty({
    description: 'Promedio de alertas por candidato con alertas (1 decimal)',
    example: 1.9,
  })
  avgAlertsPerCandidate: number;

  @ApiProperty({
    description: 'Candidatos registrados en los últimos 7 días',
    example: 5,
  })
  registeredLast7d: number;

  @ApiProperty({
    description: 'Candidatos registrados en los últimos 30 días',
    example: 14,
  })
  registeredLast30d: number;

  @ApiProperty({
    description: 'Distribución de candidatos según su cantidad de alertas',
    type: AlertsDistributionDto,
  })
  alertsDistribution: AlertsDistributionDto;
}