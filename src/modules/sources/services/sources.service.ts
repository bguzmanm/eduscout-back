import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SourcesRepository } from '../repositories/sources.repository';
import { CreateSourceDto, UpdateSourceDto } from '../dtos/source.dto';

@Injectable()
export class SourcesService {
  constructor(private readonly sourcesRepository: SourcesRepository) {}

  async create(dto: CreateSourceDto) {
    const existing = await this.sourcesRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(
        `Ya existe una fuente con el slug "${dto.slug}"`,
      );
    }
    return this.sourcesRepository.create(dto);
  }

  async findAll() {
    return this.sourcesRepository.findAllWithCounts();
  }

  async findOne(id: number) {
    const source = await this.sourcesRepository.findById(id);
    if (!source) {
      throw new NotFoundException(`Fuente con ID ${id} no encontrada`);
    }
    return source;
  }

  async findBySlug(slug: string) {
    const source = await this.sourcesRepository.findBySlug(slug);
    if (!source) {
      throw new NotFoundException(`Fuente con slug "${slug}" no encontrada`);
    }
    return source;
  }

  async update(id: number, dto: UpdateSourceDto) {
    const existing = await this.sourcesRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Fuente con ID ${id} no encontrada`);
    }
    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.sourcesRepository.findBySlug(dto.slug);
      if (slugExists) {
        throw new ConflictException(
          `Ya existe una fuente con el slug "${dto.slug}"`,
        );
      }
    }
    return this.sourcesRepository.update(id, dto);
  }

  async remove(id: number) {
    const existing = await this.sourcesRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Fuente con ID ${id} no encontrada`);
    }
    return this.sourcesRepository.delete(id);
  }

  async findActiveSources() {
    const all = await this.sourcesRepository.findAll();
    return all.filter((s) => s.isActive);
  }
}
