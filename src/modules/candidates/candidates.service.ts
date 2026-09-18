import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { AuthService } from '../auth/auth.service';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { MailerService } from '../mailer/mailer.service';
import { CandidatesRepository, type CvFile } from './candidates.repository';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly candidatesRepository: CandidatesRepository,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async register(data: { name: string; email: string; password: string }) {
    const email = data.email.trim().toLowerCase();
    const existing = await this.candidatesRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException(
        'No se pudo completar el registro. Verifica tus datos e inténtalo nuevamente.',
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

  async changePassword(id: number, data: {
    currentPassword: string;
    newPassword: string;
  }) {
    const candidate = await this.findOrThrow(id);
    if (!verifyPassword(data.currentPassword, candidate.passwordHash)) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    await this.candidatesRepository.update(id, {
      passwordHash: hashPassword(data.newPassword),
    });
    return { message: 'Contraseña actualizada con éxito' };
  }

  async requestPasswordReset(email: string) {
    const normalized = email.trim().toLowerCase();
    const candidate = await this.candidatesRepository.findByEmail(normalized);
    if (!candidate) {
      this.logger.warn(
        `Solicitud de reset para correo no registrado: ${normalized}`,
      );
      return {
        message:
          'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = this.hashResetToken(resetToken);
    await this.candidatesRepository.update(candidate.id, {
      resetTokenHash,
      resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/recuperar?token=${resetToken}`;
    const html = `<p>Hola ${candidate.name},</p>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>EduScout</strong>, el buscador chileno de cargos docentes y concursos académicos.</p>
<p>Este enlace permite crear una contraseña nueva <strong>(válido por 60 minutos)</strong>:</p>
<p><a href="${resetUrl}">Restablecer mi contraseña</a></p>
<p>Si el botón no funciona, copia y pega esta dirección en tu navegador:</p>
<p>${resetUrl}</p>
<p>Si no has solicitado este cambio, no es necesario hacer nada: tu contraseña seguirá siendo la misma.</p>
<p>¿Dudas? Escríbenos a <a href="mailto:no-reply@eduscout.cl">no-reply@eduscout.cl</a>.</p>
<p>— Equipo EduScout · eduscout.cl</p>`;
    const text = `Hola ${candidate.name},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en EduScout, el buscador chileno de cargos docentes y concursos académicos.

Este enlace permite crear una contraseña nueva (válido por 60 minutos):

${resetUrl}

Si no has solicitado este cambio, no es necesario hacer nada: tu contraseña seguirá siendo la misma.

¿Dudas? Escríbenos a no-reply@eduscout.cl.

— Equipo EduScout · eduscout.cl`;
    await this.mailerService.sendMail({
      to: candidate.email,
      subject: 'Recuperación de contraseña — EduScout',
      html,
      text,
    });

    return {
      message:
        'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetTokenHash = this.hashResetToken(token);
    const candidate =
      await this.candidatesRepository.findByResetTokenHash(resetTokenHash);
    if (
      !candidate ||
      !candidate.resetTokenExpiresAt ||
      candidate.resetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException(
        'El enlace de recuperación es inválido o ha expirado',
      );
    }

    await this.candidatesRepository.update(candidate.id, {
      passwordHash: hashPassword(newPassword),
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
    return {
      message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.',
    };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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