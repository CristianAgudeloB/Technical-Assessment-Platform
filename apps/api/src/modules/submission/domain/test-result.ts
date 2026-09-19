import { ExecutionStatus } from '../../execution/domain/code-execution.port';

export type TestResult = {
  id: string;
  submissionId: string;
  testCaseId: string;
  status: ExecutionStatus;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  executionTimeMs: number | null;
  memoryKb: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SaveTestResultData = Omit<TestResult, 'id' | 'createdAt' | 'updatedAt'>;
