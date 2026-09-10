import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export function ApiWrappedResponse<T extends Type<unknown>>(
  dto: T,
  status: number,
  description: string,
) {
  return applyDecorators(
    ApiExtraModels(dto),
    ApiResponse({
      status,
      description,
      schema: {
        properties: {
          data: { $ref: getSchemaPath(dto) },
          timestamp: { type: 'string', example: new Date().toISOString() },
        },
        required: ['data', 'timestamp'],
      },
    }),
  );
}
