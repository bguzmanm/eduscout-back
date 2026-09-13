import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { ScrapingRunSource } from '../../db/schema';

export interface ScrapingRunReport {
  id: number;
  status: 'completed' | 'failed';
  startedAt: string;
  durationMs: number | null;
  totalNew: number;
  totalUpdated: number;
  totalErrors: number;
  perSource: ScrapingRunSource[];
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger('TelegramService');
  private readonly botToken?: string;
  private readonly chatId?: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
  }

  async sendReport(report: ScrapingRunReport): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      this.logger.warn(
        'Telegram no configurado: faltan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID',
      );
      return false;
    }

    const text = this.formatReport(report);

    try {
      await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          chat_id: Number(this.chatId),
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        },
        { timeout: 15000 },
      );
      this.logger.log(`Informe enviado a Telegram (run #${report.id})`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error al enviar informe a Telegram: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private formatReport(report: ScrapingRunReport): string {
    const lines: string[] = [];
    const started = new Date(report.startedAt);
    const dateStr = started.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const isFailed = report.status === 'failed';
    const statusEmoji = isFailed ? '❌' : '✅';

    lines.push('📊 <b>EduScout — Informe de scraping</b>');
    lines.push(
      `🗓 ${dateStr} · ⏱ ${this.formatDuration(report.durationMs)} · ${statusEmoji} <b>${isFailed ? 'Fallido' : 'Completado'}</b>`,
    );
    lines.push('');

    for (const source of report.perSource) {
      const emoji = source.status === 'error' ? '🔴' : '🟢';
      const details =
        source.newCount === 0 && source.updatedCount === 0
          ? 'sin novedades'
          : `${source.newCount} nueva${source.newCount === 1 ? '' : 's'}, ${source.updatedCount} actualizada${source.updatedCount === 1 ? '' : 's'}`;
      lines.push(
        `${emoji} <b>${this.escapeHtml(source.name)}</b> (${source.slug}) — ${details}`,
      );

      if (source.status === 'error') {
        for (const error of source.errors.slice(0, 5)) {
          lines.push(
            `   <i>⚠️ ${this.truncate(this.escapeHtml(error), 120)}</i>`,
          );
        }
        if (source.errors.length > 5) {
          lines.push(
            `   <i>y ${source.errors.length - 5} errores más…</i>`,
          );
        }
      }
    }

    lines.push('');
    const errorWord = report.totalErrors === 1 ? 'error' : 'errores';
    lines.push(
      `<b>Total:</b> ${report.totalNew} nuevas · ${report.totalUpdated} actualizadas · ${report.totalErrors} ${errorWord}`,
    );

    const full = lines.join('\n');
    if (full.length > 4096) {
      const withoutDetails = lines.filter((l) => !l.startsWith('   '));
      return withoutDetails.join('\n').slice(0, 4096);
    }
    return full;
  }

  private formatDuration(durationMs: number | null): string {
    if (durationMs === null) return '—';
    const seconds = Math.round(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}