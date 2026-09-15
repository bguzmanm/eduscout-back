import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TokenPayload {
  sub: string;
  exp: number;
  role?: 'admin' | 'candidate';
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  expiresIn: number;
}

const REQUIRED_PROD_SECRETS = [
  'ADMIN_PASSWORD',
  'ADMIN_TOKEN_SECRET',
  'CANDIDATE_TOKEN_SECRET',
];

@Injectable()
export class AuthService {
  private readonly username: string;
  private readonly passwordHash: Buffer;
  private readonly ttlMs: number;
  private readonly candidateTtlMs: number;
  private readonly adminJwt: JwtService;
  private readonly candidateJwt: JwtService;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'production') {
      const missingSecrets = REQUIRED_PROD_SECRETS.filter(
        (key) => !this.configService.get<string>(key),
      );
      if (missingSecrets.length > 0) {
        throw new Error(
          `Faltan variables de entorno obligatorias en producción: ${missingSecrets.join(', ')}`,
        );
      }
    }

    this.username = this.configService.get<string>(
      'ADMIN_USERNAME',
      'admin',
    );
    const password = this.configService.get<string>(
      'ADMIN_PASSWORD',
      'cambia-esta-password',
    );
    this.passwordHash = createHmac('sha256', password).digest();
    this.ttlMs = Number(
      this.configService.get('ADMIN_TOKEN_TTL_MS', '7200000'),
    );
    this.candidateTtlMs = Number(
      this.configService.get('CANDIDATE_TOKEN_TTL_MS', '604800000'),
    );

    const adminSecret = this.configService.get<string>(
      'ADMIN_TOKEN_SECRET',
      'dev-token-secret-eduscout-cambiar-en-produccion',
    );
    const candidateSecret = this.configService.get<string>(
      'CANDIDATE_TOKEN_SECRET',
      'dev-candidate-secret-eduscout-cambiar-en-produccion',
    );

    this.adminJwt = new JwtService({
      secret: adminSecret,
      signOptions: { expiresIn: Math.floor(this.ttlMs / 1000) },
    });
    this.candidateJwt = new JwtService({
      secret: candidateSecret,
      signOptions: { expiresIn: Math.floor(this.candidateTtlMs / 1000) },
    });
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
    const token = this.adminJwt.sign({ sub: this.username, role: 'admin' });

    return {
      token,
      expiresAt: new Date(now + this.ttlMs).toISOString(),
      expiresIn: this.ttlMs,
    };
  }

  issueCandidateToken(candidateId: number): LoginResult {
    const now = Date.now();
    const token = this.candidateJwt.sign({
      sub: `candidate:${candidateId}`,
      role: 'candidate',
    });

    return {
      token,
      expiresAt: new Date(now + this.candidateTtlMs).toISOString(),
      expiresIn: this.candidateTtlMs,
    };
  }

  verifyToken(token: string): TokenPayload {
    for (const jwt of [this.adminJwt, this.candidateJwt]) {
      try {
        const verified = jwt.verify<TokenPayload>(token);
        return { ...verified, exp: verified.exp * 1000 };
      } catch {
        // Continuar con la siguiente clave
      }
    }
    throw new UnauthorizedException('Token inválido');
  }
}