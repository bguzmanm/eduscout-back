import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateSourceDto {
  @ApiProperty({
    example: 'Universidad de Chile',
    description: 'Nombre de la fuente',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'uchile',
    description: 'Identificador único de la fuente',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug: string;

  @ApiProperty({
    example: 'https://concurso-academico.uchile.cl',
    description: 'URL base de la fuente',
  })
  @IsString()
  @IsNotEmpty()
  baseUrl: string;

  @ApiProperty({
    example: 'uchile_api',
    description: 'Tipo de scraper a utilizar',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  scraperType: string;

  @ApiProperty({
    example: 'universidad_publica',
    description: 'Categoría de la institución',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiProperty({
    example: true,
    description: 'Si la fuente está activa para scraping',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSourceDto extends PartialType(CreateSourceDto) {}

export class SourceResponseDto {
  @ApiProperty({ example: 1, description: 'ID único de la fuente' })
  id: number;

  @ApiProperty({
    example: 'Universidad de Chile',
    description: 'Nombre de la fuente',
  })
  name: string;

  @ApiProperty({
    example: 'uchile',
    description: 'Identificador único de la fuente',
  })
  slug: string;

  @ApiProperty({
    example: 'https://concurso-academico.uchile.cl',
    description: 'URL base de la fuente',
  })
  baseUrl: string;

  @ApiProperty({
    example: 'uchile_api',
    description: 'Tipo de scraper a utilizar',
  })
  scraperType: string;

  @ApiProperty({
    example: 'universidad_publica',
    description: 'Categoría de la institución',
  })
  category: string;

  @ApiProperty({
    example: true,
    description: 'Si la fuente está activa para scraping',
  })
  isActive: boolean;

  @ApiProperty({
    example: '2026-09-10T10:00:00.000Z',
    description: 'Fecha del último scraping',
    nullable: true,
  })
  lastScraped: Date | null;

  @ApiProperty({
    example: '2026-09-10T10:00:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt: Date;
}
