import { REGIONS, normalizeRegion } from './regions';

describe('normalizeRegion', () => {
  it('deja intactos los 16 nombres canónicos', () => {
    for (const region of REGIONS) {
      expect(normalizeRegion(region)).toBe(region);
    }
  });

  it('normaliza acentos, mayúsculas y espacios', () => {
    expect(normalizeRegion('  VALPARAISO  ')).toBe('Valparaíso');
    expect(normalizeRegion('biobio')).toBe('Biobío');
    expect(normalizeRegion('Bío Bío')).toBe('Biobío');
    expect(normalizeRegion('la araucania')).toBe('Araucanía');
    expect(normalizeRegion('Los  Lagos')).toBe('Los Lagos');
  });

  it('traduce las variantes que dejaron el número de regiones inflado', () => {
    expect(normalizeRegion('Metropolitana de Santiago')).toBe('Metropolitana');
    expect(normalizeRegion('Región Metropolitana')).toBe('Metropolitana');
    expect(normalizeRegion('RM')).toBe('Metropolitana');
    expect(normalizeRegion('Región del Biobío')).toBe('Biobío');
    expect(normalizeRegion('La Araucanía')).toBe('Araucanía');
    expect(normalizeRegion('Libertador General Bernardo O’Higgins')).toBe(
      "O'Higgins",
    );
    expect(normalizeRegion('Aysén del General Carlos Ibáñez del Campo')).toBe(
      'Aysén',
    );
    expect(normalizeRegion('Magallanes y de la Antártica Chilena')).toBe(
      'Magallanes',
    );
  });

  it('reconoce ciudades cuando la región no viene explícita', () => {
    expect(normalizeRegion('Providencia, Metropolitana, Chile')).toBe(
      'Metropolitana',
    );
    expect(normalizeRegion('Concepción')).toBe('Biobío');
    expect(normalizeRegion('Temuco')).toBe('Araucanía');
    expect(normalizeRegion('Punta Arenas')).toBe('Magallanes');
    expect(normalizeRegion('Copiapó')).toBe('Atacama');
  });

  it('devuelve null cuando no hay una región identificable', () => {
    expect(normalizeRegion(null)).toBeNull();
    expect(normalizeRegion(undefined)).toBeNull();
    expect(normalizeRegion('')).toBeNull();
    expect(normalizeRegion('   ')).toBeNull();
    expect(normalizeRegion('A distancia')).toBeNull();
    expect(normalizeRegion('Teletrabajo')).toBeNull();
    expect(normalizeRegion('Nacional')).toBeNull();
    expect(normalizeRegion('Desconocida')).toBeNull();
    expect(normalizeRegion('Santiago, Desconocida, Chile')).toBe('Metropolitana');
  });

  it('nunca devuelve una región fuera de la lista canónica', () => {
    const inputs = [
      'Region X',
      'Provincia de test',
      'tarapaca',
      'iplacex',
      'Santiago, Chile',
      'Aysén',
      'santiago',
    ];
    for (const input of inputs) {
      const result = normalizeRegion(input);
      expect(result === null || REGIONS.includes(result)).toBe(true);
    }
  });
});
