import { Injectable, PipeTransform } from '@nestjs/common';
import { stripHtml } from '../utils/sanitize-html';

@Injectable()
export class SanitizeHtmlPipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (typeof value === 'string') {
      return stripHtml(value);
    }
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item));
    }
    if (value !== null && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>,
      )) {
        sanitized[key] = this.transform(val);
      }
      return sanitized;
    }
    return value;
  }
}
