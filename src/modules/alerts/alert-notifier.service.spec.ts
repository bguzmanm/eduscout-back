import { describe, expect, it } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import { AlertNotifierService } from './alert-notifier.service';
import type { AlertsRepository } from './alerts.repository';
import type { MailerService } from '../mailer/mailer.service';
import type { TelegramService } from '../telegram/telegram.service';

interface MailSnapshot {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface TelegramSnapshot {
  chatId: string;
  text: string;
}

const defaultCandidate = {
  id: 42,
  name: 'Roberto Díaz',
  email: 'roberto@mail.com',
  notifyByEmail: true,
  notifyByTelegram: false,
  telegramChatId: null,
};

function makeMatch(overrides: Record<string, unknown> = {}) {
  const { alert: alertOverrides, job: jobOverrides, ...rest } = overrides;
  return {
    id: 11,
    alert: {
      id: 1,
      name: 'Docencia matemáticas RM',
      candidate: { ...defaultCandidate },
      ...(alertOverrides as Record<string, unknown>),
    },
    job: {
      id: 7,
      title: 'Profesor de Matemáticas',
      location: 'Santiago',
      deadline: null,
      source: { name: 'U de Chile', slug: 'u-chile' },
      ...(jobOverrides as Record<string, unknown>),
    },
    ...rest,
  };
}

function buildService(
  repo: Record<string, unknown>,
  mailer: {
    isConfigured?: boolean;
    sendMail?: (message: MailSnapshot) => Promise<boolean>;
  } = {},
  telegram: {
    isConfigured?: boolean;
    sendToChat?: (chatId: string, text: string) => Promise<boolean>;
  } = {},
  env: Record<string, string> = {},
) {
  return new AlertNotifierService(
    repo as unknown as AlertsRepository,
    {
      isConfigured: mailer.isConfigured ?? true,
      sendMail: (mailer.sendMail ?? (() => Promise.resolve(true))),
    } as unknown as MailerService,
    {
      isConfigured: telegram.isConfigured ?? false,
      sendToChat:
        telegram.sendToChat ?? (() => Promise.resolve(true)),
    } as unknown as TelegramService,
    new ConfigService(env),
  );
}

describe('AlertNotifierService — notificaciones por correo', () => {
  it('envía un dígesto por postulante y marca notificados solo los enviados', async () => {
    const matches = [
      makeMatch(),
      makeMatch({
        id: 12,
        job: { id: 8, title: 'Profesor de Ciencias', location: 'Santiago', deadline: null, source: { name: 'U de Chile', slug: 'u-chile' } },
      }),
      makeMatch({
        id: 13,
        alert: {
          id: 2,
          name: 'Concursos con concursar.cl',
          candidate: { ...defaultCandidate },
        },
        job: { id: 99, title: 'Directivo Unidad Académica', location: null, deadline: null, source: { name: 'concursar.cl', slug: 'concursar' } },
      }),
    ];
    const sent: MailSnapshot[] = [];
    const marked: number[] = [];

    const service = buildService(
      {
        findUnnotifiedMatches: () => Promise.resolve(matches),
        markNotified: (ids: number[]) => {
          marked.push(...ids);
          return Promise.resolve();
        },
      },
      {
        sendMail: (message) => {
          sent.push(message);
          return Promise.resolve(true);
        },
      },
      {},
      { FRONTEND_URL: 'https://eduscout.cl' },
    );

    const count = await service.notifyUnnotified();

    expect(count).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('roberto@mail.com');
    expect(sent[0].subject).toContain('3 ofertas nuevas');
    expect(sent[0].html).toContain('Hola Roberto Díaz');
    expect(sent[0].html).toContain('https://eduscout.cl/ofertas/7');
    expect(sent[0].html).toContain('https://eduscout.cl/ofertas/99');
    expect(sent[0].html).toContain('Docencia matemáticas RM');
    expect(sent[0].html).toContain('Concursos con concursar.cl');
    expect(sent[0].text).toContain('U de Chile');
    expect(marked).toEqual([11, 12, 13]);
  });

  it('respeta el tope de correos por corrida', async () => {
    const matches = [1, 2, 3].map((n) =>
      makeMatch({
        id: n,
        alert: {
          id: n,
          name: `Alerta ${n}`,
          candidate: { ...defaultCandidate, id: n, name: `Candidato ${n}`, email: `c${n}@mail.com` },
        },
      }),
    );
    const sent: string[] = [];

    const service = buildService(
      {
        findUnnotifiedMatches: () => Promise.resolve(matches),
        markNotified: () => Promise.resolve(),
      },
      {
        sendMail: (message) => {
          sent.push(message.to);
          return Promise.resolve(true);
        },
      },
      {},
      { ALERTS_NOTIFY_MAX_PER_RUN: '2' },
    );

    const count = await service.notifyUnnotified();

    expect(count).toBe(2);
    expect(sent).toEqual(['c1@mail.com', 'c2@mail.com']);
  });

  it('no envía si las notificaciones están deshabilitadas', async () => {
    let consulted = false;
    const service = buildService(
      {
        findUnnotifiedMatches: () => {
          consulted = true;
          return Promise.resolve([makeMatch()]);
        },
        markNotified: () => Promise.resolve(),
      },
      {},
      {},
      { ALERTS_NOTIFY_ENABLED: 'false' },
    );

    const count = await service.notifyUnnotified();

    expect(count).toBe(0);
    expect(consulted).toBe(false);
  });

  it('no envía si no hay ningún canal configurado', async () => {
    let consulted = false;
    const service = buildService(
      {
        findUnnotifiedMatches: () => {
          consulted = true;
          return Promise.resolve([makeMatch()]);
        },
        markNotified: () => Promise.resolve(),
      },
      { isConfigured: false },
      { isConfigured: false },
    );

    const count = await service.notifyUnnotified();

    expect(count).toBe(0);
    expect(consulted).toBe(false);
  });

  it('no marca como notificados los envíos que fallan', async () => {
    const marked: number[] = [];
    const service = buildService(
      {
        findUnnotifiedMatches: () => Promise.resolve([makeMatch(), makeMatch({ id: 12, job: { id: 8, title: 'Profesor de Ciencias', location: null, deadline: null, source: null } })]),
        markNotified: (ids: number[]) => {
          marked.push(...ids);
          return Promise.resolve();
        },
      },
      { sendMail: () => Promise.resolve(false) },
    );

    const count = await service.notifyUnnotified();

    expect(count).toBe(0);
    expect(marked).toEqual([]);
  });
});

describe('AlertNotifierService — canales de notificación', () => {
  it('envía solo por Telegram cuando el postulante así lo eligió', async () => {
    const matches = [
      makeMatch({
        alert: {
          id: 1,
          name: 'Docencia matemáticas RM',
          candidate: {
            ...defaultCandidate,
            notifyByEmail: false,
            notifyByTelegram: true,
            telegramChatId: '12345',
          },
        },
      }),
    ];
    const mails: MailSnapshot[] = [];
    const telegrams: TelegramSnapshot[] = [];
    const marked: number[] = [];

    const service = buildService(
      {
        findUnnotifiedMatches: () => Promise.resolve(matches),
        markNotified: (ids: number[]) => {
          marked.push(...ids);
          return Promise.resolve();
        },
      },
      {
        isConfigured: false,
        sendMail: (message) => {
          mails.push(message);
          return Promise.resolve(true);
        },
      },
      {
        isConfigured: true,
        sendToChat: (chatId, text) => {
          telegrams.push({ chatId, text });
          return Promise.resolve(true);
        },
      },
      { FRONTEND_URL: 'https://eduscout.cl' },
    );

    const count = await service.notifyUnnotified();

    expect(count).toBe(1);
    expect(mails).toHaveLength(0);
    expect(telegrams).toHaveLength(1);
    expect(telegrams[0].chatId).toBe('12345');
    expect(telegrams[0].text).toContain('Roberto Díaz');
    expect(telegrams[0].text).toContain('https://eduscout.cl/ofertas/7');
    expect(marked).toEqual([11]);
  });

  it('envía por ambos canales cuando el postulante los tiene activos', async () => {
    const matches = [
      makeMatch({
        alert: {
          id: 1,
          name: 'Docencia matemáticas RM',
          candidate: {
            ...defaultCandidate,
            notifyByEmail: true,
            notifyByTelegram: true,
            telegramChatId: '999',
          },
        },
      }),
    ];
    const mails: MailSnapshot[] = [];
    const telegrams: TelegramSnapshot[] = [];

    const service = buildService(
      {
        findUnnotifiedMatches: () => Promise.resolve(matches),
        markNotified: () => Promise.resolve(),
      },
      {
        sendMail: (message) => {
          mails.push(message);
          return Promise.resolve(true);
        },
      },
      {
        isConfigured: true,
        sendToChat: (chatId, text) => {
          telegrams.push({ chatId, text });
          return Promise.resolve(true);
        },
      },
    );

    const count = await service.notifyUnnotified();

    expect(count).toBe(1);
    expect(mails).toHaveLength(1);
    expect(telegrams).toHaveLength(1);
  });

  it('omite al postulante que desactivó todos los canales y no marca sus matches', async () => {
    const matches = [
      makeMatch({
        alert: {
          id: 1,
          name: 'Docencia matemáticas RM',
          candidate: {
            ...defaultCandidate,
            notifyByEmail: false,
            notifyByTelegram: false,
            telegramChatId: null,
          },
        },
      }),
    ];
    const marked: number[] = [];

    const service = buildService(
      {
        findUnnotifiedMatches: () => Promise.resolve(matches),
        markNotified: (ids: number[]) => {
          marked.push(...ids);
          return Promise.resolve();
        },
      },
      {},
      { isConfigured: true },
    );

    const count = await service.notifyUnnotified();

    expect(count).toBe(0);
    expect(marked).toEqual([]);
  });

  it('ignora Telegram si el postulante no tiene chat vinculado', async () => {
    const matches = [
      makeMatch({
        alert: {
          id: 1,
          name: 'Docencia matemáticas RM',
          candidate: {
            ...defaultCandidate,
            notifyByEmail: false,
            notifyByTelegram: true,
            telegramChatId: null,
          },
        },
      }),
    ];
    const telegrams: TelegramSnapshot[] = [];

    const service = buildService(
      {
        findUnnotifiedMatches: () => Promise.resolve(matches),
        markNotified: () => Promise.resolve(),
      },
      { isConfigured: false },
      {
        isConfigured: true,
        sendToChat: (chatId, text) => {
          telegrams.push({ chatId, text });
          return Promise.resolve(true);
        },
      },
    );

    const count = await service.notifyUnnotified();

    expect(count).toBe(0);
    expect(telegrams).toHaveLength(0);
  });

  it('marca notificado si al menos un canal entregó el mensaje', async () => {
    const matches = [
      makeMatch({
        alert: {
          id: 1,
          name: 'Docencia matemáticas RM',
          candidate: {
            ...defaultCandidate,
            notifyByEmail: true,
            notifyByTelegram: true,
            telegramChatId: '555',
          },
        },
      }),
    ];
    const marked: number[] = [];

    const service = buildService(
      {
        findUnnotifiedMatches: () => Promise.resolve(matches),
        markNotified: (ids: number[]) => {
          marked.push(...ids);
          return Promise.resolve();
        },
      },
      { sendMail: () => Promise.resolve(false) },
      {
        isConfigured: true,
        sendToChat: () => Promise.resolve(true),
      },
    );

    const count = await service.notifyUnnotified();

    expect(count).toBe(1);
    expect(marked).toEqual([11]);
  });
});
