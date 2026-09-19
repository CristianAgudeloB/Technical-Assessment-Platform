import { Injectable } from '@nestjs/common';
import {
  ExecutionResult,
  ExecutionStatus,
} from '../../execution/domain/code-execution.port';

export type TestCaseEvaluation = {
  status: ExecutionStatus;
  passed: boolean;
};

@Injectable()
export class EvaluateExecutionResultUseCase {
  execute(execution: ExecutionResult, expectedOutput: string): TestCaseEvaluation {
    if (execution.status !== ExecutionStatus.ACCEPTED) {
      return {
        status: execution.status,
        passed: false,
      };
    }

    const passed = normalizeOutput(execution.stdout ?? '') === normalizeOutput(expectedOutput);

    return {
      status: passed ? ExecutionStatus.ACCEPTED : ExecutionStatus.WRONG_ANSWER,
      passed,
    };
  }
}

function normalizeOutput(output: string): string {
  return output.replace(/\r\n/g, '\n').trimEnd();
}
