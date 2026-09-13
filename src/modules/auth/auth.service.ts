import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

interface TokenPayload {
  sub: string;
  exp: number;
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
    const payload: TokenPayload = { sub: this.username, exp: now + this.ttlMs };
    const token = this.sign(payload);

    return {
      token,
      expiresAt: new Date(payload.exp).toISOString(),
      expiresIn: this.ttlMs,
    };
  }

  verifyToken(token: string): TokenPayload {
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra !== undefined) {
      throw new UnauthorizedException('Token inválido');
    }

    const expected = this.signature(body);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Token inválido');
    }

    const payload = this.decode(body);
    if (payload.exp <= Date.now()) {
      throw new UnauthorizedException('La sesión ha expirado');
    }

    return payload;
  }

  private sign(payload: TokenPayload): string {
    const body = this.encode(payload);
    return `${body}.${this.signature(body)}`;
  }

  private signature(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
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