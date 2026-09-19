import {
  Judge0Adapter,
  createJudge0AdapterOptions,
} from '../apps/api/src/modules/execution/infrastructure/judge0/judge0.adapter';
import {
  ExecutionStatus,
  type ExecuteCodeRequest,
} from '../apps/api/src/modules/execution/domain/code-execution.port';
import { ProgrammingLanguage } from '../apps/api/src/modules/question/domain/question';

const adapter = new Judge0Adapter(createJudge0AdapterOptions(process.env));

const successfulExecutions: Array<ExecuteCodeRequest & { expectedOutput: string }> = [
  {
    language: ProgrammingLanguage.JAVA,
    sourceCode:
      'public class Main { public static void main(String[] args) { System.out.print("java-ok"); } }',
    stdin: '',
    expectedOutput: 'java-ok',
  },
  {
    language: ProgrammingLanguage.PYTHON,
    sourceCode: 'print("python-ok")',
    stdin: '',
    expectedOutput: 'python-ok',
  },
  {
    language: ProgrammingLanguage.JAVASCRIPT,
    sourceCode: 'process.stdout.write("javascript-ok")',
    stdin: '',
    expectedOutput: 'javascript-ok',
  },
];

async function verifySuccessfulLanguages() {
  for (const testCase of successfulExecutions) {
    const result = await adapter.execute(testCase);

    if (result.status !== ExecutionStatus.ACCEPTED) {
      throw new Error(
        `${testCase.language} did not complete successfully: ${result.status} (${result.message ?? 'no message'})`,
      );
    }

    if (result.stdout?.trim() !== testCase.expectedOutput) {
      throw new Error(
        `${testCase.language} returned unexpected stdout: ${JSON.stringify(result.stdout)}`,
      );
    }

    console.log(`✓ ${testCase.language}: ${result.stdout.trim()}`);
  }
}

async function verifyNormalizedFailures() {
  const cases: Array<{
    name: string;
    request: ExecuteCodeRequest;
    expectedStatus: ExecutionStatus;
  }> = [
    {
      name: 'compilation error',
      request: {
        language: ProgrammingLanguage.JAVA,
        sourceCode: 'public class Main { this will not compile }',
        stdin: '',
      },
      expectedStatus: ExecutionStatus.COMPILATION_ERROR,
    },
    {
      name: 'runtime error',
      request: {
        language: ProgrammingLanguage.PYTHON,
        sourceCode: 'raise RuntimeError("expected test failure")',
        stdin: '',
      },
      expectedStatus: ExecutionStatus.RUNTIME_ERROR,
    },
    {
      name: 'time limit exceeded',
      request: {
        language: ProgrammingLanguage.JAVASCRIPT,
        sourceCode: 'while (true) {}',
        stdin: '',
        limits: { cpuTimeLimitSeconds: 1, wallTimeLimitSeconds: 2 },
      },
      expectedStatus: ExecutionStatus.TIME_LIMIT_EXCEEDED,
    },
  ];

  for (const testCase of cases) {
    const result = await adapter.execute(testCase.request);

    if (result.status !== testCase.expectedStatus) {
      throw new Error(
        `${testCase.name} was normalized as ${result.status}, expected ${testCase.expectedStatus}.`,
      );
    }

    console.log(`✓ ${testCase.name}: ${result.status}`);
  }
}

async function main() {
  await verifySuccessfulLanguages();
  await verifyNormalizedFailures();
  console.log('Judge0 adapter verification passed.');
}

void main();
