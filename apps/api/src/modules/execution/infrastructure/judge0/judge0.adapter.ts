import { Inject, Injectable } from '@nestjs/common';
import {
  CodeExecutionPort,
  ExecutionLimits,
  ExecutionResult,
  ExecutionStatus,
  ExecutionProviderError,
  ExecuteCodeRequest,
} from '../../domain/code-execution.port';
import { ProgrammingLanguage } from '../../../question/domain/question';

type Judge0Submission = {
  token?: string;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | number | null;
  memory?: number | null;
  status?: {
    id?: number;
    description?: string;
  };
  error?: string;
};

export type Judge0AdapterOptions = {
  baseUrl: string;
  authToken?: string;
  requestTimeoutMs: number;
  totalExecutionTimeoutMs: number;
  pollIntervalMs: number;
  maxPollingAttempts: number;
  languageIds: Record<ProgrammingLanguage, number>;
  defaultLimits: Required<ExecutionLimits>;
};

export const JUDGE0_ADAPTER_OPTIONS = Symbol('JUDGE0_ADAPTER_OPTIONS');

const DEFAULT_LIMITS: Required<ExecutionLimits> = {
  cpuTimeLimitSeconds: 2,
  wallTimeLimitSeconds: 5,
  memoryLimitKb: 128_000,
  maxProcesses: 32,
  maxFileSizeKb: 1_024,
};

const PENDING_STATUS_IDS = new Set([1, 2]);
const RUNTIME_ERROR_STATUS_IDS = new Set([7, 8, 9, 10, 11, 12, 14]);
const MAX_PROVIDER_OUTPUT_CHARS = 16_000;
const MAX_PROVIDER_MESSAGE_CHARS = 2_000;

export function createJudge0AdapterOptions(
  environment: NodeJS.ProcessEnv,
): Judge0AdapterOptions {
  const baseUrl = (environment.JUDGE0_BASE_URL ?? 'https://ce.judge0.com').replace(/\/$/, '');

  return {
    baseUrl,
    authToken: environment.JUDGE0_AUTH_TOKEN || undefined,
    requestTimeoutMs: getPositiveInteger(environment.JUDGE0_REQUEST_TIMEOUT_MS, 8_000),
    totalExecutionTimeoutMs: getPositiveInteger(environment.JUDGE0_TOTAL_TIMEOUT_MS, 20_000),
    pollIntervalMs: getPositiveInteger(environment.JUDGE0_POLL_INTERVAL_MS, 250),
    maxPollingAttempts: getPositiveInteger(environment.JUDGE0_MAX_POLLING_ATTEMPTS, 60),
    languageIds: {
      [ProgrammingLanguage.JAVA]: getPositiveInteger(environment.JUDGE0_LANGUAGE_ID_JAVA, 62),
      [ProgrammingLanguage.JAVASCRIPT]: getPositiveInteger(
        environment.JUDGE0_LANGUAGE_ID_JAVASCRIPT,
        63,
      ),
      [ProgrammingLanguage.PYTHON]: getPositiveInteger(environment.JUDGE0_LANGUAGE_ID_PYTHON, 71),
      [ProgrammingLanguage.TYPESCRIPT]: getPositiveInteger(
        environment.JUDGE0_LANGUAGE_ID_TYPESCRIPT,
        74,
      ),
      [ProgrammingLanguage.COBOL]: getPositiveInteger(environment.JUDGE0_LANGUAGE_ID_COBOL, 77),
    },
    defaultLimits: {
      cpuTimeLimitSeconds: getPositiveNumber(
        environment.JUDGE0_CPU_TIME_LIMIT_SECONDS,
        DEFAULT_LIMITS.cpuTimeLimitSeconds,
      ),
      wallTimeLimitSeconds: getPositiveNumber(
        environment.JUDGE0_WALL_TIME_LIMIT_SECONDS,
        DEFAULT_LIMITS.wallTimeLimitSeconds,
      ),
      memoryLimitKb: getPositiveInteger(
        environment.JUDGE0_MEMORY_LIMIT_KB,
        DEFAULT_LIMITS.memoryLimitKb,
      ),
      maxProcesses: getPositiveInteger(
        environment.JUDGE0_MAX_PROCESSES,
        DEFAULT_LIMITS.maxProcesses,
      ),
      maxFileSizeKb: getPositiveInteger(
        environment.JUDGE0_MAX_FILE_SIZE_KB,
        DEFAULT_LIMITS.maxFileSizeKb,
      ),
    },
  };
}

@Injectable()
export class Judge0Adapter implements CodeExecutionPort {
  constructor(
    @Inject(JUDGE0_ADAPTER_OPTIONS)
    private readonly options: Judge0AdapterOptions,
  ) {}

  async execute(request: ExecuteCodeRequest): Promise<ExecutionResult> {
    const submission = await this.createSubmission(request);

    if (!submission.token) {
      throw new ExecutionProviderError(
        `Judge0 did not return a submission token${submission.error ? `: ${submission.error}` : '.'}`,
      );
    }

    return this.waitForCompletion(submission.token);
  }

