import { ProgrammingLanguage } from '../../question/domain/question';

export enum ExecutionStatus {
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export type ExecutionLimits = {
  cpuTimeLimitSeconds?: number;
  wallTimeLimitSeconds?: number;
  memoryLimitKb?: number;
  maxProcesses?: number;
  maxFileSizeKb?: number;
};

export type ExecuteCodeRequest = {
  language: ProgrammingLanguage;
  sourceCode: string;
  stdin: string;
  expectedOutput?: string;
  limits?: ExecutionLimits;
};

export type ExecutionResult = {
  status: ExecutionStatus;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  message: string | null;
  executionTimeMs: number | null;
  memoryKb: number | null;
  providerToken: string | null;
};

export class ExecutionProviderError extends Error {}

export const CODE_EXECUTION_PORT = Symbol('CODE_EXECUTION_PORT');

export interface CodeExecutionPort {
  execute(request: ExecuteCodeRequest): Promise<ExecutionResult>;
}
