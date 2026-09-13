import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlertDto {
  @ApiProperty({
    description: 'Nombre que identifica la alerta',
    example: 'Docencia en la Región Metropolitana',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Palabras clave que deben aparecer en la oferta',
    example: ['profesor', 'ingeniería'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Regiones donde se busca la oferta',
    example: ['Metropolitana'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Tipos de jornada',
    example: ['Jornada completa'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobTypes?: string[];

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Categorías de institución',
    example: ['universidad_publica'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

export class UpdateAlertDto {
  @ApiProperty({ required: false, description: 'Nombre de la alerta' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobTypes?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiProperty({
    required: false,
    description: 'Si la alerta está activa o pausada',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AlertResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  candidateId: number;

  @ApiProperty({ example: 'Docencia en la RM' })
  name: string;

  @ApiProperty({ type: [String] })
  keywords: string[];

  @ApiProperty({ type: [String] })
  regions: string[];

  @ApiProperty({ type: [String] })
  jobTypes: string[];

  @ApiProperty({ type: [String] })
  categories: string[];

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 3, description: 'Cantidad de ofertas que calzaron' })
  matchCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}