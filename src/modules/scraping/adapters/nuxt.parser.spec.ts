import { describe, expect, it } from 'bun:test';
import {
  parseNuxtData,
  extractNuxtOfferCards,
  resolveNuxtValue,
} from './nuxt.parser';

describe('parseNuxtData', () => {
  it('extrae el JSON del script __NUXT_DATA__', () => {
    const html = `<html><head></head><body>
      <script id="__NUXT_DATA__">[1,2,3]</script>
    </body></html>`;
    expect(parseNuxtData(html)).toEqual([1, 2, 3]);
  });

  it('devuelve [] si no hay script __NUXT_DATA__', () => {
    expect(parseNuxtData('<html><body>sin datos</body></html>')).toEqual([]);
  });

  it('devuelve [] si el JSON es inválido', () => {
    const html = `<script id="__NUXT_DATA__">{not-json}</script>`;
    expect(parseNuxtData(html)).toEqual([]);
  });

  it('devuelve [] si el JSON no es un arreglo', () => {
    const html = `<script id="__NUXT_DATA__">{"a":1}</script>`;
    expect(parseNuxtData(html)).toEqual([]);
  });
});

describe('resolveNuxtValue', () => {
  it('resuelve índices válidos', () => {
    expect(resolveNuxtValue(['a', 'b'], 1)).toBe('b');
  });

  it('devuelve undefined para índices fuera de rango', () => {
    expect(resolveNuxtValue(['a'], 5)).toBeUndefined();
    expect(resolveNuxtValue(['a'], -1)).toBeUndefined();
    expect(resolveNuxtValue([], 0)).toBeUndefined();
  });

  it('devuelve undefined para índices no numéricos', () => {
    expect(resolveNuxtValue(['a'], '0')).toBeUndefined();
    expect(resolveNuxtValue(['a'], null)).toBeUndefined();
  });
});

describe('extractNuxtOfferCards', () => {
  const raw = [
    { idOferta: 1, nombreCargo: 2, nombreEmpresa: 3 },
    101,
    'Profesor Asistente en Biología',
    'Universidad de Chile',
  ];

  it('extrae tarjetas resolviendo índices contra el arreglo', () => {
    const cards = extractNuxtOfferCards(raw);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 101,
      title: 'Profesor Asistente en Biología',
      company: 'Universidad de Chile',
    });
  });

  it('soporta ids de oferta como string numérico', () => {
    const rawString = [
      { idOferta: 1, nombreCargo: 2 },
      '42',
      'Concurso Docente',
    ];
    const cards = extractNuxtOfferCards(rawString);
    expect(cards[0]?.id).toBe(42);
    expect(cards[0]?.title).toBe('Concurso Docente');
  });

  it('ignora nodos sin idOferta o nombreCargo', () => {
    expect(extractNuxtOfferCards([{ foo: 1 }])).toEqual([]);
    expect(extractNuxtOfferCards([null, 'str', 42])).toEqual([]);
  });

  it('ignora tarjetas sin id numérico/string válido', () => {
    expect(extractNuxtOfferCards([{ idOferta: 0, nombreCargo: 'x' }])).toEqual(
      [],
    );
    expect(extractNuxtOfferCards([{ idOferta: 1, nombreCargo: 'x' }])).toEqual(
      [],
    );
  });
});