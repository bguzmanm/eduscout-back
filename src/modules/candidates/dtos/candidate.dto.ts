import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
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

  @ApiProperty({
    required: false,
    description:
      'Canal de adquisición (utm_source) capturado en el navegador. Ej: google, facebook, telegram',
    example: 'google',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  acquisitionSource?: string;

  @ApiProperty({
    required: false,
    description: 'Medio de adquisición (utm_medium)',
    example: 'organic',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  acquisitionMedium?: string;

  @ApiProperty({
    required: false,
    description: 'Campaña de adquisición (utm_campaign)',
    example: 'lanzamiento-alertas',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  acquisitionCampaign?: string;

  @ApiProperty({
    required: false,
    description: 'Sitio de referencia desde el que llegó el postulante',
    example: 'www.google.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  acquisitionReferrer?: string;
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

  @ApiProperty({
    required: false,
    description: 'Recibir notificaciones de alertas por correo electrónico',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyByEmail?: boolean;

  @ApiProperty({
    required: false,
    description: 'Recibir notificaciones de alertas por Telegram',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyByTelegram?: boolean;
}

export class ChangePasswordCandidateDto {
  @ApiProperty({ description: 'Contraseña actual' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  currentPassword: string;

  @ApiProperty({ description: 'Nueva contraseña' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/[A-Za-z]/, { message: 'La contraseña debe incluir letras' })
  newPassword: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ description: 'Correo electrónico del postulante' })
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de recuperación recibido por correo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token: string;

  @ApiProperty({ description: 'Nueva contraseña' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/[A-Za-z]/, { message: 'La contraseña debe incluir letras' })
  newPassword: string;
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

  @ApiProperty({
    description: 'Preferencias de notificación del postulante',
    example: { email: true, telegram: false, telegramLinked: false },
  })
  notifications: {
    email: boolean;
    telegram: boolean;
    telegramLinked: boolean;
  };

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;
}

export class TelegramLinkResponseDto {
  @ApiProperty({
    description: 'Enlace para vincular la cuenta con el bot de Telegram',
    example: 'https://t.me/EduScoutBot?start=abc123',
  })
  url: string;

  @ApiProperty({
    description: 'Código de vinculación incluido en el enlace',
    example: 'abc123',
  })
  code: string;

  @ApiProperty({
    description: 'Indica si el postulante ya tiene un Telegram vinculado',
    example: false,
  })
  linked: boolean;
}

export class CandidateAuthResponseDto {
  @ApiProperty({
    description: 'Token de sesión del postulante (Bearer)',
  })
  token: string;

  @ApiProperty({ description: 'Perfil del postulante' })
  candidate: CandidateProfileDto;
}