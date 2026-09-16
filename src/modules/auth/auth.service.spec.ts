import { describe, expect, it } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

function makeConfig(overrides: Record<string, string> = {}) {
  return new ConfigService({
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'clave-segura',
    ADMIN_TOKEN_SECRET: 'secreto-admin',
    ADMIN_TOKEN_TTL_MS: '7200000',
    CANDIDATE_TOKEN_SECRET: 'secreto-candidato',
    CANDIDATE_TOKEN_TTL_MS: '604800000',
    ...overrides,
  });
}

describe('AuthService', () => {
  it('inicia sesión con credenciales correctas y devuelve un token admin', () => {
    const service = new AuthService(makeConfig());
    const result = service.login('admin', 'clave-segura');

    expect(result.token).toBeTruthy();
    expect(result.expiresIn).toBe(7200000);
    const payload = service.verifyAdminToken(result.token);
    expect(payload.sub).toBe('admin');
    expect(payload.role).toBe('admin');
  });

  it('rechaza credenciales incorrectas', () => {
    const service = new AuthService(makeConfig());
    expect(() => service.login('admin', 'incorrecta')).toThrow();
    expect(() => service.login('otro', 'clave-segura')).toThrow();
  });

  it('emite y verifica tokens de candidato', () => {
    const service = new AuthService(makeConfig());
    const result = service.issueCandidateToken(42);

    const payload = service.verifyCandidateToken(result.token);
    expect(payload.sub).toBe('candidate:42');
    expect(payload.role).toBe('candidate');
  });

  it('rechaza un token admin verificado con la clave equivocada', () => {
    const service = new AuthService(makeConfig());
    const result = service.login('admin', 'clave-segura');

    const other = new AuthService(
      makeConfig({ ADMIN_TOKEN_SECRET: 'otro-secreto' }),
    );
    expect(() => other.verifyAdminToken(result.token)).toThrow();
  });

  it('rechaza un token de candidato verificado con la clave de admin', () => {
    const service = new AuthService(makeConfig());
    const result = service.issueCandidateToken(42);

    expect(() => service.verifyAdminToken(result.token)).toThrow();
  });

  it('rechaza un token admin verificado como candidato', () => {
    const service = new AuthService(makeConfig());
    const result = service.login('admin', 'clave-segura');

    expect(() => service.verifyCandidateToken(result.token)).toThrow();
  });

  it('rechaza tokens corruptos en ambos métodos', () => {
    const service = new AuthService(makeConfig());
    expect(() => service.verifyAdminToken('codigo.invalido')).toThrow();
    expect(() => service.verifyAdminToken('')).toThrow();
    expect(() => service.verifyCandidateToken('codigo.invalido')).toThrow();
    expect(() => service.verifyCandidateToken('')).toThrow();
  });

  it('lanza en producción si faltan secrets obligatorios', () => {
    expect(
      () => new AuthService(makeConfig({ NODE_ENV: 'production' })),
    ).not.toThrow();
  });

  it('lanza error con la lista de secrets faltantes en producción', () => {
    let thrown: Error | undefined;
    try {
      new AuthService(
        new ConfigService({
          NODE_ENV: 'production',
          ADMIN_USERNAME: 'admin',
          ADMIN_PASSWORD: 'clave',
        }),
      );
    } catch (error) {
      thrown = error as Error;
    }
    expect(thrown).toBeDefined();
    expect(thrown?.message).toContain('Faltan variables de entorno');
    expect(thrown?.message).toContain('CANDIDATE_TOKEN_SECRET');
  });
});