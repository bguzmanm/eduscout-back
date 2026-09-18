import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertsRepository } from './alerts.repository';
import { MailerService } from '../mailer/mailer.service';

interface DigestJob {
  matchId: number;
  id: number;
  title: string;
  location: string | null;
  deadline: Date | null;
  source: { name: string; slug: string } | null;
}

interface DigestAlert {
  name: string;
  jobs: DigestJob[];
}

interface DigestCandidate {
  name: string;
  email: string;
  alerts: DigestAlert[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDeadline(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function jobMeta(job: DigestJob): string {
  const parts: string[] = [];
  if (job.location) parts.push(job.location);
  if (job.deadline) parts.push(`cierra el ${formatDeadline(job.deadline)}`);
  if (job.source) parts.unshift(job.source.name);
  return parts.join(' · ');
}

@Injectable()
export class AlertNotifierService {
  private readonly logger = new Logger('AlertNotifierService');

  constructor(
    private readonly alertsRepository: AlertsRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async notifyUnnotified(): Promise<number> {
    if (
      this.configService.get<string>('ALERTS_NOTIFY_ENABLED', 'true') === 'false'
    ) {
      this.logger.log(
        'Notificaciones de alertas deshabilitadas por configuración',
      );
      return 0;
    }

    if (!this.mailerService.isConfigured) {
      this.logger.warn(
        'SMTP no configurado: no se envían notificaciones de alertas',
      );
      return 0;
    }

    const matches = await this.alertsRepository.findUnnotifiedMatches();
    if (matches.length === 0) return 0;

    const maxPerRun = Number(
      this.configService.get<string>('ALERTS_NOTIFY_MAX_PER_RUN', '500'),
    );
    const delayMs = Number(
      this.configService.get<string>('ALERTS_NOTIFY_DELAY_MS', '0'),
    );
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    const digests = this.groupByCandidate(matches);
    const sentIds: number[] = [];
    let sentCount = 0;

    for (const digest of digests) {
      if (sentCount >= maxPerRun) break;

      const totalOffers = digest.alerts.reduce(
        (acc, alert) => acc + alert.jobs.length,
        0,
      );
      const ok = await this.mailerService.sendMail(
        this.buildMessage(digest, totalOffers, frontendUrl),
      );

      if (ok) {
        sentCount++;
        sentIds.push(...digest.alerts.flatMap((alert) => alert.jobs.map((j) => j.matchId)));
      } else {
        this.logger.error(
          `No se pudo notificar al postulante ${digest.email}`,
        );
      }

      if (delayMs > 0) await sleep(delayMs);
    }

    await this.alertsRepository.markNotified(sentIds);

    this.logger.log(
      `${sentCount} notificaciones de alertas enviadas por correo (${digests.length} postulantes con ofertas pendientes)`,
    );
    return sentCount;
  }

  private groupByCandidate(
    matches: Array<{
      id: number;
      alert: { id: number; name: string; candidate: { id: number; name: string; email: string } };
      job: {
        id: number;
        title: string;
        location: string | null;
        deadline: Date | null;
        source: { name: string; slug: string } | null;
      };
    }>,
  ): DigestCandidate[] {
    const byCandidate = new Map<number, DigestCandidate>();
    const alertIndex = new Map<string, DigestAlert>();

    for (const match of matches) {
      let digest = byCandidate.get(match.alert.candidate.id);
      if (!digest) {
        digest = {
          name: match.alert.candidate.name,
          email: match.alert.candidate.email,
          alerts: [],
        };
        byCandidate.set(match.alert.candidate.id, digest);
      }

      const alertKey = `${match.alert.id}`;
      let alertDigest = alertIndex.get(alertKey);
      if (!alertDigest) {
        alertDigest = { name: match.alert.name, jobs: [] };
        alertIndex.set(alertKey, alertDigest);
        digest.alerts.push(alertDigest);
      }

      alertDigest.jobs.push({
        matchId: match.id,
        id: match.job.id,
        title: match.job.title,
        location: match.job.location,
        deadline: match.job.deadline,
        source: match.job.source,
      });
    }

    return [...byCandidate.values()];
  }

  private buildMessage(
    digest: DigestCandidate,
    totalOffers: number,
    frontendUrl: string,
  ): { to: string; subject: string; html: string; text: string } {
    const offersWord = totalOffers === 1 ? 'oferta nueva' : `${totalOffers} ofertas nuevas`;
    const subject = `EduScout: ${offersWord} que calzan con tus alertas`;

    const alertBlocks = digest.alerts
      .map((alert) => {
        const itemsHtml = alert.jobs
          .map((job) => {
            const title = escapeHtml(job.title);
            const meta = escapeHtml(jobMeta(job));
            return `<li><a href="${frontendUrl}/ofertas/${job.id}">${title}</a><span style="color:#666"> — ${meta}</span></li>`;
          })
          .join('');

        const itemsText = alert.jobs
          .map((job) => `  - ${job.title} (${jobMeta(job)})\n    ${frontendUrl}/ofertas/${job.id}`)
          .join('\n');

        return {
          hasJobs: alert.jobs.length > 0,
          html: `<p style="font-weight:600;margin:12px 0 4px">${escapeHtml(alert.name)}</p><ul style="margin:0 0 8px;padding-left:20px">${itemsHtml}</ul>`,
          text: `${alert.name}:\n${itemsText}\n`,
        };
      })
      .filter((block) => block.hasJobs);

    const html = `<p>Hola ${escapeHtml(digest.name)},</p>
<p>En <strong>EduScout</strong> encontramos <strong>${offersWord}</strong> que calzan con tus alertas:</p>
${alertBlocks.map((b) => b.html).join('\n')}
<p><a href="${frontendUrl}/alertas">Revisar mis alertas en EduScout</a></p>
<p>Para dejar de recibir estos correos, puedes pausar o eliminar tus alertas en EduScout.</p>
<p>— Equipo EduScout · eduscout.cl</p>`;

    const text = `Hola ${digest.name},

En EduScout encontramos ${offersWord} que calzan con tus alertas:

${alertBlocks.map((b) => b.text).join('\n')}
Revisa tus alertas en: ${frontendUrl}/alertas

Para dejar de recibir estos correos, pausa o elimina tus alertas en EduScout.

— Equipo EduScout · eduscout.cl`;

    return {
      to: digest.email,
      subject,
      html,
      text,
    };
  }
}