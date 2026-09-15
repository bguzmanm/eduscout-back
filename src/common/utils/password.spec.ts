import { describe, expect, it } from 'bun:test';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('verifica una contraseña correctamente hasheada', () => {
    const hashed = hashPassword('mi-secreto');
    expect(hashed).toContain(':');
    expect(verifyPassword('mi-secreto', hashed)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', () => {
    const hashed = hashPassword('correcta');
    expect(verifyPassword('incorrecta', hashed)).toBe(false);
  });

  it('genera un hash con salt distinto para el mismo password', () => {
    const a = hashPassword('repetida');
    const b = hashPassword('repetida');
    expect(a).not.toBe(b);
    expect(verifyPassword('repetida', a)).toBe(true);
    expect(verifyPassword('repetida', b)).toBe(true);
  });

  it('rechaza un hash malformado', () => {
    expect(verifyPassword('cualquiera', 'sin-salt')).toBe(false);
    expect(verifyPassword('cualquiera', '')).toBe(false);
  });
});