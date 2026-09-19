import { SaveTestResultData, TestResult } from './test-result';

export const TEST_RESULT_REPOSITORY = Symbol('TEST_RESULT_REPOSITORY');

export interface TestResultRepository {
  upsert(data: SaveTestResultData): Promise<TestResult>;
  findBySubmissionId(submissionId: string): Promise<TestResult[]>;
}
