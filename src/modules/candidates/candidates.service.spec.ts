import { describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { verifyPassword } from '../../common/utils/password';
import type { CandidatesRepository } from './candidates.repository';
import type { AuthService } from '../auth/auth.service';
import type { MailerService } from '../mailer/mailer.service';

type RepoUpdateData = Parameters<CandidatesRepository['update']>[1];

interface MailSnapshot {
  to: string;
  subject: string;
  html: string;
}

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Roberto Díaz',
    email: 'roberto@mail.com',
    passwordHash: 'salt:derived',
    phone: null,
    cvFileName: null,
    cvMimeType: null,
    cvSizeBytes: null,
    cvStatus: 'pending',
    cvUploadedAt: null,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function hashOf(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function buildService(
  repo: Record<string, unknown>,
  mailer?: { sendMail: (message: MailSnapshot) => Promise<boolean> },
) {
  return new CandidatesService(
    repo as unknown as CandidatesRepository,
    {} as unknown as AuthService,
    new ConfigService({ FRONTEND_URL: 'https://eduscout.cl' }),
    (mailer ?? { sendMail: () => Promise.resolve(false) }) as unknown as MailerService,
  );
}

describe('CandidatesService — recuperación de contraseña', () => {
  it('solicita el reset, guarda el hash del token y envía el correo con el enlace', async () => {
    const candidate = makeCandidate();
    const updates: RepoUpdateData[] = [];
    const sent: MailSnapshot[] = [];

    const service = buildService(
      {
        findByEmail: () => Promise.resolve(candidate),
        update: (_id: number, data: RepoUpdateData) => {
          updates.push(data);
          return Promise.resolve({ ...candidate, ...data });
        },
      },
      {
        sendMail: (message) => {
          sent.push(message);
          return Promise.resolve(false);
        },
      },
    );

    const result = await service.requestPasswordReset('  Roberto@Mail.com ');

    expect(result.message).toContain('Si el correo está registrado');
    expect(updates).toHaveLength(1);
    expect(String(updates[0].resetTokenHash)).toMatch(/^[0-9a-f]{64}$/);
    expect(
      new Date(String(updates[0].resetTokenExpiresAt)).getTime(),
    ).toBeGreaterThan(Date.now());
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('roberto@mail.com');
    expect(sent[0].html).toContain('https://eduscout.cl/recuperar?token=');
  });

  it('no revela si el correo no está registrado y no emite token', async () => {
    let updateCalled = false;
    const service = buildService({
      findByEmail: () => Promise.resolve(undefined),
      update: () => {
        updateCalled = true;
        return Promise.resolve(makeCandidate());
      },
    });

    const result = await service.requestPasswordReset('nadie@mail.com');

    expect(result.message).toContain('Si el correo está registrado');
    expect(updateCalled).toBe(false);
  });

  it('restablece la contraseña con un token válido y consume el token', async () => {
    const token = 'token-valido-secreto';
    const candidate = makeCandidate({
      resetTokenHash: hashOf(token),
      resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const captured: { value: RepoUpdateData | null } = { value: null };

    const service = buildService({
      findByResetTokenHash: () => Promise.resolve(candidate),
      update: (_id: number, data: RepoUpdateData) => {
        captured.value = data;
        return Promise.resolve({ ...candidate, ...data });
      },
    });

    const result = await service.resetPassword(token, 'nueva-clave-9');

    expect(result.message).toContain('Contraseña actualizada');
    const passwordHash = String(captured.value?.passwordHash);
    expect(passwordHash).toBeTruthy();
    expect(verifyPassword('nueva-clave-9', passwordHash)).toBe(true);
    expect(captured.value?.resetTokenHash).toBeNull();
  });

  it('rechaza tokens inválidos o expirados', async () => {
    const token = 'token-valido-secreto';
    const candidate = makeCandidate({
      resetTokenHash: hashOf(token),
      resetTokenExpiresAt: new Date(Date.now() - 1000),
    });

    const service = buildService({
      findByResetTokenHash: () => Promise.resolve(candidate),
    });

    await expect(service.resetPassword(token, 'nueva-clave-9')).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(
      service.resetPassword('token-fake', 'nueva-clave-9'),
    ).rejects.toThrow(UnauthorizedException);
  });
});