  private async createSubmission(request: ExecuteCodeRequest): Promise<Judge0Submission> {
    const limits = { ...this.options.defaultLimits, ...request.limits };
    const languageId = this.options.languageIds[request.language];

    if (!languageId) {
      throw new ExecutionProviderError(`No Judge0 language id is configured for ${request.language}.`);
    }

    return this.request<Judge0Submission>('/submissions?base64_encoded=false&wait=false', {
      method: 'POST',
      body: JSON.stringify({
        source_code: request.sourceCode,
        language_id: languageId,
        stdin: request.stdin,
        ...(request.expectedOutput === undefined
          ? {}
          : { expected_output: request.expectedOutput }),
        cpu_time_limit: limits.cpuTimeLimitSeconds,
        wall_time_limit: limits.wallTimeLimitSeconds,
        memory_limit: limits.memoryLimitKb,
        max_processes_and_or_threads: limits.maxProcesses,
        max_file_size: limits.maxFileSizeKb,
        enable_network: false,
      }),
    });
  }

  private async waitForCompletion(token: string): Promise<ExecutionResult> {
    const deadline = Date.now() + this.options.totalExecutionTimeoutMs;

    for (let attempt = 0; attempt < this.options.maxPollingAttempts; attempt += 1) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        break;
      }

      const submission = await this.request<Judge0Submission>(
        `/submissions/${encodeURIComponent(token)}?base64_encoded=false`,
        {},
        Math.min(this.options.requestTimeoutMs, remainingMs),
      );

      if (!PENDING_STATUS_IDS.has(submission.status?.id ?? 0)) {
        return this.normalize(submission, token);
      }

      await delay(Math.min(this.options.pollIntervalMs, Math.max(0, deadline - Date.now())));
    }

    throw new ExecutionProviderError(
      `Judge0 did not finish submission "${token}" within ${this.options.totalExecutionTimeoutMs} ms.`,
    );
  }

  private normalize(submission: Judge0Submission, token: string): ExecutionResult {
    return {
      status: normalizeStatus(submission.status?.id, submission.status?.description),
      stdout: truncateProviderText(submission.stdout, MAX_PROVIDER_OUTPUT_CHARS),
      stderr: truncateProviderText(submission.stderr, MAX_PROVIDER_OUTPUT_CHARS),
      compileOutput: truncateProviderText(submission.compile_output, MAX_PROVIDER_OUTPUT_CHARS),
      message: truncateProviderText(submission.message, MAX_PROVIDER_MESSAGE_CHARS),
      executionTimeMs: toMilliseconds(submission.time),
      memoryKb: submission.memory ?? null,
      providerToken: token,
    };
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    timeoutMs = this.options.requestTimeoutMs,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.options.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(this.options.authToken ? { 'X-Auth-Token': this.options.authToken } : {}),
          ...init.headers,
        },
      });
      const body = (await response.json().catch(() => null)) as T | { error?: string } | null;

      if (!response.ok) {
        const providerMessage =
          body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error
            : response.statusText;
        throw new ExecutionProviderError(`Judge0 request failed (${response.status}): ${providerMessage}`);
      }

      return body as T;
    } catch (error: unknown) {
      if (error instanceof ExecutionProviderError) {
        throw error;
      }

      const message = error instanceof Error && error.name === 'AbortError'
        ? `Judge0 request timed out after ${timeoutMs} ms.`
        : error instanceof Error
          ? error.message
          : 'Unknown network error.';
      throw new ExecutionProviderError(`Judge0 request failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeStatus(statusId?: number, description?: string): ExecutionStatus {
  if (description?.toLowerCase().includes('memory limit exceeded')) {
    return ExecutionStatus.MEMORY_LIMIT_EXCEEDED;
  }

  switch (statusId) {
    case 3:
      return ExecutionStatus.ACCEPTED;
    case 4:
      return ExecutionStatus.WRONG_ANSWER;
    case 5:
      return ExecutionStatus.TIME_LIMIT_EXCEEDED;
    case 6:
      return ExecutionStatus.COMPILATION_ERROR;
    default:
      return RUNTIME_ERROR_STATUS_IDS.has(statusId ?? 0)
        ? ExecutionStatus.RUNTIME_ERROR
        : ExecutionStatus.INTERNAL_ERROR;
  }
}

function toMilliseconds(time: string | number | null | undefined): number | null {
  if (time === null || time === undefined) {
    return null;
  }

  const seconds = typeof time === 'number' ? time : Number.parseFloat(time);
  return Number.isFinite(seconds) ? Math.round(seconds * 1_000) : null;
}

function truncateProviderText(value: string | null | undefined, limit: number): string | null {
  if (!value) {
    return value ?? null;
  }

  return value.length <= limit ? value : `${value.slice(0, limit)}\n[output truncated]`;
}

function getPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
