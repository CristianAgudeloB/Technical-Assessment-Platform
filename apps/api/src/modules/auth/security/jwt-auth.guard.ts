import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserRole } from '../domain/user';
import { AuthenticatedUser } from './authenticated-user';
import { USER_REPOSITORY, UserRepository } from '../domain/user.repository';

type JwtPayload = { sub: string; email: string; role: UserRole };
type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice('Bearer '.length)
      : null;

    if (!token) {
      throw new UnauthorizedException('Debes iniciar sesión para continuar.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.userRepository.findById(payload.sub);
      if (!user || user.role !== payload.role) {
        throw new UnauthorizedException('Tu sesión no es válida o expiró.');
      }

      request.user = { id: user.id, email: user.email, role: user.role };
      return true;
    } catch {
      throw new UnauthorizedException('Tu sesión no es válida o expiró.');
    }
  }
}
