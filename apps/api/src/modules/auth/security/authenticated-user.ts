import { UserRole } from '../domain/user';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};
