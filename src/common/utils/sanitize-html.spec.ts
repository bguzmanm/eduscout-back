import { describe, expect, it } from 'bun:test';
import { stripHtml } from './sanitize-html';

describe('stripHtml', () => {
  it('elimina etiquetas HTML simples', () => {
    expect(stripHtml('<p>Hola</p>')).toBe('Hola');
  });

  it('elimina etiquetas con atributos', () => {
    expect(stripHtml('<a href="https://x.cl">Enlace</a>')).toBe('Enlace');
  });

  it('deja texto plano intacto', () => {
    expect(stripHtml('Solo texto, sin HTML')).toBe('Solo texto, sin HTML');
  });

  it('maneja cadenas vacías', () => {
    expect(stripHtml('')).toBe('');
  });

  it('maneja múltiples etiquetas consecutivas', () => {
    expect(stripHtml('<div><span>a</span><span>b</span></div>')).toBe('ab');
  });
});