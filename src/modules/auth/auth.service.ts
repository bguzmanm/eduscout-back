import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

interface TokenPayload {
  sub: string;
  exp: number;
  role?: 'admin' | 'candidate';
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly username: string;
  private readonly passwordHash: Buffer;
  private readonly secret: string;
  private readonly ttlMs: number;
  private readonly candidateSecret: string;
  private readonly candidateTtlMs: number;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>(
      'ADMIN_USERNAME',
      'admin',
    );
    const password = this.configService.get<string>(
      'ADMIN_PASSWORD',
      'cambia-esta-password',
    );
    this.passwordHash = createHmac('sha256', password).digest();
    this.secret = this.configService.get<string>(
      'ADMIN_TOKEN_SECRET',
      'dev-token-secret-eduscout-cambiar-en-produccion',
    );
    this.ttlMs = Number(
      this.configService.get('ADMIN_TOKEN_TTL_MS', '7200000'),
    );
    this.candidateSecret = this.configService.get<string>(
      'CANDIDATE_TOKEN_SECRET',
      'dev-candidate-secret-eduscout-cambiar-en-produccion',
    );
    this.candidateTtlMs = Number(
      this.configService.get('CANDIDATE_TOKEN_TTL_MS', '604800000'),
    );
  }

  login(username: string, password: string): LoginResult {
    const usernameMatches = timingSafeEqual(
      createHmac('sha256', username).digest(),
      createHmac('sha256', this.username).digest(),
    );
    const passwordMatches = timingSafeEqual(
      createHmac('sha256', password).digest(),
      this.passwordHash,
    );

    if (!usernameMatches || !passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const now = Date.now();
    const payload: TokenPayload = {
      sub: this.username,
      exp: now + this.ttlMs,
      role: 'admin',
    };

    return this.buildLoginResult(payload, this.secret);
  }

  issueCandidateToken(candidateId: number): LoginResult {
    const now = Date.now();
    const payload: TokenPayload = {
      sub: `candidate:${candidateId}`,
      exp: now + this.candidateTtlMs,
      role: 'candidate',
    };

    return this.buildLoginResult(payload, this.candidateSecret);
  }

  verifyToken(token: string): TokenPayload {
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra !== undefined) {
      throw new UnauthorizedException('Token inválido');
    }

    const payload = this.decode(body);
    const expected = this.signature(body, payload.role === 'candidate' ? this.candidateSecret : this.secret);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Token inválido');
    }

    if (payload.exp <= Date.now()) {
      throw new UnauthorizedException('La sesión ha expirado');
    }

    return payload;
  }

  private buildLoginResult(
    payload: TokenPayload,
    secret: string,
  ): LoginResult {
    const body = this.encode(payload);
    const token = `${body}.${this.signature(body, secret)}`;

    return {
      token,
      expiresAt: new Date(payload.exp).toISOString(),
      expiresIn: payload.exp - Date.now(),
    };
  }

  private sign(payload: TokenPayload, secret: string): string {
    const body = this.encode(payload);
    return `${body}.${this.signature(body, secret)}`;
  }

  private signature(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('base64url');
  }

  private encode(payload: TokenPayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decode(body: string): TokenPayload {
    try {
      const parsed = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
      if (typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number') {
        throw new Error('Payload malformado');
      }
      return parsed;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}