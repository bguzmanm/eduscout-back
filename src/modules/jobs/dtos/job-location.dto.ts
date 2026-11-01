import { ApiProperty } from '@nestjs/swagger';

/** DTO para campos adicionales de dirección */
export class AddressLocationDto {
  @ApiProperty({ example: 'Santiago' })
  city?: string | null;

  @ApiProperty({ example: 'Metropolitana' })
  region?: string | null;

  @ApiProperty({ example: 'Av. Providencia' })
  streetAddress?: string | null;

  @ApiProperty({ example: 'Santiago, 8320021' })
  postalCode?: string | null;
}
