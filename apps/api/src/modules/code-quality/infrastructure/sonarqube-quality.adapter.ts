import { Injectable } from '@nestjs/common';
import {
  AnalyzeCodeQualityRequest,
  CodeQualityAnalysis,
  CodeQualityIssue,
  CodeQualityPort,
} from '../domain/code-quality.port';

type QualityWorkerResponse = CodeQualityAnalysis & { error?: string };

@Injectable()
export class SonarQubeQualityAdapter implements CodeQualityPort {
  async analyze(request: AnalyzeCodeQualityRequest): Promise<CodeQualityAnalysis> {
    if (process.env.SONARQUBE_ENABLED !== 'true') {
      return {
        status: 'SKIPPED',
        qualityGateStatus: null,
        issues: [],
        totalIssues: 0,
        bugs: 0,
        codeSmells: 0,
        vulnerabilities: 0,
        message: 'El análisis de calidad está desactivado.',
      };
    }

    const baseUrl = process.env.QUALITY_WORKER_URL;
    const token = process.env.QUALITY_WORKER_TOKEN;
    if (!baseUrl || !token) {
      throw new Error('La integración de análisis de calidad no está configurada.');
    }

    const timeoutMs = positiveInteger(process.env.QUALITY_ANALYSIS_TIMEOUT_MS, 45_000);
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/analysis`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-quality-worker-token': token,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(payload.error ?? 'No fue posible completar el análisis de calidad.');
    }

    return normalizeAnalysis(payload);
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function readJson(response: Response): Promise<Partial<QualityWorkerResponse>> {
  try {
    return await response.json() as Partial<QualityWorkerResponse>;
  } catch {
    return {};
  }
}

function normalizeAnalysis(payload: Partial<QualityWorkerResponse>): CodeQualityAnalysis {
  const issues = Array.isArray(payload.issues)
    ? payload.issues.filter(isQualityIssue).slice(0, 100)
    : [];
  const count = (type: CodeQualityIssue['type']) => issues.filter((issue) => issue.type === type).length;

  return {
    status: payload.status === 'SKIPPED' ? 'SKIPPED' : 'COMPLETED',
    qualityGateStatus: typeof payload.qualityGateStatus === 'string' ? payload.qualityGateStatus : null,
    issues,
    totalIssues: nonNegativeInteger(payload.totalIssues, issues.length),
    bugs: nonNegativeInteger(payload.bugs, count('BUG')),
    codeSmells: nonNegativeInteger(payload.codeSmells, count('CODE_SMELL')),
    vulnerabilities: nonNegativeInteger(payload.vulnerabilities, count('VULNERABILITY')),
    message: typeof payload.message === 'string' ? payload.message : null,
  };
}

function isQualityIssue(value: unknown): value is CodeQualityIssue {
  if (!value || typeof value !== 'object') return false;
  const issue = value as Partial<CodeQualityIssue>;
  return (issue.type === 'BUG' || issue.type === 'CODE_SMELL' || issue.type === 'VULNERABILITY')
    && typeof issue.severity === 'string'
    && typeof issue.message === 'string'
    && typeof issue.rule === 'string'
    && (typeof issue.line === 'number' || issue.line === null);
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}
