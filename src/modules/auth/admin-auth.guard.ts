import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['authorization'] as string | undefined;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Se requiere autenticación');
    }

    this.authService.verifyToken(header.slice('Bearer '.length));
    return true;
  }
}