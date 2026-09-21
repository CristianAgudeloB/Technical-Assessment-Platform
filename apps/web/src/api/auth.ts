import type { PublicUser, UserRole } from '@kata/shared-types';
import { getJson, postJson } from './http';

export type { UserRole };
export type CurrentUser = PublicUser;

type AuthResponse = {
  accessToken: string;
  user: CurrentUser;
};

export function login(email: string, password: string) {
  return postJson<AuthResponse>('/auth/login', { email, password });
}

export function register(displayName: string, email: string, password: string) {
  return postJson<AuthResponse>('/auth/register', { displayName, email, password });
}

export function getCurrentUser() {
  return getJson<CurrentUser>('/auth/me');
}
