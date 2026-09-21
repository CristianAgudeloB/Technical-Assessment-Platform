export enum UserRole {
  ADMIN = 'ADMIN',
  CANDIDATE = 'CANDIDATE',
}

export type User = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = Omit<User, 'passwordHash' | 'createdAt' | 'updatedAt'>;

export type CreateCandidateUserData = Pick<User, 'email' | 'displayName' | 'passwordHash'>;
