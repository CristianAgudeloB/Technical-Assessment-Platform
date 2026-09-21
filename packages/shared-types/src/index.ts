export type ApiHealthResponse = {
  status: 'ok';
};

export type UserRole = 'ADMIN' | 'CANDIDATE';

export type ProgrammingLanguage = 'JAVA' | 'JAVASCRIPT' | 'PYTHON' | 'TYPESCRIPT' | 'COBOL';

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
};
