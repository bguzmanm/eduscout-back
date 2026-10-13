import { describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
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
    notifyByEmail: true,
    notifyByTelegram: false,
    telegramChatId: null,
    telegramLinkToken: null,
    telegramLinkTokenExpiresAt: null,
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
  env: Record<string, string> = {},
) {
  return new CandidatesService(
    repo as unknown as CandidatesRepository,
    {} as unknown as AuthService,
    new ConfigService({ FRONTEND_URL: 'https://eduscout.cl', ...env }),
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

describe('CandidatesService — preferencias y vinculación de Telegram', () => {
  it('actualiza las preferencias de notificación y las refleja en el perfil', async () => {
    const candidate = makeCandidate();
    const captured: RepoUpdateData[] = [];

    const service = buildService({
      findById: () => Promise.resolve(candidate),
      update: (_id: number, data: RepoUpdateData) => {
        captured.push(data);
        return Promise.resolve({ ...candidate, ...data });
      },
    });

    const profile = await service.updateProfile(1, {
      notifyByEmail: false,
      notifyByTelegram: true,
    });

    expect(captured[0].notifyByEmail).toBe(false);
    expect(captured[0].notifyByTelegram).toBe(true);
    expect(profile.notifications).toEqual({
      email: false,
      telegram: true,
      telegramLinked: false,
    });
  });

  it('genera un enlace de vinculación con el usuario del bot', async () => {
    const candidate = makeCandidate();
    const stored: string[] = [];
    const expirations: Date[] = [];

    const service = buildService(
      {
        findById: () => Promise.resolve(candidate),
        setTelegramLinkToken: (_id: number, token: string, expiresAt: Date) => {
          stored.push(token);
          expirations.push(expiresAt);
          return Promise.resolve({
            ...candidate,
            telegramLinkToken: token,
            telegramLinkTokenExpiresAt: expiresAt,
          });
        },
      },
      undefined,
      { TELEGRAM_BOT_USERNAME: 'EduScoutBot' },
    );

    const link = await service.createTelegramLink(1);

    expect(link.code).toMatch(/^[0-9a-f]{48}$/);
    expect(link.url).toBe(`https://t.me/EduScoutBot?start=${link.code}`);
    expect(link.linked).toBe(false);
    expect(stored).toEqual([link.code]);
    expect(expirations[0].getTime()).toBeGreaterThan(Date.now());
  });

  it('vincula el chat al postulante y desvincula al dueño anterior del chat', async () => {
    const candidate = makeCandidate({
      id: 1,
      name: 'Roberto Díaz',
      telegramLinkTokenExpiresAt: new Date(Date.now() + 60 * 1000),
    });
    const previous = makeCandidate({ id: 2, telegramChatId: '555' });
    const unlinked: number[] = [];
    const linked: Array<[number, string]> = [];

    const service = buildService({
      findByTelegramLinkToken: (token: string) =>
        Promise.resolve(token === 'tok-valido' ? candidate : undefined),
      findByTelegramChatId: () => Promise.resolve(previous),
      unlinkTelegram: (id: number) => {
        unlinked.push(id);
        return Promise.resolve({ ...previous, telegramChatId: null });
      },
      linkTelegram: (id: number, chatId: string) => {
        linked.push([id, chatId]);
        return Promise.resolve({ ...candidate, telegramChatId: chatId });
      },
    });

    const result = await service.completeTelegramLink('tok-valido', '555');

    expect(result).toEqual({ name: 'Roberto Díaz' });
    expect(unlinked).toEqual([2]);
    expect(linked).toEqual([[1, '555']]);
  });

  it('rechaza un token de vinculación inválido', async () => {
    const service = buildService({
      findByTelegramLinkToken: () => Promise.resolve(undefined),
    });

    await expect(
      service.completeTelegramLink('token-malo', '555'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza un token de vinculación expirado', async () => {
    const candidate = makeCandidate({
      id: 1,
      telegramLinkToken: 'tok-expirado',
      telegramLinkTokenExpiresAt: new Date(Date.now() - 1000),
    });
    let linkCalled = false;

    const service = buildService({
      findByTelegramLinkToken: () => Promise.resolve(candidate),
      linkTelegram: () => {
        linkCalled = true;
        return Promise.resolve(candidate);
      },
    });

    await expect(
      service.completeTelegramLink('tok-expirado', '555'),
    ).rejects.toThrow(NotFoundException);
    expect(linkCalled).toBe(false);
  });

  it('desvincula por chat y retorna false si no hay coincidencia', async () => {
    const candidate = makeCandidate({ id: 1, telegramChatId: '555' });
    const unlinked: number[] = [];

    const service = buildService({
      findByTelegramChatId: (chatId: string) =>
        Promise.resolve(chatId === '555' ? candidate : undefined),
      unlinkTelegram: (id: number) => {
        unlinked.push(id);
        return Promise.resolve({ ...candidate, telegramChatId: null });
      },
    });

    expect(await service.unlinkTelegramByChatId('555')).toBe(true);
    expect(await service.unlinkTelegramByChatId('000')).toBe(false);
    expect(unlinked).toEqual([1]);
  });

  it('desvincula desde el perfil y confirma el mensaje', async () => {
    const candidate = makeCandidate({ id: 1, telegramChatId: '555' });
    const unlinked: number[] = [];

    const service = buildService({
      findById: () => Promise.resolve(candidate),
      unlinkTelegram: (id: number) => {
        unlinked.push(id);
        return Promise.resolve({ ...candidate, telegramChatId: null });
      },
    });

    const result = await service.unlinkTelegram(1);

    expect(result.message).toContain('desvinculado');
    expect(unlinked).toEqual([1]);
  });
});