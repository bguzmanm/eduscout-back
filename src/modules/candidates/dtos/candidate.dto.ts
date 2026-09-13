import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterCandidateDto {
  @ApiProperty({ description: 'Nombre completo del postulante' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Correo electrónico del postulante' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Contraseña de acceso' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/[A-Za-z]/, { message: 'La contraseña debe incluir letras' })
  password: string;
}

export class LoginCandidateDto {
  @ApiProperty({ description: 'Correo electrónico del postulante' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Contraseña de acceso' })
  @IsString()
  @MinLength(1)
  password: string;
}

export class UpdateCandidateDto {
  @ApiProperty({ required: false, description: 'Nombre completo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false, nullable: true, description: 'Teléfono' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}

export class CandidateProfileDto {
  @ApiProperty({ example: 1, description: 'ID del postulante' })
  id: number;

  @ApiProperty({ example: 'María Fernanda Rojas' })
  name: string;

  @ApiProperty({ example: 'maria.rojas@mail.com' })
  email: string;

  @ApiProperty({ example: '+56912345678', nullable: true })
  phone: string | null;

  @ApiProperty({
    description: 'Metadatos del CV adjuntado',
    example: {
      fileName: 'cv-maria-rojas.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 245760,
      status: 'pending',
      uploadedAt: '2026-09-13T18:00:00.000Z',
    },
  })
  cv: {
    fileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    status: string;
    uploadedAt: Date | null;
  };

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;
}

export class CandidateAuthResponseDto {
  @ApiProperty({
    description: 'Token de sesión del postulante (Bearer)',
  })
  token: string;

  @ApiProperty({ description: 'Perfil del postulante' })
  candidate: CandidateProfileDto;
}