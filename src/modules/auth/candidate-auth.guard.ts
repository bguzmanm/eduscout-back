import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

export interface AuthenticatedRequest extends Request {
  candidateId: number;
}

export function getCandidateId(request: Request): number {
  return (request as AuthenticatedRequest).candidateId;
}

@Injectable()
export class CandidateAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['authorization'] as string | undefined;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Se requiere autenticación');
    }

    const payload = this.authService.verifyToken(
      header.slice('Bearer '.length),
    );
    if (payload.role !== 'candidate') {
      throw new UnauthorizedException('Se requiere autenticación de postulante');
    }

    const candidateId = Number(payload.sub.replace('candidate:', ''));
    if (!Number.isInteger(candidateId) || candidateId <= 0) {
      throw new UnauthorizedException('Token inválido');
    }

    (request as AuthenticatedRequest).candidateId = candidateId;
    return true;
  }
}