import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { DuplicateEntityError } from '../../../shared/domain/errors/domain-errors';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { CreateCandidateUserData, PublicUser, User, UserRole } from '../domain/user';
import { UserRepository } from '../domain/user.repository';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCandidate(data: CreateCandidateUserData): Promise<User> {
    try {
      const user = await this.prisma.user.create({
        data: { ...data, role: UserRole.CANDIDATE },
      });
      return this.toDomain(user);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateEntityError('User', 'email');
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findCandidates(): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      where: { role: UserRole.CANDIDATE },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, displayName: true, role: true },
    });

    return users.map((user) => ({ ...user, role: user.role as UserRole }));
  }

  private toDomain(user: Prisma.UserModel): User {
    return { ...user, role: user.role as UserRole };
  }
}
