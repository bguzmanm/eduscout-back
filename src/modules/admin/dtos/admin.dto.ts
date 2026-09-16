import { ApiProperty } from '@nestjs/swagger';

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