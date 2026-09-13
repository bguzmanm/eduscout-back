import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin',
    description: 'Usuario administrador',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username: string;

  @ApiProperty({
    example: '••••••••',
    description: 'Contraseña del administrador',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({
    example:
      'eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc2OTIwMDAwMH0.0DdP1hWVWnqPfBQOL1j9lv72SQVsQN9hZABGO0xLrYc',
    description: 'Token de acceso a las operaciones de administración',
  })
  token: string;

  @ApiProperty({
    example: '2026-09-13T16:30:00.000Z',
    description: 'Fecha de expiración del token',
  })
  expiresAt: string;

  @ApiProperty({
    example: 7200000,
    description: 'Vida útil del token en milisegundos',
  })
  expiresIn: number;
}