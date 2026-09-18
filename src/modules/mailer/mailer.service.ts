import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT', '587')),
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER', ''),
          pass: this.configService.get<string>('SMTP_PASS', ''),
        },
      });
      this.logger.log('SMTP configurado para el envío de correos');
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP no configurado: los correos se loguearán en consola en vez de enviarse',
      );
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendMail(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      const plainText =
        message.text ??
        message.html
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      this.logger.log(
        `[DEV] Correo para ${message.to}: "${message.subject}"\n${plainText}`,
      );
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>(
          'SMTP_FROM',
          'EduScout <no-reply@eduscout.cl>',
        ),
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo a ${message.to}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}