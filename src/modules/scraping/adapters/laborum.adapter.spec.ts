import { describe, expect, it } from 'bun:test';
import {
  extractEmpresaId,
  formatLaborumDescription,
} from './laborum.adapter';

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

describe('formatLaborumDescription', () => {
  it('devuelve null cuando no hay detalle', () => {
    expect(formatLaborumDescription(null)).toBeNull();
    expect(formatLaborumDescription(undefined)).toBeNull();
    expect(formatLaborumDescription('   ')).toBeNull();
  });

  it('reconstruye párrafos y resalta títulos de sección pegados tras un punto', () => {
    const input =
      'Buscamos un/a docente para impartir cátedras en la sede.Especialidad.Requisitos: Título profesional de la especialidad. Experiencia docencia de al menos 1 año.';
    const output = formatLaborumDescription(input);
    expect(output).toContain('<strong>Requisitos:</strong>');
    expect(output?.match(/<p>/g)).toHaveLength(3);
  });

  it('respeta los saltos de párrafo originales colapsados a doble espacio', () => {
    const input =
      'Jornada parcial.  Al menos 2 años de experiencia.  Al menos 3 años en docencia.';
    const output = formatLaborumDescription(input);
    expect(output?.match(/<p>/g)).toHaveLength(3);
  });

  it('no marca como título frases que comienzan con la misma palabra tras un salto', () => {
    const input =
      'Requisitos: Experiencia en la especialidad.  Experiencia en uso de plataformas LMS.';
    const output = formatLaborumDescription(input);
    expect(output).toContain('<strong>Requisitos:</strong>');
    expect(output?.match(/<p>/g)).toHaveLength(2);
  });

  it('separar ítems numerados que quedaron pegados al texto anterior', () => {
    const input =
      'Modalidad presencial.2. Competencias: Planificación y organización.3. Características de la oferta: Lugar de desempeño: Santiago.';
    const output = formatLaborumDescription(input);
    expect(output).toContain('<p>2. Competencias:');
    expect(output).toContain('<p>3. Características de la oferta:');
  });

  it('maneja una descripción realista de Laborum', () => {
    const input =
      'IACC busca Docente de Logística responsable de desarrollar el proceso de enseñanza.Requisitos: Conocimientos: Nivel Experto. Educación: Ingeniería Industrial.Experiencia:  Al menos 2 años de docencia online.';
    const output = formatLaborumDescription(input);
    expect(output).toContain(
      '<strong>Requisitos:</strong> Conocimientos: Nivel Experto',
    );
    expect(output).toContain('<strong>Educación:</strong> Ingeniería Industrial.');
    expect(output).toContain('<strong>Experiencia:</strong>');
    expect(output).toContain('<p>Al menos 2 años de docencia online.</p>');
    expect(output).not.toBeNull();
  });
});