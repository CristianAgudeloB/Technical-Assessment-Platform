import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PASSWORD_HASHER, PasswordHasher } from '../domain/password-hasher';
import { PublicUser, User, UserRole } from '../domain/user';
import { USER_REPOSITORY, UserRepository } from '../domain/user.repository';

export type RegisterUserInput = {
  displayName: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
  ) {}

  async registerCandidate(input: RegisterUserInput): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.userRepository.createCandidate({
      email,
      displayName: input.displayName.trim(),
      passwordHash,
    });

    return this.createAuthResponse(user);
  }

  async login(emailInput: string, password: string): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(emailInput.trim().toLowerCase());
    const validPassword = user && await this.passwordHasher.compare(password, user.passwordHash);

    if (!user || !validPassword) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    return this.createAuthResponse(user);
  }

  async getPublicUser(id: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UnauthorizedException('La sesión ya no es válida.');
    }

    return this.toPublicUser(user);
  }

  private async createAuthResponse(user: User): Promise<AuthResponse> {
    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as UserRole,
    };
  }
}
