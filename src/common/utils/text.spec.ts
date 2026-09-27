import { describe, expect, it } from 'bun:test';
import { normalizeRichText, normalizeText } from './text';

const NBSP = '\u00a0';
const THIN = '\u2009';

describe('normalizeText', () => {
  it('convierte los espacios no divisibles del scrapeo', () => {
    expect(
      normalizeText(`Académico(a)${NBSP}Investigador(a)${NBSP}Facultad`),
    ).toBe('Académico(a) Investigador(a) Facultad');
    expect(normalizeText(`Jornada${THIN}Completa`)).toBe('Jornada Completa');
  });

  it('colapsa espacios repetidos y recorta', () => {
    expect(normalizeText('  Jornada   Completa  ')).toBe('Jornada Completa');
    expect(normalizeText('Jornada\t\nCompleta')).toBe('Jornada Completa');
  });

  it('deja null lo que viene vacío o ausente', () => {
    expect(normalizeText(null)).toBeNull();
    expect(normalizeText(undefined)).toBeNull();
    expect(normalizeText('   ')).toBeNull();
  });

  it('no deja ninguna secuencia indestructible', () => {
    const normalized = normalizeText(`Docente${NBSP}de${NBSP}soporte${NBSP}UDS`)!;
    expect(normalized).toBe('Docente de soporte UDS');
    expect(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/.test(normalized)).toBe(
      false,
    );
  });
});

describe('normalizeRichText', () => {
  it('limpia el HTML sin perder las etiquetas ni los párrafos', () => {
    const html =
      '<p>En <strong>Universidad</strong> estamos en búsqueda</p>\n<p>Requisitos:</p>';
    expect(normalizeRichText(html)).toBe(
      '<p>En <strong>Universidad</strong> estamos en búsqueda</p>\n<p>Requisitos:</p>',
    );
  });

  it('convierte &nbsp; y los espacios horizontales repetidos', () => {
    expect(normalizeRichText('<p>Grado de&nbsp;Doctor (deseable)</p>')).toBe(
      '<p>Grado de Doctor (deseable)</p>',
    );
    expect(normalizeRichText('<p>uno    dos</p>')).toBe('<p>uno dos</p>');
    expect(normalizeRichText(`<p>uno${NBSP}${NBSP}dos</p>`)).toBe(
      '<p>uno dos</p>',
    );
  });

  it('respeta los saltos de línea y colapsa los párrafos vacíos', () => {
    expect(normalizeRichText('uno\n\n\n\ndos')).toBe('uno\n\ndos');
  });

  it('devuelve undefined si no viene contenido', () => {
    expect(normalizeRichText(null)).toBeUndefined();
    expect(normalizeRichText(undefined)).toBeUndefined();
    expect(normalizeRichText('   ')).toBeUndefined();
  });
});
