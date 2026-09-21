import { CreateCandidateUserData, PublicUser, User } from './user';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  createCandidate(data: CreateCandidateUserData): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findCandidates(): Promise<PublicUser[]>;
}
