import { describe, expect, it } from 'bun:test';
import { extractEmpresaId } from './laborum.adapter';

describe('extractEmpresaId', () => {
  it('extrae el ID de empresa desde la URL de perfil de Laborum', () => {
    expect(
      extractEmpresaId(
        'https://www.laborum.cl/perfiles/empresa_instituto-profesional-de-chile_12054583.html',
      ),
    ).toBe(12054583);
    expect(
      extractEmpresaId(
        'https://www.laborum.cl/perfiles/empresa_universidad-catolica-silva-henriquez_12000824.html',
      ),
    ).toBe(12000824);
    expect(
      extractEmpresaId(
        'https://www.laborum.cl/perfiles/empresa_instituto-profesional-aiep_13327053.html',
      ),
    ).toBe(13327053);
    expect(
      extractEmpresaId(
        'https://www.laborum.cl/perfiles/empresa_instituto-profesional-iacc_12102077.html',
      ),
    ).toBe(12102077);
  });

  it('devuelve NaN cuando la URL no contiene un ID válido', () => {
    expect(extractEmpresaId('https://www.laborum.cl/empleos/12222.html')).toBeNaN();
    expect(extractEmpresaId('https://www.laborum.cl/')).toBeNaN();
  });
});