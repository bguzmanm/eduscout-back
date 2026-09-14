import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SearchJobsDto extends PaginationDto {
  @ApiProperty({
    required: false,
    description: 'Término de búsqueda para filtrar ofertas',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    required: false,
    description: 'Filtro por slug de fuente',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    required: false,
    description: 'Filtro por región',
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({
    required: false,
    description: 'Filtro por tipo de jornada',
  })
  @IsOptional()
  @IsString()
  jobType?: string;

  @ApiProperty({
    required: false,
    description: 'Filtrar ofertas publicadas desde esta fecha (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({
    required: false,
    description: 'Filtro por tipo de institución (ej. universidad_publica)',
  })
  @IsOptional()
  @IsString()
  category?: string;
}

export class JobResponseDto {
  @ApiProperty({ example: 1, description: 'ID único de la oferta' })
  id: number;

  @ApiProperty({ example: 1, description: 'ID de la fuente' })
  sourceId: number;

  @ApiProperty({
    example: 'MD2624',
    description: 'ID externo de la oferta en el sitio original',
  })
  externalId: string;

  @ApiProperty({
    example: 'Profesor Asistente en Biología',
    description: 'Título del puesto',
  })
  title: string;

  @ApiProperty({
    example: 'Universidad de Chile',
    description: 'Nombre de la institución',
    nullable: true,
  })
  company: string | null;

  @ApiProperty({
    example: 'Facultad de Medicina',
    description: 'Departamento o facultad',
    nullable: true,
  })
  department: string | null;

  @ApiProperty({
    example: 'Santiago, Metropolitana',
    description: 'Ubicación del puesto',
    nullable: true,
  })
  location: string | null;

  @ApiProperty({
    example: 'Metropolitana',
    description: 'Región',
    nullable: true,
  })
  region: string | null;

  @ApiProperty({
    example: 'Jornada Completa',
    description: 'Tipo de jornada',
    nullable: true,
  })
  jobType: string | null;

  @ApiProperty({
    example: 'Buscamos un docente con experiencia...',
    description: 'Descripción del puesto',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: 'Doctorado en el área correspondiente',
    description: 'Requisitos del puesto',
    nullable: true,
  })
  requirements: string | null;

  @ApiProperty({
    example: '$2.000.000 - $3.000.000 CLP',
    description: 'Rango salarial',
    nullable: true,
  })
  salaryRange: string | null;

  @ApiProperty({
    example: '2026-09-01T10:00:00.000Z',
    description: 'Fecha de publicación',
    nullable: true,
  })
  publishedAt: Date | null;

  @ApiProperty({
    example: '2026-10-01T23:59:59.000Z',
    description: 'Fecha límite de postulación',
    nullable: true,
  })
  deadline: Date | null;

  @ApiProperty({
    example: 'https://cargosacademicos.uc.cl/oferta/...',
    description: 'URL para postular en el sitio original',
  })
  applyUrl: string;

  @ApiProperty({
    example: true,
    description: 'Si la oferta está activa',
  })
  isActive: boolean;

  @ApiProperty({
    example: '2026-09-10T10:00:00.000Z',
    description: 'Fecha del último scraping',
  })
  scrapedAt: Date;

  @ApiProperty({
    example: '2026-09-10T10:00:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Nombre de la fuente',
    example: 'Universidad de Chile',
  })
  sourceName: string;

  @ApiProperty({
    description: 'Slug de la fuente',
    example: 'uchile',
  })
  sourceSlug: string;

  @ApiProperty({
    description: 'URL del logo/icono de la institución de la fuente',
    example: 'https://staticcdn.trabajando.cl/portal-comunidad/abc/assets/logo.png',
    nullable: true,
  })
  sourceLogoUrl: string | null;
}

export class JobStatsResponseDto {
  @ApiProperty({
    description: 'Ofertas por fuente',
    example: [{ source: 'uchile', count: 15 }],
  })
  bySource: { source: string; count: number }[];

  @ApiProperty({
    description: 'Ofertas por región',
    example: [{ region: 'Metropolitana', count: 20 }],
  })
  byRegion: { region: string; count: number }[];

  @ApiProperty({
    description: 'Total de ofertas activas',
    example: 85,
  })
  totalActive: number;

  @ApiProperty({
    description: 'Total de fuentes activas',
    example: 12,
  })
  activeSources: number;
}
