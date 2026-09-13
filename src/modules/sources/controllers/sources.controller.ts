import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SourcesService } from '../services/sources.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiWrappedResponse } from '../../../common/decorators/api-wrapped-response.decorator';
import { AdminAuthGuard } from '../../auth/admin-auth.guard';
import {
  CreateSourceDto,
  SourceResponseDto,
  UpdateSourceDto,
} from '../dtos/source.dto';

@ApiTags('sources')
@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Crear una nueva fuente' })
  @ApiWrappedResponse(SourceResponseDto, 201, 'Fuente creada con éxito.')
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async create(@Body() createSourceDto: CreateSourceDto) {
    return this.sourcesService.create(createSourceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las fuentes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de fuentes devuelta con éxito.',
  })
  async findAll() {
    return this.sourcesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una fuente por ID' })
  @ApiWrappedResponse(SourceResponseDto, 200, 'Fuente encontrada.')
  @ApiResponse({ status: 404, description: 'Fuente no encontrada.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sourcesService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Actualizar una fuente' })
  @ApiWrappedResponse(SourceResponseDto, 200, 'Fuente actualizada con éxito.')
  @ApiResponse({ status: 404, description: 'Fuente no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSourceDto: UpdateSourceDto,
  ) {
    return this.sourcesService.update(id, updateSourceDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Eliminar una fuente' })
  @ApiWrappedResponse(SourceResponseDto, 200, 'Fuente eliminada con éxito.')
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.sourcesService.remove(id);
  }
}
