import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ScrapingService } from './scraping.service';
import { TelegramService } from './telegram.service';
import { JobsRepository } from '../jobs/repositories/jobs.repository';
import { SourcesService } from '../sources/services/sources.service';

interface TelegramUpdate {
  update_id: number;
  message?: { chat: { id: number }; text?: string };
  edited_message?: { chat: { id: number }; text?: string };
}

@Injectable()
export class TelegramBotService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('TelegramBotService');
  private readonly botToken?: string;
  private readonly chatId?: string;
  private lastUpdateId = 0;
  private stopped = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly scrapingService: ScrapingService,
    private readonly sourcesService: SourcesService,
    private readonly jobsRepository: JobsRepository,
    private readonly telegramService: TelegramService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
  }

  onModuleInit() {
    if (!this.botToken || !this.chatId) {
      this.logger.warn(
        'Bot de Telegram no iniciado: faltan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID',
      );
      return;
    }
    void this.run();
  }

  onApplicationShutdown() {
    this.stopped = true;
  }

  private async run() {
    this.logger.log('Iniciando polling de comandos de Telegram...');
    let delay = 1000;

    while (!this.stopped) {
      try {
        const { data } = await axios.get<{ result: TelegramUpdate[] }>(
          `https://api.telegram.org/bot${this.botToken}/getUpdates`,
          {
            params: {
              timeout: 50,
              offset: this.lastUpdateId + 1,
              allowed_updates: JSON.stringify(['message', 'edited_message']),
            },
            timeout: 60000,
          },
        );
        delay = 1000;

        for (const update of data.result ?? []) {
          this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
          await this.handleUpdate(update);
        }
      } catch (error) {
        this.logger.error(
          `Error en polling de Telegram: ${(error as Error).message}`,
        );
        await this.sleep(delay);
        delay = Math.min(delay * 2, 30000);
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate) {
    const message = update.message ?? update.edited_message;
    if (!message?.text) return;

    if (message.chat.id !== Number(this.chatId)) {
      this.logger.warn(
        `Mensaje ignorado de chat no autorizado: ${message.chat.id}`,
      );
      return;
    }

    const text = message.text.trim();
    const [rawCommand, ...args] = text.split(/\s+/);
    const command = rawCommand.toLowerCase();

    try {
      switch (command) {
        case '/help':
          await this.telegramService.sendMessage(this.helpText());
          break;
        case '/status':
          await this.sendStatus();
          break;
        case '/list':
          await this.sendList();
          break;
        case '/stats':
          await this.sendStats();
          break;
        case '/scrape':
        case '/run':
          await this.runScrape(args[0]);
          break;
        default:
          await this.telegramService.sendMessage(
            '⚠️ Comando no reconocido. Envía <b>/help</b> para ver los comandos disponibles.',
          );
      }
    } catch (error) {
      this.logger.error(
        `Error al procesar comando ${command}: ${(error as Error).message}`,
      );
      await this.telegramService.sendMessage(
        '❌ Error al procesar el comando. Inténtalo de nuevo.',
      );
    }
  }

  private async runScrape(slug?: string) {
    let scopeText = 'todas las fuentes activas';

    if (slug) {
      try {
        const source = await this.sourcesService.findBySlug(slug);
        scopeText = `la fuente <b>${this.escapeHtml(source.name)}</b>`;
      } catch {
        await this.telegramService.sendMessage(
          `❌ Fuente "<b>${this.escapeHtml(slug)}</b>" no encontrada. Usa /list para ver las fuentes disponibles.`,
        );
        return;
      }
    }

    await this.telegramService.sendMessage(
      `🔄 Ejecutando scraping de ${scopeText}… Te aviso cuando termine.`,
    );

    void this.scrapingService.runScraping(slug).catch((error) => {
      this.logger.error(
        `Error al ejecutar scraping desde Telegram: ${(error as Error).message}`,
      );
    });
  }

  private async sendStatus() {
    const report = await this.scrapingService.getLatestReport();

    if (!report) {
      await this.telegramService.sendMessage(
        '📭 Todavía no hay informes de scraping. Envía <b>/scrape</b> para ejecutar el primero.',
      );
      return;
    }

    const reportData = {
      id: report.id,
      status: report.status as 'completed' | 'failed',
      startedAt: report.startedAt.toISOString(),
      durationMs: report.durationMs,
      totalNew: report.totalNew,
      totalUpdated: report.totalUpdated,
      totalErrors: report.totalErrors,
      perSource: report.perSource ?? [],
    };
    await this.telegramService.sendMessage(
      this.telegramService.formatStatus(reportData),
    );
  }

  private async sendList() {
    const sources = await this.sourcesService.findAll();
    const activeCount = sources.filter((s) => s.isActive).length;

    const lines: string[] = ['📚 <b>EduScout — Fuentes</b>', ''];
    for (const source of sources) {
      const emoji = source.isActive ? '🟢' : '⚪';
      lines.push(
        `${emoji} <b>${this.escapeHtml(source.name)}</b> (<code>${source.slug}</code>) — ${source.jobCount} ofertas activas`,
      );
    }
    lines.push(
      '',
      `Total: ${sources.length} fuentes (${activeCount} activas).`,
    );

    await this.telegramService.sendMessage(lines.join('\n'));
  }

  private async sendStats() {
    const stats = await this.jobsRepository.getStats();

    const lines: string[] = ['📈 <b>EduScout — Estadísticas</b>', ''];
    lines.push(`🧾 <b>${stats.totalActive}</b> ofertas activas`, '');

    const bySource = [...stats.bySource].sort((a, b) => b.count - a.count);
    lines.push('<b>Por fuente (top 10):</b>');
    for (const { source, count } of bySource.slice(0, 10)) {
      lines.push(`  <code>${source}</code>: <b>${count}</b>`);
    }

    const byRegion = [...stats.byRegion].sort((a, b) => b.count - a.count);
    if (byRegion.length > 0) {
      lines.push('', '<b>Por región (top 5):</b>');
      for (const { region, count } of byRegion.slice(0, 5)) {
        lines.push(`  ${this.escapeHtml(region)}: <b>${count}</b>`);
      }
    }

    await this.telegramService.sendMessage(lines.join('\n'));
  }

  private helpText(): string {
    return [
      '🤖 <b>EduScout — Comandos</b>',
      '',
      '/scrape — ejecuta el scraping de todas las fuentes activas',
      '/scrape &lt;slug&gt; — ejecuta el scraping de una sola fuente (ej: /scrape uchile)',
      '/status — último informe de scraping',
      '/list — lista de fuentes disponibles',
      '/stats — estadísticas de ofertas activas',
      '/help — esta ayuda',
    ].join('\n');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}