import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { CandidatesRepository, type CvFile } from './candidates.repository';

@Injectable()
export class CandidatesService {
  constructor(
    private readonly candidatesRepository: CandidatesRepository,
    private readonly authService: AuthService,
  ) {}

  async register(data: { name: string; email: string; password: string }) {
    const email = data.email.trim().toLowerCase();
    const existing = await this.candidatesRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException(
        'Ya existe un postulante con ese correo electrónico',
      );
    }

    const passwordHash = hashPassword(data.password);
    const candidate = await this.candidatesRepository.create({
      name: data.name.trim(),
      email,
      passwordHash,
    });

    const session = this.authService.issueCandidateToken(candidate.id);
    return { token: session.token, candidate: this.toProfile(candidate) };
  }

  async login(data: { email: string; password: string }) {
    const email = data.email.trim().toLowerCase();
    const candidate = await this.candidatesRepository.findByEmail(email);
    if (!candidate || !verifyPassword(data.password, candidate.passwordHash)) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const session = this.authService.issueCandidateToken(candidate.id);
    return { token: session.token, candidate: this.toProfile(candidate) };
  }

  async getProfile(id: number) {
    const candidate = await this.findOrThrow(id);
    return this.toProfile(candidate);
  }

  async updateProfile(
    id: number,
    data: { name?: string; phone?: string | null },
  ) {
    const candidate = await this.findOrThrow(id);
    const updated = await this.candidatesRepository.update(id, {
      name: data.name?.trim() || candidate.name,
      phone: data.phone === undefined ? candidate.phone : data.phone,
    });
    return this.toProfile(updated);
  }

  async uploadCv(id: number, file: CvFile) {
    await this.findOrThrow(id);
    const updated = await this.candidatesRepository.saveCv(id, file);
    return {
      profile: this.toProfile(updated),
      message: 'CV subido con éxito',
    };
  }

  async getCv(id: number): Promise<CvFile | null> {
    const candidate = await this.findOrThrow(id);
    if (
      !candidate.cvData ||
      !candidate.cvFileName ||
      !candidate.cvMimeType
    ) {
      return null;
    }
    return {
      fileName: candidate.cvFileName,
      mimeType: candidate.cvMimeType,
      sizeBytes: candidate.cvSizeBytes ?? candidate.cvData.length,
      data: Buffer.from(candidate.cvData),
    };
  }

  private async findOrThrow(id: number) {
    const candidate = await this.candidatesRepository.findById(id);
    if (!candidate) {
      throw new NotFoundException('Postulante no encontrado');
    }
    return candidate;
  }

  private toProfile(candidate: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    cvFileName: string | null;
    cvMimeType: string | null;
    cvSizeBytes: number | null;
    cvStatus: string;
    cvUploadedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      cv: {
        fileName: candidate.cvFileName,
        mimeType: candidate.cvMimeType,
        sizeBytes: candidate.cvSizeBytes,
        status: candidate.cvStatus,
        uploadedAt: candidate.cvUploadedAt,
      },
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };
  }
}