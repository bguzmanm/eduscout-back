import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SaveJobDto {
  @ApiProperty({ description: 'Identificador de la oferta a guardar.', example: 42 })
  @IsInt()
  @Min(1)
  jobId: number;
}

export class SavedJobDto {
  @ApiProperty({ description: 'Identificador del registro de guardado.' })
  id: number;

  @ApiProperty({ description: 'Fecha en que se guardó la oferta.' })
  savedAt: string;

  @ApiPropertyOptional({
    description: 'Oferta guardada; null si la oferta ya no está disponible.',
  })
  job: Record<string, unknown> | null;
}

export class SavedJobIdsDto {
  @ApiProperty({
    description: 'Identificadores de las ofertas guardadas por el postulante.',
    type: [Number],
  })
  jobIds: number[];
}
